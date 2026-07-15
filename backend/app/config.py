import os
from pydantic_settings import BaseSettings

# Force SQLite for local development
os.environ["DATABASE_URL"] = "sqlite:///./crm.db"


class Settings(BaseSettings):
    groq_api_key: str = ""
    model: str = "llama-3.3-70b-versatile"
    database_url: str = "sqlite:///./crm.db"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
