# UIUC Semester Planner

This app is an academic semester planner for UIUC that generates personalized, feasible semester‑by‑semester course plans by reconciling degree requirements, prerequisites, completed coursework, and student constraints; typical use cases include students exploring degree progress and what‑if scenarios, advisors streamlining planning conversations and verifying plan feasibility, and career services mapping skills to course pathways to recommend targeted coursework for specific career outcomes.

<strong>Website:</strong> https://uiuc-semester-planner.onrender.com/

<strong>API:</strong> https://uiucsemesterplanner.onrender.com/docs

## Tech Stack

### Backend

<p align="left">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat&logo=python&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white" />
  <img alt="Pydantic" src="https://img.shields.io/badge/Pydantic-v2-E92063?style=flat&logo=pydantic&logoColor=white" />
  <img alt="PyMongo" src="https://img.shields.io/badge/PyMongo-4.x-47A248?style=flat&logo=mongodb&logoColor=white" />
  <img alt="Firebase Admin" src="https://img.shields.io/badge/Firebase%20Admin-6.x-FFCA28?style=flat&logo=firebase&logoColor=black" />
  <img alt="Gunicorn" src="https://img.shields.io/badge/Gunicorn-21.x-2AAB6D?style=flat&logo=gunicorn&logoColor=white" />
  <img alt="Uvicorn" src="https://img.shields.io/badge/Uvicorn-121011?style=flat&logo=uvicorn&logoColor=white" />
</p>

### Frontend

<p align="left">
  <img alt="React" src="https://img.shields.io/badge/React-19-20232A?style=flat&logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=flat&logo=vite&logoColor=white" />
  <img alt="React Router" src="https://img.shields.io/badge/React%20Router-7-CA4245?style=flat&logo=reactrouter&logoColor=white" />
  <img alt="Firebase Web" src="https://img.shields.io/badge/Firebase%20Web-12.x-FFCA28?style=flat&logo=firebase&logoColor=black" />
</p>

### Database

<p align="left">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas%20%7C%20Local-47A248?style=flat&logo=mongodb&logoColor=white" />
</p>

### Deployment / Tooling

<p align="left">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat&logo=nodedotjs&logoColor=white" />
  <img alt="Render" src="https://img.shields.io/badge/Render-Cloud-46E3B7?style=flat&logo=render&logoColor=black" />
</p>

### Data / AI (scripts)

<p align="left">
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-GPT--5--mini-412991?style=flat&logo=openai&logoColor=white" />
</p>

## Repository Structure

- `back-end/` — FastAPI app (`main.py`, `app/` modules, `requirements.txt`)
- `front-end/` — React + Vite app (`src/`, `package.json`)
- `data/` — Raw/processed datasets and helper scripts under `data/db_scripts/`
- `env.example` — Example environment config (copy to `.env`)
- `render.yaml` — Render deployment configuration

## Prerequisites

- Python 3.10+ (3.11 recommended)
- Node.js 18+ (20+ recommended)
- MongoDB connection string (Atlas or local)
- Firebase project (Web App) for frontend auth

## Environment Variables

Copy the example and fill in values:

macOS/Linux (bash)

```bash
cp env.example .env
```

Windows (PowerShell)

```powershell
Copy-Item env.example .env
```

Key variables (see `env.example` for full list):

- Backend
  - `SERVER_HOST` (default `0.0.0.0`)
  - `SERVER_PORT` or `PORT` (default `8000`)
  - `DEBUG` (`True`/`False`)
  - `MONGODB_URL` (e.g., `mongodb://localhost:27017` or Atlas URI)
  - `MONGODB_DB_NAME` (default `semester_planner`)
  - `CORS_ORIGINS` (comma‑separated, include your Vite dev origin: `http://localhost:5173`)
  - `FIREBASE_CREDENTIALS_PATH` (backend only if you later add server‑side Firebase)
- Frontend (Vite reads from repo root via `envDir`)
  - `VITE_API_BASE_URL` (e.g., `http://localhost:8000/api/v1`)
  - `VITE_FIREBASE_*` (standard Firebase Web SDK fields)

## Local Development

### 1) Backend (FastAPI)

macOS/Linux (bash)

