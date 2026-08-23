import datetime
import time
import uuid
import json
from typing import Dict, Any, List
from langgraph.graph import StateGraph, START, END
from sqlalchemy.orm import Session
from backend.app.database.session import SessionLocal
from backend.app.models.models import (
    TariffEvent, AgentLog, Scenario, Decision, Supplier, Component, Plant, SupplierCapacity
)
from backend.app.graph.state import ARESState
from backend.app.services.analysis_service import (
    find_affected_components, find_affected_suppliers, calculate_inventory_runway,
    calculate_financial_exposure, score_and_rank_scenarios
)
from backend.app.services.db_service import get_alternative_suppliers
from backend.app.agents.agents import (
    TariffAgent, SupplierAgent, ManufacturerAgent, InventoryAgent,
    LogisticsAgent, FinanceAgent, ComplianceAgent, ScenarioAgent, DecisionAgent
)

# Helper function to create/update agent log in DB
def log_agent_execution(db: Session, event_id: str, agent_name: str, status: str, 
                       input_data: Any = None, output_data: Any = None, 
                       reasoning: str = None, evidence: str = None, duration_ms: int = 0):
    
    # Check if a log entry already exists
    existing = db.query(AgentLog).filter(
        AgentLog.event_id == event_id,
        AgentLog.agent_name == agent_name
    ).first()
    
    if existing:
        existing.status = status
        if input_data is not None:
            existing.input_data = json.dumps(input_data)
        if output_data is not None:
            existing.output_data = json.dumps(output_data)
        if reasoning is not None:
            existing.reasoning = reasoning
        if evidence is not None:
            existing.evidence = evidence
        existing.duration_ms = duration_ms
        existing.timestamp = datetime.datetime.utcnow()
    else:
        new_log = AgentLog(
            event_id=event_id,
            agent_name=agent_name,
            status=status,
            input_data=json.dumps(input_data) if input_data is not None else None,
            output_data=json.dumps(output_data) if output_data is not None else None,
            reasoning=reasoning,
            evidence=evidence,
            duration_ms=duration_ms,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(new_log)
    
    db.commit()

# --- NODE FUNCTIONS ---

def tariff_node(state: ARESState) -> Dict[str, Any]:
    start_time = time.time()
    db = SessionLocal()
    event_id = state["event_id"]
    
    try:
        log_agent_execution(db, event_id, "Tariff Intelligence", "PROCESSING", input_data=state["tariff_event"])
        
        result = TariffAgent().analyze(state)
        
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution(
            db, event_id, "Tariff Intelligence", "COMPLETED",
            output_data=result,
            reasoning=result["summary"],
            evidence=result["evidence_reference"],
            duration_ms=duration
        )
        
        audit_item = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": "Tariff Intelligence Agent analysis completed",
            "owner": "Tariff Intelligence",
            "status": "COMPLETED"
        }
        
        return {
            "tariff_event": {**state["tariff_event"], "product_description": result["summary"]},
            "audit_trail": state.get("audit_trail", []) + [audit_item]
        }
    except Exception as e:
        db.rollback()
        log_agent_execution(db, event_id, "Tariff Intelligence", "FAILED", reasoning=str(e))
        return {"error": f"Tariff Agent failed: {str(e)}"}
    finally:
        db.close()


def supplier_node(state: ARESState) -> Dict[str, Any]:
    start_time = time.time()
    db = SessionLocal()
    event_id = state["event_id"]
    hs_code = state["tariff_event"]["hs_code"]
    origin_country = state["tariff_event"]["origin_country"]
    
    try:
        # Find affected components
        components = find_affected_components(db, hs_code)
        
        # Find affected suppliers
        suppliers = []
        for comp in components:
            sups = find_affected_suppliers(db, comp["id"], origin_country)
            for s in sups:
                s["component_id"] = comp["id"]
                s["component_name"] = comp["name"]
            suppliers.extend(sups)
            
        log_agent_execution(db, event_id, "Supplier Intelligence", "PROCESSING", input_data={"suppliers": suppliers})
        
        temp_state = state.copy()
        temp_state["affected_components"] = components
        temp_state["affected_suppliers"] = suppliers
        
        result = SupplierAgent().analyze(temp_state)
        
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution(
            db, event_id, "Supplier Intelligence", "COMPLETED",
            output_data=result,
            reasoning="\n\n".join([f"{s['supplier_name']}: {s['details']}" for s in result]),
            evidence=f"Identified {len(suppliers)} exposed supplier relationships.",
            duration_ms=duration
        )
        
        audit_item = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": "Supplier Intelligence Agent analysis completed",
            "owner": "Supplier Intelligence",
            "status": "COMPLETED"
        }
        
        return {
            "affected_components": components,
            "affected_suppliers": suppliers,
            "supplier_analysis": result,
            "audit_trail": state.get("audit_trail", []) + [audit_item]
        }
    except Exception as e:
        db.rollback()
        log_agent_execution(db, event_id, "Supplier Intelligence", "FAILED", reasoning=str(e))
        return {"error": f"Supplier Agent failed: {str(e)}"}
    finally:
        db.close()


