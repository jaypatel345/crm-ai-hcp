# CRM AI HCP

Fullstack scaffold for an AI-enabled CRM for HCPs.

## Architecture

- `frontend/` — React + Redux + Vite + Tailwind
- `backend/` — FastAPI + SQLAlchemy + LangGraph / LangChain

## Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Notes

- `frontend/src/api/api.js` points to `http://localhost:8000`
- `backend/.env` contains environment variables and database URL