```bash
cd back-end
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Option A: run via Python (uses settings from .env)
python main.py

# Option B: run via uvicorn directly
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Windows (PowerShell)

```powershell
cd back-end
py -3 -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Option A: run via Python (uses settings from .env)
python .\main.py

# Option B: run via uvicorn directly
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check and docs:

- `http://localhost:8000/health`
- `http://localhost:8000/docs` (Swagger UI)
- `http://localhost:8000/redoc`

### 2) Frontend (React + Vite)

macOS/Linux (bash)

```bash
cd front-end
npm install
npm run dev
```

Windows (PowerShell)

```powershell
cd front-end
npm install
npm run dev
```

Vite dev server runs on `http://localhost:5173`. Ensure `VITE_API_BASE_URL` in `.env` points to the backend (e.g., `http://localhost:8000/api/v1`).

## Seeding the Database (optional)

Collections expected by the API:

- `courses`
- `career_paths`
- `tagged_courses`

Helpful scripts live in `data/db_scripts/`:

- `db_import.py` — imports courses from `data/processed/uiuc_courses_flatten.json` into the `courses` collection.
- `generate_pathways.py` — tags courses with skills and generates career pathways using OpenAI (requires `OPENAI_API_KEY`).

Notes:

- `db_import.py` reads `MONGODB_URL` and `MONGODB_DB_NAME` from your root `.env`. Ensure these are set, then run the script.
- The app defaults to the database name in `MONGODB_DB_NAME` (e.g., `semester_planner`). Keep it consistent between import and API usage.

Example (run from repo root):

macOS/Linux (bash)

```bash
# Import courses (uses MONGODB_URL and MONGODB_DB_NAME from .env)
python data/db_scripts/db_import.py

# Generate tagged courses + career pathways (requires OPENAI_API_KEY)
export OPENAI_API_KEY="<your key>"
python data/db_scripts/generate_pathways.py
```

Windows (PowerShell)

```powershell
# Import courses (uses MONGODB_URL and MONGODB_DB_NAME from .env)
py -3 data\db_scripts\db_import.py

# Generate tagged courses + career pathways (requires OPENAI_API_KEY)
$env:OPENAI_API_KEY = "<your key>"; py -3 data\db_scripts\generate_pathways.py
```

## API Summary

All endpoints are prefixed with `/api/v1`.

- `GET /courses` — list courses with filters: `department`, `semester`, `gen_ed`, `credit_hours`, `min_rating`, `max_difficulty`, paging `page`, `limit`
- `GET /courses/search?q=...&skills=a,b` — search by course prefix and/or skills
- `GET /courses/{courseId}` — course details
- `GET /courses/{courseId}/prerequisites` — prerequisite summary
- `GET /courses/{courseId}/instructors?sort_by=rating|difficulty|avg_gpa`
- `GET /pathways` — list career pathways
- `GET /pathways/{pathwayId}` — pathway details
- `GET /pathways/{pathwayId}/courses?type=core|recommended|optional|all&include_details=false`
- `POST /pathways/{pathwayId}/recommend` — body: `{ completed_courses: string[], current_semester: string, credits_per_semester?: number, preferences?: object }`
- `GET /tagged-courses?skills=a,b&page=1&limit=20` — list tagged courses
- `GET /tagged-courses/{courseId}` — tags for a course

## Authentication

- Frontend uses Firebase Web SDK (`src/firebase.ts`). Provide the `VITE_FIREBASE_*` values from your Firebase project.
- The backend does not enforce Firebase auth by default. If you plan to add protected API routes, configure verification middleware and set `FIREBASE_CREDENTIALS_PATH` for server credentials.

## CORS

Set `CORS_ORIGINS` in `.env` to include your frontend origin(s), e.g. `http://localhost:5173`. The backend reads this on startup.

## Deployment

- Render: `render.yaml` contains a service definition. Set the same environment variables on Render (including `VITE_*` for static hosting) and provide a MongoDB URI.

## Troubleshooting

- 404s or empty results: verify MongoDB has the `courses`, `career_paths`, and `tagged_courses` collections populated.
- CORS errors: ensure frontend origin is included in `CORS_ORIGINS`.
- Frontend cannot reach API: confirm `VITE_API_BASE_URL` and backend port; restart `npm run dev` after changing `.env`.
