from .typing import Any


class LLMService:
    def __init__(self, model: str):
        self.model = model

    def generate(self, prompt: str) -> str:
        return f"[Simulated {self.model} response] {prompt}"
