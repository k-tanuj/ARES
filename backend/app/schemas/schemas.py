from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# Common Configuration
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# Supplier Schemas
class SupplierBase(BaseSchema):
    id: str
    name: str
    country: str
    reliability: float
    export_dependency: float
    capacity_multiplier: float

# Component Schemas
class ComponentBase(BaseSchema):
    id: str
    name: str
    hs_code: str
    category: str

# Plant Schemas
class PlantBase(BaseSchema):
    id: str
    name: str
    country: str
    daily_consumption: int

# Inventory Schemas
class InventoryBase(BaseSchema):
    id: int
    plant_id: str
    component_id: str
    quantity: int
    safety_stock: int
    plant: Optional[PlantBase] = None
    component: Optional[ComponentBase] = None

# Tariff Event Schemas
class TariffEventBase(BaseSchema):
    event_id: str
    source: str
    source_url: Optional[str] = None
    source_name: str
    reporting_country: str
    origin_country: str
    destination_country: str
    hs_code: str
    product_description: str
    old_rate: float
    new_rate: float
    rate_change: float
    effective_date: Optional[datetime] = None
    announcement_date: Optional[datetime] = None
    status: str
    evidence: Optional[str] = None
    retrieved_at: datetime
    confidence: float

class TariffEventCreate(BaseModel):
    hs_code: str
    origin_country: str
    destination_country: str
    old_rate: float
    new_rate: float
    effective_date: Optional[datetime] = None
    product_description: Optional[str] = None
    source: Optional[str] = "USITC"

# Scenario Schemas
class ScenarioBase(BaseSchema):
    id: str
    event_id: str
    scenario_name: str
    strategy_type: str # ABSORB, SWITCH, SPLIT_SOURCE
    estimated_cost: float
    tariff_exposure: float
    production_continuity: str
    implementation_time: int
    supplier_risk: str
    logistics_risk: str
    compliance_status: str
    confidence: float
    assumptions: Optional[str] = None
    rank: int

# Decision Schemas
class DecisionBase(BaseSchema):
    id: str
    event_id: str
    recommendation: str
    selected_scenario: Optional[str] = None
    status: str
    approved_at: Optional[datetime] = None
    created_at: datetime

class DecisionUpdate(BaseModel):
    selected_scenario: str
    status: str # APPROVED, REJECTED, MODIFIED

# Agent Log Schemas
class AgentLogBase(BaseSchema):
    id: int
    event_id: str
    agent_name: str
    status: str
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    reasoning: Optional[str] = None
    evidence: Optional[str] = None
    timestamp: datetime
    duration_ms: int

# Audit Trail Schema
class AuditTrailItem(BaseSchema):
    timestamp: datetime
    action: str
    owner: str
    status: str
    source_decision: Optional[str] = None

# Supplier Portal Schemas
class SupplierPortalView(BaseSchema):
    supplier_id: str
    name: str
    country: str
    affected_components: List[ComponentBase] = []
    tariff_change: float = 0.0
    estimated_cost_impact: float = 0.0
    current_capacity: int = 0
    available_capacity: int = 0
    lead_time: int = 0
    potential_pass_through: float = 0.0
    alternative_production_options: List[str] = []

class SupplierCapacityUpdate(BaseModel):
    supplier_id: str
    component_id: str
    capacity_units_per_month: int
    lead_time_days: int
    origin_country: str

# Dashboard Schemas
class DashboardKPIs(BaseModel):
    active_disruptions: int
    suppliers_exposed: int
    production_lines_at_risk: int
    inventory_days: int
    estimated_cost_exposure: float

class DashboardSourceRegistry(BaseModel):
    source: str
    type: str
    status: str
    last_updated: Optional[datetime] = None
    coverage: str

class DashboardView(BaseModel):
    kpis: DashboardKPIs
    recent_events: List[TariffEventBase]
    sources: List[DashboardSourceRegistry]
