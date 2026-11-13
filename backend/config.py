"""
Configuración global de la aplicación basada en Pydantic Settings.
Lee las variables de entorno desde el archivo .env (base de datos, JWT y Gemini API).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Mapea y valida las variables de configuración del sistema."""
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    #========================================================================
    # db
    #========================================================================
    db_host: str = ""
    db_port: int = 3306
    db_user: str = ""
    db_password: str = ""
    db_name: str = ""

    #========================================================================
    # Token
    #========================================================================
    secret_key: str = ""
    algorithm: str = ""
    access_token_expire_minutes: int = 60

    #========================================================================
    # API Gemini
    #========================================================================

    api_key: str = ""

    #========================================================================
    # Cores origins
    #========================================================================

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    
    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://"
            f"{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}"
            f"/{self.db_name}"
        )

settings = Settings()