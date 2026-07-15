from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.interaction import router as interaction_router
from .api.hcp import router as hcp_router
from .api.agent import router as agent_router
from .config import settings

app = FastAPI(title="AI CRM", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interaction_router, prefix="/api", tags=["interactions"])
app.include_router(hcp_router, prefix="/api", tags=["hcps"])
app.include_router(agent_router, prefix="/api", tags=["agent"])


@app.get("/")
async def root():
    return {"message": "Backend Running 🚀"}


@app.get("/health")
async def health():
    return {"status": "ok"}
