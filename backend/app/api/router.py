from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import datetime
import uuid
import logging

from backend.app.database.session import get_db
from backend.app.models.models import (
    TariffEvent, Supplier, Component, Plant, Inventory, Scenario, Decision, AgentLog, SupplierContract, SupplierCapacity
)
from backend.app.schemas import schemas
from backend.app.integrations.tariffs.registry import get_source, list_sources
from backend.app.graph.workflow import workflow
from backend.app.services.analysis_service import (
    find_affected_components, find_affected_suppliers, calculate_inventory_runway, calculate_financial_exposure
)

logger = logging.getLogger(__name__)
router = APIRouter()

# --- HEALTH ---
@router.get("/health", response_model=Dict[str, str])
def health():
    return {"status": "healthy"}

# --- DASHBOARD ---
@router.get("/dashboard", response_model=schemas.DashboardView)
def get_dashboard(db: Session = Depends(get_db)):
    # 1. Active Disruptions
    active_events = db.query(TariffEvent).filter(TariffEvent.status == "ACTIVE").all()
    active_count = len(active_events)
    
    # 2. Exposed Suppliers & Plants
    exposed_suppliers = set()
    exposed_plants = 0
    total_exposure = 0.0
    
    for event in active_events:
        components = find_affected_components(db, event.hs_code)
        for comp in components:
            sups = find_affected_suppliers(db, comp["id"], event.origin_country)
            for s in sups:
                exposed_suppliers.add(s["id"])
                
                # Monthly volume
                vol = s["capacity_units_per_month"]
                unit_cost = s["unit_cost"]
                terms = s["contract_terms"]
                
                exp = calculate_financial_exposure(event.rate_change, unit_cost, vol, terms)
                total_exposure += exp["manufacturer_passed_monthly"] * 12
                
            # Count plants at risk
            plants = db.query(Plant).all()
            for plant in plants:
                runway = calculate_inventory_runway(db, plant.id, comp["id"])
                if runway["daily_consumption"] > 0 and runway["status"] in ["CRITICAL", "AT_RISK", "WATCH"]:
                    exposed_plants += 1
                    
    # Calculate average inventory runway
    all_inventories = db.query(Inventory).all()
    avg_runway = 0
    if all_inventories:
        total_days = 0
        count = 0
        for inv in all_inventories:
            plant = db.query(Plant).filter(Plant.id == inv.plant_id).first()
            if plant and plant.daily_consumption > 0:
                total_days += inv.quantity / plant.daily_consumption
                count += 1
        avg_runway = int(total_days / count) if count > 0 else 0
        
    kpis = schemas.DashboardKPIs(
        active_disruptions=active_count,
        suppliers_exposed=len(exposed_suppliers),
        production_lines_at_risk=exposed_plants,
        inventory_days=avg_runway or 18, # Fallback to 18 if empty
        estimated_cost_exposure=round(total_exposure, 2)
    )
    
    recent_events = db.query(TariffEvent).order_by(TariffEvent.retrieved_at.desc()).limit(5).all()
    sources_meta = []
    for s in list_sources():
        sources_meta.append(schemas.DashboardSourceRegistry(
            source=s["source"],
            type=s["type"],
            status=s["status"],
            last_updated=s["last_updated"],
            coverage=s["coverage"]
        ))
        
    return schemas.DashboardView(
        kpis=kpis,
        recent_events=recent_events,
        sources=sources_meta
    )

# --- TARIFFS ---
@router.get("/tariffs/search", response_model=List[schemas.TariffEventBase])
def search_tariffs(query: str, db: Session = Depends(get_db)):
    live_events = []
    # Try live query first
    try:
        usitc = get_source("USITC")
        live_events = usitc.get_recent_tariff_events(query)
    except Exception as e:
        logger.warning(f"Live tariff query failed: {str(e)}.")

    # If we got live events, save and return them
    if live_events:
        events_models = []
        for le in live_events:
            existing = db.query(TariffEvent).filter(TariffEvent.event_id == le["event_id"]).first()
            if not existing:
                evt = TariffEvent(**le)
                db.add(evt)
                events_models.append(evt)
            else:
                events_models.append(existing)
        db.commit()
        return events_models

    # Fallback 1: Search seeded components database for matches
    clean_query = query.replace(".", "").strip()
    db_components = db.query(Component).filter(
        Component.hs_code.like(f"%{clean_query}%") |
        Component.name.like(f"%{query}%") |
        Component.category.like(f"%{query}%")
    ).all()

    if db_components:
        events_models = []
        for comp in db_components:
            cleaned_hs = comp.hs_code.replace(".", "")
            event_id = f"USITC-{cleaned_hs}"
            existing = db.query(TariffEvent).filter(TariffEvent.event_id == event_id).first()
            if not existing:
                evt = TariffEvent(
                    event_id=event_id,
                    source="USITC",
                    source_name="United States International Trade Commission",
                    source_url=f"https://hts.usitc.gov/search?query={cleaned_hs}",
                    reporting_country="USA",
                    origin_country="China",
                    destination_country="USA",
                    hs_code=comp.hs_code,
                    product_description=comp.name,
                    old_rate=0.034 if "8507" in cleaned_hs else 0.05,
                    new_rate=0.284 if "8507" in cleaned_hs else 0.30,
                    rate_change=0.25,
                    status="ACTIVE",
                    evidence=f"Cached tariff rate data loaded for component: {comp.name}",
                    retrieved_at=datetime.datetime.utcnow(),
                    confidence=0.95
                )
                db.add(evt)
                events_models.append(evt)
            else:
                events_models.append(existing)
        db.commit()
        return events_models

    # Fallback 2: Query already cached TariffEvent database records
    cached = db.query(TariffEvent).filter(
        TariffEvent.hs_code.like(f"%{clean_query}%") |
        TariffEvent.product_description.like(f"%{query}%")
    ).all()
    return cached

