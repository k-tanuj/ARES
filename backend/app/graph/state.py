from typing import TypedDict, List, Dict, Any, Optional

class ARESState(TypedDict):
    event_id: str
    tariff_event: Dict[str, Any]
    affected_components: List[Dict[str, Any]]
    affected_suppliers: List[Dict[str, Any]]
    affected_plants: List[Dict[str, Any]]
    
    # Node outputs
    supplier_analysis: List[Dict[str, Any]]
    manufacturer_analysis: Dict[str, Any]
    inventory_analysis: Dict[str, Any]
    logistics_analysis: Dict[str, Any]
    financial_analysis: Dict[str, Any]
    compliance_analysis: Dict[str, Any]
    
    scenarios: List[Dict[str, Any]]
    recommendation: Dict[str, Any]
    
    # Logs & Audit
    audit_trail: List[Dict[str, Any]]
    agent_logs: List[Dict[str, Any]]
    
    # Internal flow
    current_agent: Optional[str]
    error: Optional[str]
