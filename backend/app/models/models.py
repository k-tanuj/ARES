from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database.session import Base
import datetime

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    reliability = Column(Float, default=1.0)
    export_dependency = Column(Float, default=0.0) # fraction of business exported to buyer
    capacity_multiplier = Column(Float, default=1.0)

class Component(Base):
    __tablename__ = "components"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    hs_code = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False)

class Plant(Base):
    __tablename__ = "plants"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    daily_consumption = Column(Integer, default=0)

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    plant_id = Column(String, ForeignKey("plants.id"), nullable=False)
    component_id = Column(String, ForeignKey("components.id"), nullable=False)
    quantity = Column(Integer, default=0)
    safety_stock = Column(Integer, default=0)
    
    plant = relationship("Plant")
    component = relationship("Component")

class Route(Base):
    __tablename__ = "routes"
    
    id = Column(String, primary_key=True, index=True)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    mode = Column(String, nullable=False) # SEA, AIR, RAIL, ROAD
    lead_time_days = Column(Integer, default=0)
    cost = Column(Float, default=0.0)

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(String, primary_key=True, index=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    component_id = Column(String, ForeignKey("components.id"), nullable=False)
    plant_id = Column(String, ForeignKey("plants.id"), nullable=False)
    quantity = Column(Integer, default=0)
    unit_price = Column(Float, default=0.0)
    order_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="PENDING") # PENDING, SHIPPED, DELIVERED
    
    supplier = relationship("Supplier")
    component = relationship("Component")
    plant = relationship("Plant")

class Shipment(Base):
    __tablename__ = "shipments"
    
    id = Column(String, primary_key=True, index=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    route_id = Column(String, ForeignKey("routes.id"), nullable=False)
    status = Column(String, default="IN_TRANSIT") # IN_TRANSIT, DELIVERED, DELAYED
    eta = Column(DateTime, nullable=False)
    
    order = relationship("Order")
    route = relationship("Route")

class TariffEvent(Base):
    __tablename__ = "tariff_events"
    
    event_id = Column(String, primary_key=True, index=True)
    source = Column(String, nullable=False)
    source_url = Column(String, nullable=True)
    source_name = Column(String, nullable=False)
    reporting_country = Column(String, nullable=False)
    origin_country = Column(String, nullable=False)
    destination_country = Column(String, nullable=False)
    hs_code = Column(String, nullable=False, index=True)
    product_description = Column(Text, nullable=False)
    old_rate = Column(Float, default=0.0)
    new_rate = Column(Float, default=0.0)
    rate_change = Column(Float, default=0.0)
    effective_date = Column(DateTime, nullable=True)
    announcement_date = Column(DateTime, nullable=True)
    status = Column(String, default="ACTIVE")
    evidence = Column(Text, nullable=True)
    retrieved_at = Column(DateTime, default=datetime.datetime.utcnow)
    confidence = Column(Float, default=1.0)

class SupplierContract(Base):
    __tablename__ = "supplier_contracts"
    
    id = Column(String, primary_key=True, index=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    component_id = Column(String, ForeignKey("components.id"), nullable=False)
    plant_id = Column(String, ForeignKey("plants.id"), nullable=False)
    unit_cost = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    effective_date = Column(DateTime, nullable=False)
    expiration_date = Column(DateTime, nullable=False)
    terms = Column(Text, nullable=True) # JSON or descriptive terms
    
    supplier = relationship("Supplier")
    component = relationship("Component")
    plant = relationship("Plant")

class SupplierCapacity(Base):
    __tablename__ = "supplier_capacity"
    
    id = Column(String, primary_key=True, index=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    component_id = Column(String, ForeignKey("components.id"), nullable=False)
    capacity_units_per_month = Column(Integer, default=0)
    lead_time_days = Column(Integer, default=0)
    origin_country = Column(String, nullable=False)
    
    supplier = relationship("Supplier")
    component = relationship("Component")

class Decision(Base):
    __tablename__ = "decisions"
    
    id = Column(String, primary_key=True, index=True)
    event_id = Column(String, ForeignKey("tariff_events.event_id"), nullable=False)
    recommendation = Column(String, nullable=False)
    selected_scenario = Column(String, nullable=True)
    status = Column(String, default="PENDING") # PENDING, APPROVED, MODIFIED, REJECTED
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    tariff_event = relationship("TariffEvent")

class AgentLog(Base):
    __tablename__ = "agent_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String, ForeignKey("tariff_events.event_id"), nullable=False)
    agent_name = Column(String, nullable=False)
    status = Column(String, default="IDLE") # IDLE, PROCESSING, COMPLETED, FAILED
    input_data = Column(Text, nullable=True)
    output_data = Column(Text, nullable=True)
    reasoning = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    duration_ms = Column(Integer, default=0)

class Evidence(Base):
    __tablename__ = "evidence"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String, ForeignKey("tariff_events.event_id"), nullable=False)
    source = Column(String, nullable=False)
    evidence_text = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    retrieved_at = Column(DateTime, default=datetime.datetime.utcnow)

class Scenario(Base):
    __tablename__ = "scenarios"
    
    id = Column(String, primary_key=True, index=True)
    event_id = Column(String, ForeignKey("tariff_events.event_id"), nullable=False)
    scenario_name = Column(String, nullable=False) # e.g. "Scenario A: Absorb", "Scenario B: Switch", "Scenario C: Split Source"
    strategy_type = Column(String, nullable=False) # ABSORB, SWITCH, SPLIT_SOURCE
    estimated_cost = Column(Float, default=0.0)
    tariff_exposure = Column(Float, default=0.0)
    production_continuity = Column(String, nullable=False) # e.g. "SAFE", "WATCH", "CRITICAL"
    implementation_time = Column(Integer, default=0) # days
    supplier_risk = Column(String, nullable=False) # LOW, MEDIUM, HIGH
    logistics_risk = Column(String, nullable=False) # LOW, MEDIUM, HIGH
    compliance_status = Column(String, nullable=False) # COMPLIANT, WARNING, NON_COMPLIANT
    confidence = Column(Float, default=1.0)
    assumptions = Column(Text, nullable=True)
    rank = Column(Integer, default=1)
    
    tariff_event = relationship("TariffEvent")
