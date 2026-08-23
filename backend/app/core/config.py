import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # Gemini Configuration
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    
    # Database Configuration
    database_url: str = Field(default="sqlite:///./ares.db", alias="DATABASE_URL")
    
    # Decision Engine Weights
    cost_weight: float = Field(default=0.2, alias="COST_WEIGHT")
    risk_weight: float = Field(default=0.2, alias="RISK_WEIGHT")
    continuity_weight: float = Field(default=0.4, alias="CONTINUITY_WEIGHT")
    time_weight: float = Field(default=0.2, alias="TIME_WEIGHT")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
