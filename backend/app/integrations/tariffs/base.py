from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime

class TariffSource(ABC):
    
    @abstractmethod
    def get_recent_tariff_events(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for tariff changes matching the query/keyword.
        """
        pass
        
    @abstractmethod
    def get_tariff(self, origin: str, destination: str, hs_code: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve rate and footnotes for a specific origin/destination/HS code.
        """
        pass
        
    @abstractmethod
    def get_source_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about this source (connected status, description, coverage, etc.).
        """
        pass