def manufacturer_node(state: ARESState) -> Dict[str, Any]:
    start_time = time.time()
    db = SessionLocal()
    event_id = state["event_id"]
    suppliers = state["affected_suppliers"]
    
    try:
        # Resolve affected plants and runways
        plants = db.query(Plant).all()
        affected_plants = []
        
        for plant in plants:
            for sup in suppliers:
                runway = calculate_inventory_runway(db, plant.id, sup["component_id"])
                # Only include plant if it consumes the affected component
                if runway["daily_consumption"] > 0:
                    affected_plants.append({
                        "plant_id": plant.id,
                        "plant_name": plant.name,
                        "component_id": sup["component_id"],
                        "component_name": sup["component_name"],
                        "runway": runway
                    })
                    
        log_agent_execution(db, event_id, "Manufacturer Impact", "PROCESSING", input_data={"plants": affected_plants})
        
        temp_state = state.copy()
        temp_state["affected_plants"] = affected_plants
        
        result = ManufacturerAgent().analyze(temp_state)
        
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution(
            db, event_id, "Manufacturer Impact", "COMPLETED",
            output_data=result,
            reasoning=result["details"],
            evidence=f"Threat level: {result['production_stoppage_threat']}",
            duration_ms=duration
        )
        
        audit_item = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": "Manufacturer Impact Agent analysis completed",
            "owner": "Manufacturer Impact",
            "status": "COMPLETED"
        }
        
        return {
            "affected_plants": affected_plants,
            "manufacturer_analysis": result,
            "audit_trail": state.get("audit_trail", []) + [audit_item]
        }
    except Exception as e:
        db.rollback()
        log_agent_execution(db, event_id, "Manufacturer Impact", "FAILED", reasoning=str(e))
        return {"error": f"Manufacturer Agent failed: {str(e)}"}
    finally:
        db.close()


def inventory_node(state: ARESState) -> Dict[str, Any]:
    start_time = time.time()
    db = SessionLocal()
    event_id = state["event_id"]
    
    try:
        log_agent_execution(db, event_id, "Inventory Intelligence", "PROCESSING", input_data=state["affected_plants"])
        
        result = InventoryAgent().analyze(state)
        
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution(
            db, event_id, "Inventory Intelligence", "COMPLETED",
            output_data=result,
            reasoning=result["details"],
            evidence=f"Health status: {result['inventory_health']}",
            duration_ms=duration
        )
        
        audit_item = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": "Inventory Intelligence Agent analysis completed",
            "owner": "Inventory Intelligence",
            "status": "COMPLETED"
        }
        
        return {
            "inventory_analysis": result,
            "audit_trail": state.get("audit_trail", []) + [audit_item]
        }
    except Exception as e:
        db.rollback()
        log_agent_execution(db, event_id, "Inventory Intelligence", "FAILED", reasoning=str(e))
        return {"error": f"Inventory Agent failed: {str(e)}"}
    finally:
        db.close()