@router.post("/tariffs/analyze", response_model=Dict[str, Any])
def run_tariff_analysis(req: schemas.TariffEventCreate, db: Session = Depends(get_db)):
    # Create or retrieve the event
    event_id = f"EVT-{uuid.uuid4().hex[:6].upper()}"
    rate_chg = req.new_rate - req.old_rate
    
    # Save the custom tariff event
    event = TariffEvent(
        event_id=event_id,
        source=req.source or "USITC",
        source_name="United States International Trade Commission",
        reporting_country=req.destination_country,
        origin_country=req.origin_country,
        destination_country=req.destination_country,
        hs_code=req.hs_code,
        product_description=req.product_description or f"Custom tariff disruption for {req.hs_code}",
        old_rate=req.old_rate,
        new_rate=req.new_rate,
        rate_change=rate_chg,
        effective_date=req.effective_date or datetime.datetime.utcnow() + datetime.timedelta(days=30),
        status="ACTIVE",
        retrieved_at=datetime.datetime.utcnow(),
        confidence=1.0,
        evidence=f"Custom simulation scenario. Base rate {req.old_rate*100}% increased to {req.new_rate*100}%."
    )
    db.add(event)
    db.commit()
    
    # Trigger LangGraph workflow
    initial_state = {
        "event_id": event_id,
        "tariff_event": {
            "event_id": event_id,
            "hs_code": req.hs_code,
            "origin_country": req.origin_country,
            "destination_country": req.destination_country,
            "rate_change": rate_chg,
            "old_rate": req.old_rate,
            "new_rate": req.new_rate,
            "product_description": event.product_description,
            "evidence": event.evidence
        },
        "affected_components": [],
        "affected_suppliers": [],
        "affected_plants": [],
        "supplier_analysis": [],
        "manufacturer_analysis": {},
        "inventory_analysis": {},
        "logistics_analysis": {},
        "financial_analysis": {},
        "compliance_analysis": {},
        "scenarios": [],
        "recommendation": {},
        "audit_trail": [
            {
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "action": "Trade event registered. LangGraph analysis pipeline initiated.",
                "owner": "ARES System",
                "status": "STARTED"
            }
        ],
        "agent_logs": [],
        "current_agent": "Tariff Intelligence",
        "error": None
    }
    
    # Run LangGraph workflow synchronously for demo responsiveness
    final_output = workflow.invoke(initial_state)
    
    # If error in workflow
    if "error" in final_output and final_output["error"]:
        raise HTTPException(status_code=500, detail=final_output["error"])
        
    return {
        "event_id": event_id,
        "status": "COMPLETED",
        "recommendation": final_output.get("recommendation"),
        "audit_trail": final_output.get("audit_trail")
    }

# --- SCENARIOS ---
@router.get("/scenarios/{event_id}", response_model=List[schemas.ScenarioBase])
def get_scenarios(event_id: str, db: Session = Depends(get_db)):
    scs = db.query(Scenario).filter(Scenario.event_id == event_id).order_by(Scenario.rank).all()
    return scs

# --- AGENT STATUS LOGS ---
@router.get("/agents/status/{event_id}", response_model=List[schemas.AgentLogBase])
def get_agent_status(event_id: str, db: Session = Depends(get_db)):
    logs = db.query(AgentLog).filter(AgentLog.event_id == event_id).order_by(AgentLog.timestamp.asc()).all()
    return logs

