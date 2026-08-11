# ResolveAI — Customer Complaint Management System

> **AI-powered Quality Management System (QMS) for intelligent customer complaint analysis, classification, and resolution.**

ResolveAI is a full-stack AI-powered Customer Complaint Management System designed to help organizations efficiently record, analyze, prioritize, and resolve customer complaints.

The system uses **LangGraph** to orchestrate a multi-step AI analysis pipeline and **Groq** for fast LLM inference. Complaints are automatically classified, analyzed for sentiment and urgency, summarized, and provided with recommended resolution actions.

---

## 🌐 Live Demos

- **Frontend App (Vercel):** [resolveai-ccms.vercel.app](https://resolveai-ccms.vercel.app)
- **Backend API (Render):** [resolveai-xnzt.onrender.com](https://resolveai-xnzt.onrender.com)
- **Interactive API Documentation (Swagger UI):** [resolveai-xnzt.onrender.com/docs](https://resolveai-xnzt.onrender.com/docs)

---

## 🚀 Features

### 📋 Complaint Management
- Create and submit customer complaints with instant AI processing.
- View, search, and filter complaints by status (`Open`, `In Progress`, `Resolved`, `Closed`) or priority (`Low`, `Medium`, `High`, `Critical`).
- View detailed AI analysis cards, root causes, and executive summaries.
- Update complaint status, add resolution notes, and delete records.
- Real-time dashboard refresh and pagination support.

### 🤖 AI-Powered Complaint Analysis
Every newly submitted complaint is automatically processed through an AI pipeline powered by **LangGraph** & **Groq**.

The AI automatically determines:
- **Category & Priority Level:** Auto-assigns classification and severity.
- **Sentiment & Urgency Scoring:** Evaluates customer tone and urgency on a 1–10 scale.
- **Root Cause Analysis:** Pinpoints the core underlying failure.
- **Executive Summary & Actionable Recommendations:** Generates concise summaries and step-by-step resolution actions for support agents.

### 💬 Multi-Turn AI Assistant
Integrated directly into the complaint intake workflow, the AI assistant enables support agents to:
- Interactively chat about incoming customer complaints.
- Refine problem descriptions before submitting.
- Ask for resolution strategies or root cause suggestions.

### 📊 Dashboard Statistics
Real-time operational metrics tracking:
- Total complaints count
- Open vs. Resolved status breakdown
- High-priority and critical issue flags

---

## 🧠 AI Pipeline Architecture

ResolveAI uses **LangGraph** to construct a directed, multi-step AI processing pipeline. Each incoming complaint flows sequentially through four specialized nodes:

```text
                  New Customer Complaint
                            │
                            ▼
                      ┌───────────┐
                      │  Classify │  ──► Category, Priority, Root Cause
                      └─────┬─────┘
                            │
                            ▼
                      ┌───────────┐
                      │ Sentiment │  ──► Sentiment & Urgency Score (1–10)
                      └─────┬─────┘
                            │
                            ▼
                      ┌───────────┐
                      │  Summary  │  ──► Executive Summary (2–3 sentences)
                      └─────┬─────┘
                            │
                            ▼
                      ┌───────────┐
                      │   Action  │  ──► Step-by-Step Resolution Steps
                      └─────┬─────┘
                            │
                            ▼
                   AI Analysis Result
---
## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Redux Toolkit, Tailwind CSS v3, Framer Motion, Lucide Icons, React Hot Toast
- **Backend:** Python, FastAPI, Async SQLAlchemy, SQLite (aiosqlite), Pydantic v2
- **AI Engine:** LangGraph (Workflow Orchestration), Groq SDK (LLM Inference), Gemma 2 9B IT
- **Deployment:** Vercel (Frontend), Render (Backend)

---

## 🏗️ Project Structure

```text
ResolveAI/
├── app/                      # Backend (FastAPI + LangGraph)
│   ├── __init__.py
│   ├── main.py               # FastAPI server entry point & CORS
│   ├── database.py           # Async SQLAlchemy session setup
│   ├── models.py             # Database schemas (Complaint, AIAnalysis)
│   ├── schemas.py            # Pydantic request/response models
│   ├── graph.py              # LangGraph AI processing pipeline
│   └── utils.py              # Helper functions
├── src/                      # Frontend (React + Vite + Redux)
│   ├── main.jsx              # React app entry point
│   ├── App.jsx               # Dashboard UI & table view
│   ├── index.css             # Glassmorphism & custom styling
│   ├── store/
│   │   ├── store.js          # Redux Toolkit store configuration
│   │   └── complaintSlice.js # Async thunks for API requests
│   └── components/
│       ├── IntakePanel.jsx   # Two-column complaint intake shell
│       ├── LogForm.jsx       # Complaint submission form
│       └── AIAssistant.jsx   # Interactive AI chat assistant
├── vite.config.js            # Vite configuration & dev proxy
├── tailwind.config.js        # Tailwind CSS configuration
└── requirements.txt          # Python dependencies
---
## 🔑 Environment Variables
### Backend (`.env`)
```env
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=sqlite+aiosqlite:///./qms_complaints.db
HOST=0.0.0.0
PORT=8000
Frontend (.env or Vercel Environment Variables)Code snippetVITE_API_BASE_URL=[https://resolveai-xnzt.onrender.com](https://resolveai-xnzt.onrender.com)
🔌 API EndpointsMethodEndpointDescriptionGET/healthServer health checkPOST/api/complaintsSubmit new complaint and trigger automatic AI analysisGET/api/complaintsList complaints with status/priority filtering and paginationGET/api/complaints/{id}Retrieve details and AI analysis for a single complaintPATCH/api/complaints/{id}Update complaint status, priority, or resolution noteDELETE/api/complaints/{id}Delete a complaint recordPOST/api/assistant/chatMulti-turn chat with the intake AI assistantGET/api/statsRetrieve real-time dashboard analytics⚡ Local Setup1. Clone the RepositoryBashgit clone [https://github.com/suniti1809/ResolveAI.git](https://github.com/suniti1809/ResolveAI.git)
cd ResolveAI
2. Backend SetupBash# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
---
# Install dependencies
pip install -r requirements.txt
---
# Start backend server
uvicorn app.main:app --reload --port 8000
Backend API will be available at http://localhost:8000 (Swagger docs at http://localhost:8000/docs).3. Frontend SetupBash# Install NPM dependencies
npm install
---
# Start Vite development server
npm run dev
Frontend will be available at http://localhost:5173.
---
👩‍💻 AuthorSuniti
GitHub: @suniti1809
Built as an AI-powered Quality Management System showcasing the integration of Generative AI, LangGraph, FastAPI, and React.
