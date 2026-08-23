from typing import List, Dict, Any, Optional
import datetime
from backend.app.integrations.tariffs.base import TariffSource
from backend.app.integrations.tariffs.registry import register_source

class WTOTariffSource(TariffSource):
    
    def get_recent_tariff_events(self, query: str) -> List[Dict[str, Any]]:
        raise RuntimeError("WTO official tariff database connection unavailable.")

    def get_tariff(self, origin: str, destination: str, hs_code: str) -> Optional[Dict[str, Any]]:
        return None

    def get_source_metadata(self) -> Dict[str, Any]:
        return {
            "source": "WTO",
            "type": "official",
            "status": "disconnected",
            "last_updated": None,
            "coverage": "Global WTO tariff profiles"
        }

# Register the source
register_source("WTO", WTOTariffSource())
