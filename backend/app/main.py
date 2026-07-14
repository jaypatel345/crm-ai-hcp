from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.interaction import router as interaction_router
from .config import settings

app = FastAPI(title="AI CRM", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interaction_router, prefix="/api", tags=["interactions"])


@app.get("/")
async def root():
    return {"message": "Backend Running 🚀"}


@app.get("/health")
async def health():
    return {"status": "ok"}
