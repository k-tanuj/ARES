from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.models.models import (
    Component, Supplier, SupplierContract, SupplierCapacity, Inventory, Route, Plant, Scenario
)
from backend.app.core.config import settings
import uuid
import re

def find_affected_components(db: Session, hs_code: str) -> List[Dict[str, Any]]:
    # Clean hs_code for prefix comparison (e.g., "8544.30.00" -> "854430")
    clean_search = hs_code.replace(".", "").strip()
    
    components = db.query(Component).all()
    affected = []
    
    for comp in components:
        clean_comp_hs = comp.hs_code.replace(".", "").strip()
        # Check if either is a prefix of the other (e.g. "8544" matches "8544.30.00.00")
        if clean_search.startswith(clean_comp_hs) or clean_comp_hs.startswith(clean_search[:4]):
            affected.append({
                "id": comp.id,
                "name": comp.name,
                "hs_code": comp.hs_code,
                "category": comp.category
            })
    return affected

def find_affected_suppliers(db: Session, component_id: str, origin_country: str) -> List[Dict[str, Any]]:
    # Find suppliers who produce this component in the affected origin country
    capacities = db.query(SupplierCapacity).filter(
        SupplierCapacity.component_id == component_id,
        SupplierCapacity.origin_country == origin_country
    ).all()
    
    affected = []
    for cap in capacities:
        supplier = cap.supplier
        contract = db.query(SupplierContract).filter(
            SupplierContract.supplier_id == supplier.id,
            SupplierContract.component_id == component_id
        ).first()
        
        affected.append({
            "id": supplier.id,
            "name": supplier.name,
            "country": supplier.country,
            "reliability": supplier.reliability,
            "export_dependency": supplier.export_dependency,
            "capacity_units_per_month": cap.capacity_units_per_month,
            "lead_time_days": cap.lead_time_days,
            "unit_cost": contract.unit_cost if contract else 0.0,
            "contract_id": contract.id if contract else None,
            "contract_terms": contract.terms if contract else ""
        })
    return affected

def calculate_inventory_runway(db: Session, plant_id: str, component_id: str) -> Dict[str, Any]:
    inventory = db.query(Inventory).filter(
        Inventory.plant_id == plant_id,
        Inventory.component_id == component_id
    ).first()
    
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    
    if not inventory or not plant or plant.daily_consumption <= 0:
        return {
            "available_stock": 0,
            "daily_consumption": 0,
            "runway_days": 0.0,
            "safety_stock": 0,
            "status": "CRITICAL"
        }
        
    available = inventory.quantity
    daily = plant.daily_consumption
    runway = available / daily
    
    safety_stock_days = inventory.safety_stock / daily
    
    status = "SAFE"
    if runway < 3.0:
        status = "CRITICAL"
    elif runway < 7.0:
        status = "AT_RISK"
    elif runway < safety_stock_days:
        status = "WATCH"
        
    return {
        "available_stock": available,
        "daily_consumption": daily,
        "runway_days": round(runway, 1),
        "safety_stock": inventory.safety_stock,
        "status": status
    }

def calculate_financial_exposure(rate_change: float, unit_cost: float, monthly_volume: int, terms: str) -> Dict[str, Any]:
    # Check if supplier absorbs part of the tariff based on contract terms
    absorbed_rate = 0.0
    # Simple regex parsing of terms, e.g. "absorbs up to 5% tariff changes"
    absorb_match = re.search(r'absorbs up to (\d+)%', terms, re.IGNORECASE)
    if absorb_match:
        absorbed_rate = float(absorb_match.group(1)) / 100.0
        
    effective_tariff_increase = max(0.0, rate_change - absorbed_rate)
    
    baseline_monthly = unit_cost * monthly_volume
    tariff_cost_monthly = baseline_monthly * rate_change
    absorbed_cost_monthly = baseline_monthly * min(rate_change, absorbed_rate)
    passed_cost_monthly = baseline_monthly * effective_tariff_increase
    
    passed_percentage = (effective_tariff_increase / rate_change) * 100.0 if rate_change > 0 else 0.0
    
    return {
        "unit_cost": unit_cost,
        "monthly_volume": monthly_volume,
        "baseline_cost_monthly": round(baseline_monthly, 2),
        "tariff_cost_monthly": round(tariff_cost_monthly, 2),
        "supplier_absorbed_monthly": round(absorbed_cost_monthly, 2),
        "manufacturer_passed_monthly": round(passed_cost_monthly, 2),
        "pass_through_percentage": round(passed_percentage, 1),
        "annualized_exposure": round(passed_cost_monthly * 12, 2)
    }

def score_and_rank_scenarios(scenarios: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not scenarios:
        return []
        
    costs = [s["estimated_cost"] for s in scenarios]
    days = [s["implementation_time"] for s in scenarios]
    
    min_cost, max_cost = min(costs), max(costs)
    min_days, max_days = min(days), max(days)
    
    scored_scenarios = []
    for sc in scenarios:
        # Cost Score (higher is better: cheaper = higher score)
        if max_cost == min_cost:
            cost_score = 1.0
        else:
            cost_score = 1.0 - (sc["estimated_cost"] - min_cost) / (max_cost - min_cost)
            
        # Time Score (higher is better: faster = higher score)
        if max_days == min_days:
            time_score = 1.0
        else:
            time_score = 1.0 - (sc["implementation_time"] - min_days) / (max_days - min_days)
            
        # Risk Score (higher is better: lower risk = higher score)
        risk_map = {"LOW": 1.0, "MEDIUM": 0.5, "HIGH": 0.0}
        risk_score = risk_map.get(sc["supplier_risk"].upper(), 0.5) * 0.5 + risk_map.get(sc["logistics_risk"].upper(), 0.5) * 0.5
        
        # Continuity Score (higher is better)
        continuity_map = {"SAFE": 1.0, "WATCH": 0.6, "AT_RISK": 0.2, "CRITICAL": 0.0}
        continuity_score = continuity_map.get(sc["production_continuity"].upper(), 0.5)
        
        # Weight calculations
        score = (
            settings.cost_weight * cost_score +
            settings.risk_weight * risk_score +
            settings.continuity_weight * continuity_score +
            settings.time_weight * time_score
        )
        
        sc_copy = sc.copy()
        sc_copy["score"] = round(score, 3)
        scored_scenarios.append(sc_copy)
        
    # Sort descending by score
    scored_scenarios.sort(key=lambda x: x["score"], reverse=True)
    
    # Assign ranks
    for idx, sc in enumerate(scored_scenarios):
        sc["rank"] = idx + 1
        
    return scored_scenarios
