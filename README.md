# ResolveAI — Customer Complaint Management System

> **AI-powered Quality Management System (QMS) for intelligent customer complaint analysis and resolution.**

ResolveAI is a full-stack **AI-powered Customer Complaint Management System** that helps organizations record, analyze, prioritize, and resolve customer complaints efficiently.

It uses **LangGraph** for AI workflow orchestration and **Groq + Gemma 2 9B IT** for fast Generative AI inference.

---

## 🌐 Live Demo

- **Frontend:** https://resolveai-ccms.vercel.app
- **Backend API:** https://resolveai-xnzt.onrender.com
- **Swagger Docs:** https://resolveai-xnzt.onrender.com/docs
- **GitHub:** https://github.com/suniti1809/ResolveAI

---

## 🚀 Features

### 📋 Complaint Management
- Submit and manage customer complaints.
- Search and filter complaints.
- Filter by status and priority.
- Update complaint status and priority.
- Add resolution notes.
- View detailed complaint information.
- Dashboard statistics and pagination.

### 🤖 AI Complaint Analysis

Every complaint is automatically analyzed using **LangGraph + Groq**.

### 💬 AI Assistant

A multi-turn AI assistant helps support agents:

- Refine complaint descriptions.
- Analyze customer issues.
- Suggest possible root causes.
- Recommend resolution strategies.

```

### LangGraph Workflow

```text
                  Complaint
                     │
                     ▼
               ┌───────────┐
               │ Classify  │
               └─────┬─────┘
                     ▼
               ┌───────────┐
               │ Sentiment │
               └─────┬─────┘
                     ▼
               ┌───────────┐
               │  Summary  │
               └─────┬─────┘
                     ▼
               ┌───────────┐
               │  Action   │
               └─────┬─────┘
                     ▼
                   Result
```

---

## 🛠️ Tech Stack

**Frontend**
- React 19
- Vite
- Redux Toolkit
- Tailwind CSS
- Framer Motion
- Lucide React

**Backend**
- Python
- FastAPI
- SQLAlchemy
- SQLite
- aiosqlite
- Pydantic

**AI**
- LangGraph
- Groq SDK
- Gemma 2 9B IT

**Deployment**
- Vercel
- Render

---

## 🗂️ Project Structure

```text
ResolveAI/
│
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── graph.py
│   └── utils.py
│
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   │
│   ├── store/
│   │   ├── store.js
│   │   └── complaintSlice.js
│   │
│   └── components/
│       ├── IntakePanel.jsx
│       ├── LogForm.jsx
│       └── AIAssistant.jsx
│
├── vite.config.js
├── tailwind.config.js
├── package.json
├── requirements.txt
└── README.md
```

---

## 🔑 Environment Variables

### Backend `.env`

```env
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=sqlite+aiosqlite:///./qms_complaints.db
HOST=0.0.0.0
PORT=8000
```

### Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:8000
```

> Never commit your real API key to GitHub.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/complaints` | Create complaint + AI analysis |
| GET | `/api/complaints` | List complaints |
| GET | `/api/complaints/{id}` | Get complaint details |
| PATCH | `/api/complaints/{id}` | Update complaint |
| DELETE | `/api/complaints/{id}` | Delete complaint |
| POST | `/api/assistant/chat` | AI assistant |
| GET | `/api/stats` | Dashboard statistics |

---

## ⚡ Local Setup

### Clone Repository

```bash
git clone https://github.com/suniti1809/ResolveAI.git
cd ResolveAI
```

### Backend

```bash
python -m venv venv
```

**Windows:**

```bash
venv\Scripts\activate
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend: `http://localhost:8000`

Swagger: `http://localhost:8000/docs`

### Frontend

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`

---

## 🎯 Use Cases

ResolveAI can help:

- Customer support teams
- Quality assurance teams
- E-commerce businesses
- SaaS companies
- Manufacturing organizations
- Service-based organizations

---

## 🚀 Future Scope

- User authentication and role-based access
- Email notifications
- Advanced analytics
- Semantic complaint search
- RAG-based knowledge assistance
- PostgreSQL database
- Multilingual complaint analysis
- SLA monitoring and escalation
- Automated QMS reports

---

## 👩‍💻 Author

**Suniti**

GitHub: https://github.com/suniti1809

---

## ⭐ Summary

ResolveAI combines **Generative AI, LangGraph, Groq, FastAPI, React, and SQLite** to provide an intelligent solution for customer complaint management.

> **Built as an AI-powered QMS showcasing the practical integration of Generative AI into customer complaint analysis and resolution.**
