from sqlalchemy.orm import Session
from backend.app.models.models import (
    Supplier, Component, Plant, Inventory, Route, Order, Shipment,
    TariffEvent, SupplierContract, SupplierCapacity, Decision, AgentLog, Evidence, Scenario
)
import datetime

def seed_db(db: Session):
    # Check if database is already seeded
    if db.query(Supplier).first() is not None:
        return
    
    # 1. Add Suppliers
    suppliers = [
        Supplier(id="S01", name="Chaozhou Auto Parts", country="China", reliability=0.88, export_dependency=0.82, capacity_multiplier=1.0),
        Supplier(id="S02", name="Monterrey ECU Solutions", country="Mexico", reliability=0.94, export_dependency=0.45, capacity_multiplier=1.2),
        Supplier(id="S03", name="Detroit Harness & Electric", country="USA", reliability=0.97, export_dependency=0.20, capacity_multiplier=1.5),
        Supplier(id="S04", name="Shenzhen Battery Tech", country="China", reliability=0.89, export_dependency=0.75, capacity_multiplier=1.0),
        Supplier(id="S05", name="Ramos Arizpe Batteries", country="Mexico", reliability=0.95, export_dependency=0.50, capacity_multiplier=1.1)
    ]
    db.add_all(suppliers)
    
    # 2. Add Components
    components = [
        Component(id="C01", name="Automotive ECU", hs_code="8537.10.91.70", category="Electronics"),
        Component(id="C02", name="Wiring Harness", hs_code="8544.30.00.00", category="Electrical"),
        Component(id="C03", name="Lithium-Ion Battery Cells", hs_code="8507.60.00.00", category="Energy"),
        Component(id="C04", name="Brake Assemblies", hs_code="8708.30.50.30", category="Chassis"),
        Component(id="C05", name="Aluminum Casting Block", hs_code="7601.10.60.00", category="Raw Materials")
    ]
    db.add_all(components)
    
    # 3. Add Plants
    plants = [
        Plant(id="P01", name="Ohio Assembly Plant", country="USA", daily_consumption=420),
        Plant(id="P02", name="Michigan Engine & E-Drive", country="USA", daily_consumption=250)
    ]
    db.add_all(plants)
    db.commit()
    
    # 4. Add Inventory
    inventory = [
        Inventory(plant_id="P01", component_id="C01", quantity=3500, safety_stock=2000),
        Inventory(plant_id="P01", component_id="C02", quantity=4500, safety_stock=3000),
        Inventory(plant_id="P02", component_id="C03", quantity=1800, safety_stock=2000),
        Inventory(plant_id="P01", component_id="C04", quantity=6000, safety_stock=4000)
    ]
    db.add_all(inventory)
    
    # 5. Add Routes
    routes = [
        Route(id="R01", origin="China", destination="USA", mode="SEA", lead_time_days=22, cost=4500.0),
        Route(id="R02", origin="Mexico", destination="USA", mode="ROAD", lead_time_days=4, cost=1800.0),
        Route(id="R03", origin="USA", destination="USA", mode="ROAD", lead_time_days=1, cost=600.0),
        Route(id="R04", origin="China", destination="USA", mode="SEA", lead_time_days=25, cost=5200.0),
        Route(id="R05", origin="Mexico", destination="USA", mode="ROAD", lead_time_days=5, cost=2000.0)
    ]
    db.add_all(routes)
    
    # 6. Add Contracts
    contracts = [
        SupplierContract(
            id="SC01", supplier_id="S01", component_id="C02", plant_id="P01",
            unit_cost=45.0, currency="USD",
            effective_date=datetime.datetime(2025, 1, 1),
            expiration_date=datetime.datetime(2027, 12, 31),
            terms="FOB Shanghai port, net 60. Contract requires supplier to absorb up to 5% tariff changes. Over 5%, renegotiation clause triggers."
        ),
        SupplierContract(
            id="SC02", supplier_id="S02", component_id="C01", plant_id="P01",
            unit_cost=120.0, currency="USD",
            effective_date=datetime.datetime(2025, 3, 1),
            expiration_date=datetime.datetime(2026, 12, 31),
            terms="FOB Monterrey, net 45. Trade remedies USMCA compliant. Sourcing origin is certified Mexican."
        ),
        SupplierContract(
            id="SC03", supplier_id="S03", component_id="C02", plant_id="P01",
            unit_cost=68.0, currency="USD",
            effective_date=datetime.datetime(2025, 6, 1),
            expiration_date=datetime.datetime(2026, 6, 30),
            terms="EXW Detroit, net 30. Standard domestic logistics terms."
        ),
        SupplierContract(
            id="SC04", supplier_id="S04", component_id="C03", plant_id="P02",
            unit_cost=85.0, currency="USD",
            effective_date=datetime.datetime(2025, 1, 1),
            expiration_date=datetime.datetime(2026, 12, 31),
            terms="DDP Detroit Warehouse, net 90. Contract specifies buyer is liable for any new import tariffs or Section 301 duties."
        ),
        SupplierContract(
            id="SC05", supplier_id="S05", component_id="C03", plant_id="P02",
            unit_cost=110.0, currency="USD",
            effective_date=datetime.datetime(2025, 4, 1),
            expiration_date=datetime.datetime(2027, 4, 30),
            terms="FOB Monterrey, net 45. Dual-source safety backup contract."
        ),
        SupplierContract(
            id="SC06", supplier_id="S01", component_id="C01", plant_id="P01",
            unit_cost=90.0, currency="USD",
            effective_date=datetime.datetime(2025, 1, 1),
            expiration_date=datetime.datetime(2026, 12, 31),
            terms="FOB Chaozhou, net 60. Legacy ECU contract."
        )
    ]
    db.add_all(contracts)
    
    # 7. Add Capacity
    capacities = [
        SupplierCapacity(id="CAP01", supplier_id="S01", component_id="C02", capacity_units_per_month=15000, lead_time_days=22, origin_country="China"),
        SupplierCapacity(id="CAP02", supplier_id="S02", component_id="C01", capacity_units_per_month=12000, lead_time_days=10, origin_country="Mexico"),
        SupplierCapacity(id="CAP03", supplier_id="S03", component_id="C02", capacity_units_per_month=8000, lead_time_days=5, origin_country="USA"),
        SupplierCapacity(id="CAP04", supplier_id="S04", component_id="C03", capacity_units_per_month=10000, lead_time_days=25, origin_country="China"),
        SupplierCapacity(id="CAP05", supplier_id="S05", component_id="C03", capacity_units_per_month=14000, lead_time_days=8, origin_country="Mexico"),
        SupplierCapacity(id="CAP06", supplier_id="S01", component_id="C01", capacity_units_per_month=5000, lead_time_days=22, origin_country="China")
    ]
    db.add_all(capacities)
    
    # 8. Add Orders & Shipments
    orders = [
        Order(id="O01", supplier_id="S01", component_id="C02", plant_id="P01", quantity=5000, unit_price=45.0, status="SHIPPED", order_date=datetime.datetime.utcnow() - datetime.timedelta(days=5)),
        Order(id="O02", supplier_id="S02", component_id="C01", plant_id="P01", quantity=3000, unit_price=120.0, status="DELIVERED", order_date=datetime.datetime.utcnow() - datetime.timedelta(days=3)),
        Order(id="O03", supplier_id="S04", component_id="C03", plant_id="P02", quantity=4000, unit_price=85.0, status="SHIPPED", order_date=datetime.datetime.utcnow() - datetime.timedelta(days=10))
    ]
    db.add_all(orders)
    db.commit()
    
    shipments = [
        Shipment(id="SH01", order_id="O01", route_id="R01", status="IN_TRANSIT", eta=datetime.datetime.utcnow() + datetime.timedelta(days=17)),
        Shipment(id="SH02", order_id="O03", route_id="R04", status="IN_TRANSIT", eta=datetime.datetime.utcnow() + datetime.timedelta(days=15))
    ]
    db.add_all(shipments)
    db.commit()

# DB Query Functions
def get_supplier_contracts(db: Session, supplier_id: str):
    return db.query(SupplierContract).filter(SupplierContract.supplier_id == supplier_id).all()

def get_alternative_suppliers(db: Session, component_id: str, exclude_supplier_id: str):
    # Find all capacities that produce this component
    capacities = db.query(SupplierCapacity).filter(
        SupplierCapacity.component_id == component_id,
        SupplierCapacity.supplier_id != exclude_supplier_id
    ).all()
    
    alts = []
    for cap in capacities:
        # Get contract cost if exists, or default cost
        contract = db.query(SupplierContract).filter(
            SupplierContract.supplier_id == cap.supplier_id,
            SupplierContract.component_id == component_id
        ).first()
        
        unit_cost = contract.unit_cost if contract else 0.0
        alts.append({
            "supplier_id": cap.supplier_id,
            "supplier_name": cap.supplier.name,
            "country": cap.origin_country,
            "capacity": cap.capacity_units_per_month,
            "lead_time": cap.lead_time_days,
            "unit_cost": unit_cost,
            "reliability": cap.supplier.reliability
        })
    return alts
