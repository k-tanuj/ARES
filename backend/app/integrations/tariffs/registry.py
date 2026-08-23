from typing import Dict, List, Any
from backend.app.integrations.tariffs.base import TariffSource

_registry: Dict[str, TariffSource] = {}

def register_source(name: str, source: TariffSource):
    _registry[name.lower()] = source

# Import sources to trigger registration
import backend.app.integrations.tariffs.usitc
import backend.app.integrations.tariffs.wto
import backend.app.integrations.tariffs.eu_taric

def get_source(name: str) -> TariffSource:
    name_lower = name.lower()
    if name_lower not in _registry:
        raise ValueError(f"Tariff source '{name}' is not registered.")
    return _registry[name_lower]

def list_sources() -> List[Dict[str, Any]]:
    sources_meta = []
    for name, source in _registry.items():
        meta = source.get_source_metadata()
        meta["id"] = name
        sources_meta.append(meta)
    return sources_meta
