from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from backend.app.database.session import Base, engine, SessionLocal
from backend.app.services.db_service import seed_db
from backend.app.api.router import router as api_router
from backend.app.core.config import settings

# Create all database tables
Base.metadata.create_all(bind=engine)

# Seed database on startup
db = SessionLocal()
try:
    seed_db(db)
finally:
    db.close()

# Initialize FastAPI App
app = FastAPI(
    title="ARES Backend — Autonomous Resilience Engine for Supply Chains",
    description="Full-stack monorepo prototype for managing global trade remedies and supply chain impacts.",
    version="1.0.0"
)

# Configure CORS for React client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to React dev server origins (e.g. localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(api_router, prefix="/api")

# Serve React App (if built)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend_dist")

if os.path.exists(frontend_dist):
    # Mount assets (Vite puts JS/CSS here)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    # Catch-all route to serve index.html for React Router
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "Welcome to ARES Supply Chain Resilience Engine API Gateway. View docs at /docs"}
