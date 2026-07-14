from .typing import Any


class AgentState:
    def __init__(self):
        self.history = []

    def add(self, action: str):
        self.history.append(action)
