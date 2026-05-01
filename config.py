"""
FHIRBridge MCP — Configuration & Settings
Centralised pydantic-settings model for env-var management.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    # FHIR server
    fhir_base_url: str = Field("https://hapi.fhir.org/baseR4", alias="FHIR_BASE_URL")
    fhir_auth_type: str = Field("none", alias="FHIR_AUTH_TYPE")   # none | bearer | smart

    # SMART on FHIR
    smart_client_id: str = Field("", alias="SMART_CLIENT_ID")
    smart_client_secret: str = Field("", alias="SMART_CLIENT_SECRET")
    smart_token_url: str = Field("", alias="SMART_TOKEN_URL")

    # Static bearer
    fhir_bearer_token: str = Field("", alias="FHIR_BEARER_TOKEN")

    # Anthropic
    anthropic_api_key: str = Field("", alias="ANTHROPIC_API_KEY")
    claude_model: str = Field("claude-sonnet-4-5", alias="CLAUDE_MODEL")

    # Server
    host: str = Field("0.0.0.0", alias="HOST")
    port: int = Field(8000, alias="PORT")
    log_level: str = Field("info", alias="LOG_LEVEL")

    # Cache
    cache_ttl: int = Field(300, alias="CACHE_TTL")

    model_config = {"env_file": ".env", "populate_by_name": True}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