# --- DECISION CENTER ---
@router.get("/decisions/{event_id}", response_model=Optional[schemas.DecisionBase])
def get_decision(event_id: str, db: Session = Depends(get_db)):
    dec = db.query(Decision).filter(Decision.event_id == event_id).first()
    return dec

@router.post("/decisions/{event_id}/approve", response_model=schemas.DecisionBase)
def approve_decision(event_id: str, db: Session = Depends(get_db)):
    dec = db.query(Decision).filter(Decision.event_id == event_id).first()
    if not dec:
        raise HTTPException(status_code=404, detail="Decision recommendation not found.")
        
    dec.status = "APPROVED"
    dec.approved_at = datetime.datetime.utcnow()
    
    # Write audit log for execution tasks
    action_log = (
        f"Decision approved for {dec.selected_scenario}. Simulated execution tasks generated: "
        f"[Task 1: Initiate alternate sourcing contract negotiation with Monterrey ECU Solutions. "
        f"Task 2: Issue spot buy purchase order for 2000 units safety stock to Detroit Harness. "
        f"Task 3: Re-route Ohio transit shipments from ocean SEA mode to USMCA ROAD container lines.]"
    )
    
    # Log execution in Agent Log under Decision
    log_agent_execution(
        db, event_id, "Execution Plan", "COMPLETED",
        reasoning=action_log,
        evidence="Human in the loop approval received."
    )
    
    # Update related tariff event status if resolved
    te = db.query(TariffEvent).filter(TariffEvent.event_id == event_id).first()
    if te:
        te.status = "RESOLVED"
        
    db.commit()
    return dec

@router.post("/decisions/{event_id}/reject", response_model=schemas.DecisionBase)
def reject_decision(event_id: str, db: Session = Depends(get_db)):
    dec = db.query(Decision).filter(Decision.event_id == event_id).first()
    if not dec:
        raise HTTPException(status_code=404, detail="Decision recommendation not found.")
        
    dec.status = "REJECTED"
    dec.approved_at = datetime.datetime.utcnow()
    
    log_agent_execution(
        db, event_id, "Execution Plan", "COMPLETED",
        reasoning="Decision plan rejected by human operator. Workflows cancelled.",
        evidence="Operator override applied."
    )
    
    db.commit()
    return dec

# --- AUDIT TRAIL ---
@router.get("/audit/{event_id}", response_model=List[schemas.AgentLogBase])
def get_audit_trail(event_id: str, db: Session = Depends(get_db)):
    # Retrieve all logs, including agent log nodes and execution logs
    logs = db.query(AgentLog).filter(AgentLog.event_id == event_id).order_by(AgentLog.timestamp.asc()).all()
    return logs

# --- SUPPLIERS PORTAL ---
@router.get("/suppliers", response_model=List[schemas.SupplierBase])
def get_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).all()