def logistics_node(state: ARESState) -> Dict[str, Any]:
    start_time = time.time()
    db = SessionLocal()
    event_id = state["event_id"]
    
    try:
        log_agent_execution(db, event_id, "Logistics Intelligence", "PROCESSING", input_data=state["affected_suppliers"])
        
        result = LogisticsAgent().analyze(state)
        
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution(
            db, event_id, "Logistics Intelligence", "COMPLETED",
            output_data=result,
            reasoning=result["details"],
            evidence=f"Transit Risk: {result['transit_risk']}",
            duration_ms=duration
        )
        
        audit_item = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": "Logistics Intelligence Agent analysis completed",
            "owner": "Logistics Intelligence",
            "status": "COMPLETED"
        }
        
        return {
            "logistics_analysis": result,
            "audit_trail": state.get("audit_trail", []) + [audit_item]
        }
    except Exception as e:
        db.rollback()
        log_agent_execution(db, event_id, "Logistics Intelligence", "FAILED", reasoning=str(e))
        return {"error": f"Logistics Agent failed: {str(e)}"}
    finally:
        db.close()


def finance_node(state: ARESState) -> Dict[str, Any]:
    start_time = time.time()
    db = SessionLocal()
    event_id = state["event_id"]
    suppliers = state["affected_suppliers"]
    rate_change = state["tariff_event"]["rate_change"]
    
    try:
        # Sum cost exposure across all affected suppliers
        total_baseline = 0.0
        total_tariff = 0.0
        total_absorbed = 0.0
        total_passed = 0.0
        
        for sup in suppliers:
            # Assume monthly volume matches capacity_units_per_month for prototype sizing
            volume = sup["capacity_units_per_month"]
            unit_cost = sup["unit_cost"]
            terms = sup["contract_terms"]
            
            exp = calculate_financial_exposure(rate_change, unit_cost, volume, terms)
            
            total_baseline += exp["baseline_cost_monthly"]
            total_tariff += exp["tariff_cost_monthly"]
            total_absorbed += exp["supplier_absorbed_monthly"]
            total_passed += exp["manufacturer_passed_monthly"]
            
        financial_summary = {
            "baseline_cost_monthly": total_baseline,
            "tariff_cost_monthly": total_tariff,
            "supplier_absorbed_monthly": total_absorbed,
            "manufacturer_passed_monthly": total_passed,
            "annualized_exposure": total_passed * 12,
            "pass_through_percentage": round((total_passed / total_tariff * 100) if total_tariff > 0 else 0, 1)
        }
        
        log_agent_execution(db, event_id, "Finance Intelligence", "PROCESSING", input_data=financial_summary)
        
        temp_state = state.copy()
        temp_state["financial_analysis"] = financial_summary
        
        result = FinanceAgent().analyze(temp_state)
        
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution(
            db, event_id, "Finance Intelligence", "COMPLETED",
            output_data=result,
            reasoning=result["details"],
            evidence=f"Annualized Exposure: ${result['annualized_impact']:,.2f}",
            duration_ms=duration
        )
        
        audit_item = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": "Finance Intelligence Agent analysis completed",
            "owner": "Finance",
            "status": "COMPLETED"
        }
        
        return {
            "financial_analysis": financial_summary,
            "audit_trail": state.get("audit_trail", []) + [audit_item]
        }
    except Exception as e:
        db.rollback()
        log_agent_execution(db, event_id, "Finance Intelligence", "FAILED", reasoning=str(e))
        return {"error": f"Finance Agent failed: {str(e)}"}
    finally:
        db.close()


def compliance_node(state: ARESState) -> Dict[str, Any]:
    start_time = time.time()
    db = SessionLocal()
    event_id = state["event_id"]
    
    try:
        log_agent_execution(db, event_id, "Compliance Intelligence", "PROCESSING", input_data=state["tariff_event"])
        
        result = ComplianceAgent().analyze(state)
        
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution(
            db, event_id, "Compliance Intelligence", "COMPLETED",
            output_data=result,
            reasoning=result["details"],
            evidence=f"Compliance: {result['compliance_status']}",
            duration_ms=duration
        )
        
        audit_item = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": "Compliance Intelligence Agent analysis completed",
            "owner": "Compliance",
            "status": "COMPLETED"
        }
        
        return {
            "compliance_analysis": result,
            "audit_trail": state.get("audit_trail", []) + [audit_item]
        }
    except Exception as e:
        db.rollback()
        log_agent_execution(db, event_id, "Compliance Intelligence", "FAILED", reasoning=str(e))
        return {"error": f"Compliance Agent failed: {str(e)}"}
    finally:
        db.close()


