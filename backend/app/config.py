from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os
from typing import List
import json
from functools import lru_cache

load_dotenv()

class Settings(BaseSettings):
    # Database settings
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    postgres_user: str = "postgres"
    postgres_password: str = ""

    # JWT settings
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # TMDB settings
    tmdb_api_key: str = os.getenv("TMDB_API_KEY")
    tmdb_access_token: str = os.getenv("TMDB_ACCESS_TOKEN")
    tmdb_base_url: str = os.getenv("TMDB_BASE_URL", "https://api.themoviedb.org/3")

    # CORS settings
    cors_origins: List[str] = []
    frontend_url: str = "http://127.0.0.1:5500"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str):
            if field_name == "cors_origins":
                try:
                    return json.loads(raw_val)
                except json.JSONDecodeError:
                    return [x.strip() for x in raw_val.strip('[]').split(',')]
            return raw_val

    @property
    def database_url_with_credentials(self) -> str:
        """Get database URL with credentials if using PostgreSQL"""
        if self.database_url.startswith("postgresql"):
            return f"postgresql://{self.postgres_user}:{self.postgres_password}@localhost/moviedb"
        return self.database_url

@lru_cache()
def get_settings():
    return Settings()

# Create settings instance
settings = get_settings()

# Export constants for direct import
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
DATABASE_URL = settings.database_url_with_credentials  # Use the property
TMDB_API_KEY = settings.tmdb_api_key
TMDB_ACCESS_TOKEN = settings.tmdb_access_token
TMDB_BASE_URL = settings.tmdb_base_url
CORS_ORIGINS = settings.cors_origins
FRONTEND_URL = settings.frontend_url