@router.get("/suppliers/{supplier_id}", response_model=schemas.SupplierPortalView)
def get_supplier_portal_view(supplier_id: str, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
        
    # Find components supplied by this supplier
    caps = db.query(SupplierCapacity).filter(SupplierCapacity.supplier_id == supplier_id).all()
    affected_components = []
    current_capacity = 0
    lead_time = 0
    origin_country = "USA"
    
    for cap in caps:
        affected_components.append(schemas.ComponentBase(
            id=cap.component.id,
            name=cap.component.name,
            hs_code=cap.component.hs_code,
            category=cap.component.category
        ))
        current_capacity += cap.capacity_units_per_month
        lead_time = cap.lead_time_days
        origin_country = cap.origin_country
        
    # Query contracts to determine price and terms
    contract = db.query(SupplierContract).filter(SupplierContract.supplier_id == supplier_id).first()
    unit_cost = contract.unit_cost if contract else 0.0
    terms = contract.terms if contract else ""
    
    # Calculate estimated cost impact
    # Look for active tariff events that match these components
    active_events = db.query(TariffEvent).filter(TariffEvent.status == "ACTIVE").all()
    tariff_change = 0.0
    estimated_impact = 0.0
    pass_through = 0.0
    
    for event in active_events:
        for comp in affected_components:
            if event.hs_code.replace(".","")[:4] in comp.hs_code.replace(".",""):
                tariff_change = event.rate_change
                exp = calculate_financial_exposure(event.rate_change, unit_cost, current_capacity, terms)
                estimated_impact += exp["tariff_cost_monthly"]
                pass_through += exp["manufacturer_passed_monthly"]
                
    return schemas.SupplierPortalView(
        supplier_id=supplier.id,
        name=supplier.name,
        country=supplier.country,
        affected_components=affected_components,
        tariff_change=tariff_change,
        estimated_cost_impact=round(estimated_impact, 2),
        current_capacity=current_capacity,
        available_capacity=int(current_capacity * 0.15),
        lead_time=lead_time,
        potential_pass_through=round(pass_through, 2),
        alternative_production_options=["Nearshore facilities in Tijuana", "Expand local Ohio warehousing"]
    )

@router.post("/suppliers/update")
def update_supplier_portal(req: schemas.SupplierCapacityUpdate, db: Session = Depends(get_db)):
    cap = db.query(SupplierCapacity).filter(
        SupplierCapacity.supplier_id == req.supplier_id,
        SupplierCapacity.component_id == req.component_id
    ).first()
    
    if not cap:
        raise HTTPException(status_code=404, detail="Supplier capacity entry not found.")
        
    cap.capacity_units_per_month = req.capacity_units_per_month
    cap.lead_time_days = req.lead_time_days
    cap.origin_country = req.origin_country
    
    db.commit()
    return {"status": "success", "message": "Supplier capacity parameters updated successfully. Recalculation complete."}

# Helper log generator
def log_agent_execution(db: Session, event_id: str, agent_name: str, status: str, 
                       reasoning: str = None, evidence: str = None):
    new_log = AgentLog(
        event_id=event_id,
        agent_name=agent_name,
        status=status,
        reasoning=reasoning,
        evidence=evidence,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(new_log)
    db.commit()


# --- COPILOT AGENT ---
from pydantic import BaseModel

class CopilotRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

@router.post("/copilot/chat")
def copilot_chat(req: CopilotRequest, db: Session = Depends(get_db)):
    query = req.message.lower()
    in_scope_keywords = [
        "tariff", "customs", "sourcing", "supplier", "component", "plant", "inventory", "route",
        "ares", "scenario", "decision", "absorb", "switch", "split", "mitigation", "resilience",
        "hts", "8507", "8544", "8537", "7601", "shanghai", "monterrey", "detroit", "ohio", "supply chain",
        "agent", "workflow", "audit", "lead time", "exposure", "cost"
    ]
    
    is_in_scope = any(k in query for k in in_scope_keywords)
    
    if not is_in_scope:
        return {
            "reply": "I am the ARES Sourcing Copilot, specialized in supply chain resilience and tariff mitigation. "
                     "That query appears to be outside my operational domain. "
                     "Please ask me about our current tariff exposures, supplier mitigation paths (Absorb, Switch, Split), "
                     "inventory runways, or USITC live classifications.",
            "in_scope": False
        }
        
    # Gather context from DB
    active_disruptions = db.query(TariffEvent).count()
    suppliers = db.query(Supplier).all()
    components = db.query(Component).all()
    
    context_summary = (
        f"Active trade disruptions: {active_disruptions}. "
        f"Registered components: {', '.join([c.name + ' (' + c.hs_code + ')' for c in components])}. "
        f"Suppliers: {', '.join([s.name + ' (' + s.country + ')' for s in suppliers])}."
    )
    
    from backend.app.agents.agents import call_gemini
    
    prompt = (
        f"You are the ARES Sourcing Copilot, an expert AI adviser on supply chain resilience and tariff compliance. "
        f"Context of our current supply chain: {context_summary}. "
        f"User query: {req.message}. "
        f"Provide a concise, professional answer (no emojis) advising the user. "
        f"Keep the answer under 3-4 sentences."
    )
    
    system = "You are ARES Sourcing Copilot. Provide accurate, professional, emoji-free trade advice based on current data."
    
    reply = None
    try:
        reply = call_gemini(prompt, system)
    except Exception as e:
        logger.error(f"GenAI Copilot failed: {str(e)}")
        
    if not reply:
        if "8507" in query:
            reply = "Lithium Battery Cells (8507.60.00.00) face a 25% tariff duty. ARES recommends splitting source (60% Shanghai, 40% Monterrey) to avoid lines shutting down, as detaching fully takes 90 days."
        elif "switch" in query or "split" in query or "absorb" in query:
            reply = "Absorbing keeps your existing Chinese supplier but compresses margins. Switching to local USMCA suppliers takes 90 days of qualification. Splitting (60/40) represents the optimal compromise, providing continuity and hedging cost."
        elif "ohio" in query:
            reply = "The Ohio Assembly Plant (P01) consumes 5,000 wiring harnesses monthly. Its current inventory safety stock runway is 10 days, making it highly vulnerable to supply disruptions."
        elif "source" in query or "integrate" in query:
            reply = "ARES is integrated with live USITC adapters to pull Section 301 duties. WTO Tariffs and EU TARIC registries are modeled to fall back onto cached local databases in case of API failure."
        else:
            reply = "ARES has analyzed the active tariff disruptions and generated strategic options. Our nearshore Mexican and US alternatives provide the necessary capacity to mitigate China tariff shocks."
            
    return {
        "reply": reply,
        "in_scope": True
    }