def scenario_node(state: ARESState) -> Dict[str, Any]:
    start_time = time.time()
    db = SessionLocal()
    event_id = state["event_id"]
    suppliers = state["affected_suppliers"]
    fin = state["financial_analysis"]
    plants = state["affected_plants"]
    
    try:
        # Base parameters for Scenario Generation
        primary_sup = suppliers[0] if suppliers else {}
        comp_id = primary_sup.get("component_id", "N/A")
        sup_id = primary_sup.get("id", "N/A")
        monthly_vol = primary_sup.get("capacity_units_per_month", 10000)
        
        # Query alternatives
        alts = get_alternative_suppliers(db, comp_id, sup_id)
        best_alt = alts[0] if alts else {"supplier_name": "No Alternative", "unit_cost": primary_sup.get("unit_cost", 0) * 1.5, "lead_time": 30, "reliability": 0.5, "country": "USA"}
        
        # Scenario A: Absorb
        sc_a = {
            "id": f"SC-{event_id}-A",
            "event_id": event_id,
            "scenario_name": "Scenario A: Absorb Tariff",
            "strategy_type": "ABSORB",
            "estimated_cost": fin["annualized_exposure"],
            "tariff_exposure": fin["tariff_cost_monthly"] * 12,
            "production_continuity": "WATCH",
            "implementation_time": 0, # immediate
            "supplier_risk": "LOW",
            "logistics_risk": "HIGH", # remains overseas shipping
            "compliance_status": "COMPLIANT",
            "confidence": 0.95
        }
        
        # Scenario B: Switch
        alt_annual_cost = best_alt["unit_cost"] * monthly_vol * 12
        baseline_annual = primary_sup.get("unit_cost", 0) * monthly_vol * 12
        sc_b_cost = alt_annual_cost - baseline_annual # difference in procurement cost, zero tariff
        sc_b = {
            "id": f"SC-{event_id}-B",
            "event_id": event_id,
            "scenario_name": "Scenario B: Switch Supplier",
            "strategy_type": "SWITCH",
            "estimated_cost": max(0.0, sc_b_cost),
            "tariff_exposure": 0.0,
            "production_continuity": "WATCH",
            "implementation_time": 90, # 90 days qualification
            "supplier_risk": "HIGH" if best_alt["reliability"] < 0.9 else "MEDIUM",
            "logistics_risk": "LOW" if best_alt["country"] in ["USA", "Mexico"] else "MEDIUM",
            "compliance_status": "COMPLIANT",
            "confidence": 0.85
        }
        
        # Scenario C: Split Source (60% Primary, 40% Alt)
        sc_c_cost = (0.6 * (primary_sup.get("unit_cost", 0) + (primary_sup.get("unit_cost", 0) * state["tariff_event"]["rate_change"])) + 0.4 * best_alt["unit_cost"]) * monthly_vol * 12 - baseline_annual
        sc_c = {
            "id": f"SC-{event_id}-C",
            "event_id": event_id,
            "scenario_name": "Scenario C: Split Sourcing",
            "strategy_type": "SPLIT_SOURCE",
            "estimated_cost": max(0.0, sc_c_cost),
            "tariff_exposure": fin["tariff_cost_monthly"] * 0.6 * 12,
            "production_continuity": "SAFE",
            "implementation_time": 30, # 30 days integration
            "supplier_risk": "MEDIUM",
            "logistics_risk": "MEDIUM",
            "compliance_status": "COMPLIANT",
            "confidence": 0.90
        }
        
        # Score and rank scenarios using deterministic layer
        ranked_scenarios = score_and_rank_scenarios([sc_a, sc_b, sc_c])
        
        log_agent_execution(db, event_id, "Scenario Analysis", "PROCESSING", input_data=ranked_scenarios)
        
        temp_state = state.copy()
        temp_state["scenarios"] = ranked_scenarios
        
        result = ScenarioAgent().analyze(temp_state)
        
        # Save scenarios to DB
        for sc_item in result:
            db_sc = Scenario(
                id=sc_item["id"],
                event_id=sc_item["event_id"],
                scenario_name=sc_item["scenario_name"],
                strategy_type=sc_item["strategy_type"],
                estimated_cost=sc_item["estimated_cost"],
                tariff_exposure=sc_item["tariff_exposure"],
                production_continuity=sc_item["production_continuity"],
                implementation_time=sc_item["implementation_time"],
                supplier_risk=sc_item["supplier_risk"],
                logistics_risk=sc_item["logistics_risk"],
                compliance_status=sc_item["compliance_status"],
                confidence=sc_item["confidence"],
                assumptions=sc_item["assumptions"],
                rank=sc_item["rank"]
            )
            db.add(db_sc)
        db.commit()
        
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution(
            db, event_id, "Scenario Analysis", "COMPLETED",
            output_data=result,
            reasoning=f"Generated and scored {len(result)} strategic scenarios.",
            evidence=f"Recommended Scenario: {result[0]['scenario_name']}",
            duration_ms=duration
        )
        
        audit_item = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": "Scenario Intelligence Agent analysis completed",
            "owner": "Scenario",
            "status": "COMPLETED"
        }
        
        return {
            "scenarios": result,
            "audit_trail": state.get("audit_trail", []) + [audit_item]
        }
    except Exception as e:
        db.rollback()
        log_agent_execution(db, event_id, "Scenario Analysis", "FAILED", reasoning=str(e))
        return {"error": f"Scenario Agent failed: {str(e)}"}
    finally:
        db.close()


