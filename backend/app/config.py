from pydantic import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str = ""
    model: str = "gemma2-9b-it"
    database_url: str = "sqlite:///./crm.db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
