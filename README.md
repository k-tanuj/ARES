# ARES — Autonomous Resilience & Enterprise Supply Chain

ARES is a working full-stack prototype of an agentic AI supply-chain resilience platform. It retrieves live tariff data from USITC, maps affected automotive components and suppliers using a structured SQLite enterprise database, executes a LangGraph multi-agent analysis pipeline, generates ranked trade mitigation scenarios, and provides a dual-perspective (manufacturer vs. supplier) web-based mission control center.

## Project Structure

- `backend/`: FastAPI backend containing database models, schemas, live USITC adapters, and LangGraph agent workflow graph.
- `frontend/`: React + Vite + TypeScript + Tailwind CSS application containing interactive dashboards, supply chain flow charts (React Flow), scenario workspaces, and supplier parameter adjustments portals.

---

## Installation & Setup

### 1. Environment Configuration

Create a `.env` file in the root workspace directory:
```ini
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=sqlite:///./ares.db
```

### 2. Backend Installation

Install Python dependencies:
```bash
pip install -r backend/requirements.txt
```

### 3. Frontend Installation

Install Node packages:
```bash
cd frontend
npm install
```

---

## Running the Prototype

### 1. Launch FastAPI Backend

Run from the root workspace directory:
```bash
uvicorn backend.app.main:app --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### 2. Launch React Frontend

Run from the `frontend/` directory:
```bash
npm run dev
```
- Client Portal: `http://localhost:5173/`

---

## Demonstration Workflow

1. **Launch Mission Control:** Open `http://localhost:5173/` in your browser.
2. **Search Tariffs Live:** In the search input, query `8544` (or `8507` / `aluminum`) to retrieve live customs rates and footnote descriptions from the official USITC database.
3. **Execute LangGraph Engine:** Click "Run Analysis" on a search result to trigger the ARES LangGraph workflow. Watch the agent statuses execute (`PROCESSING` -> `COMPLETED`).
4. **Inspect Strategic Scenarios:** Navigate to the Scenarios tab to compare *Absorb*, *Switch*, and *Split Sourcing* strategies on Recharts cost-speed charts.
5. **Approve Mitigation Plan:** Go to the Decisions tab and click "APPROVE PLAN" to generate the simulated sourcing tasks and log to the Audit Trail.
6. **Simulate Supplier response:** Open the Suppliers portal, choose a supplier, modify operational values (e.g., increase Mexican capacity or shift sourcing origin to Mexico), save, and see cost exposures adjust instantly.