def decision_node(state: ARESState) -> Dict[str, Any]:
    start_time = time.time()
    db = SessionLocal()
    event_id = state["event_id"]
    scenarios = state["scenarios"]
    
    try:
        # Recommended scenario is Rank 1 (index 0)
        rec = scenarios[0] if scenarios else {}
        
        log_agent_execution(db, event_id, "Decision Recommendation", "PROCESSING", input_data=rec)
        
        temp_state = state.copy()
        temp_state["recommendation"] = rec
        
        result = DecisionAgent().analyze(temp_state)
        
        # Save Decision Recommendation to DB
        db_dec = Decision(
            id=f"DEC-{event_id}",
            event_id=event_id,
            recommendation=result["explanation"],
            selected_scenario=rec.get("scenario_name"),
            status="PENDING",
            created_at=datetime.datetime.utcnow()
        )
        db.add(db_dec)
        db.commit()
        
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution(
            db, event_id, "Decision Recommendation", "COMPLETED",
            output_data=result,
            reasoning=result["explanation"],
            evidence=f"Decision Score: {rec.get('score')}",
            duration_ms=duration
        )
        
        audit_item = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action": f"Recommended strategy generated: {rec.get('scenario_name')}",
            "owner": "Decision Engine",
            "status": "PENDING"
        }
        
        return {
            "recommendation": result,
            "audit_trail": state.get("audit_trail", []) + [audit_item],
            "current_agent": None
        }
    except Exception as e:
        db.rollback()
        log_agent_execution(db, event_id, "Decision Recommendation", "FAILED", reasoning=str(e))
        return {"error": f"Decision Agent failed: {str(e)}"}
    finally:
        db.close()

# --- COMPILE STATE GRAPH ---

builder = StateGraph(ARESState)

# Add Nodes
builder.add_node("tariff_node", tariff_node)
builder.add_node("supplier_node", supplier_node)
builder.add_node("manufacturer_node", manufacturer_node)
builder.add_node("inventory_node", inventory_node)
builder.add_node("logistics_node", logistics_node)
builder.add_node("finance_node", finance_node)
builder.add_node("compliance_node", compliance_node)
builder.add_node("scenario_node", scenario_node)
builder.add_node("decision_node", decision_node)

# Add Edges
builder.add_edge(START, "tariff_node")
builder.add_edge("tariff_node", "supplier_node")
builder.add_edge("supplier_node", "manufacturer_node")
builder.add_edge("manufacturer_node", "inventory_node")
builder.add_edge("inventory_node", "logistics_node")
builder.add_edge("logistics_node", "finance_node")
builder.add_edge("finance_node", "compliance_node")
builder.add_edge("compliance_node", "scenario_node")
builder.add_edge("scenario_node", "decision_node")
builder.add_edge("decision_node", END)

workflow = builder.compile()
