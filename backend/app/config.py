from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openrouter_api_key: str = ""
    openrouter_model: str = "sourceful/riverflow-v2-fast"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    classifier_model_path: str = "models/phi-3-mini-4k-instruct.Q4_K_M.gguf"
    classifier_threads: int = 4
    allowed_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
