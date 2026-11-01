# 🎯 JobQuest

### Your next career quest starts here.

JobQuest is an AI-powered job discovery and career assistant that analyzes resumes, understands candidate preferences, and discovers relevant job opportunities through an automated agentic pipeline.

Instead of manually searching through hundreds of listings, JobQuest uses resume intelligence and AI-powered job discovery to help candidates find opportunities aligned with their skills and career preferences.

---

## ✨ Features

### 📄 Resume Intelligence
- Upload resumes in PDF format.
- Extract technical skills, education, and work experience.
- Process resume content using an AI-powered extraction service.
- Store structured candidate information in PostgreSQL.

### 🤖 AI-Powered Job Discovery
- Uses Google ADK and Groq-powered agents.
- Generates job search queries based on candidate preferences.
- Retrieves live job listings through the JSearch API.
- Processes and stores discovered opportunities.

### 🎯 Personalized Job Search
- Save candidate preferences.
- Trigger job discovery based on selected preferences.
- Retrieve discovered jobs associated with a resume.
- View job titles, companies, locations, and application links.

### ⭐ Watchlist
- Save interesting job opportunities.
- Retrieve and manage saved jobs.

### 🖥️ Interactive Dashboard
- React and TypeScript frontend.
- Dashboard navigation for Jobs, Watchlist, Drafts, and History.
- Real-time backend communication through REST APIs.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| AI Agents | Google ADK |
| LLM Provider | Groq |
| Job Search API | JSearch (RapidAPI) |
| Resume Processing | PyMuPDF |
| Containerization | Docker, Docker Compose |
| Communication | REST API, WebSockets |

---

## 🏗️ Architecture

JobQuest follows a modular, multi-service architecture.

```text
                 ┌──────────────────────┐
                 │    React Frontend    │
                 │   TypeScript + Vite  │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │    FastAPI Backend   │
                 │  REST API + WebSocket│
                 └──────────┬───────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │  Resume    │ │    Job     │ │ PostgreSQL │
       │ Extractor  │ │ Discovery  │ │  Database  │
       │   Agent    │ │   Agent    │ │            │
       └────────────┘ └─────┬──────┘ └────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  JSearch API    │
                  │  (RapidAPI)     │
                  └─────────────────┘
```

---

## 📁 Project Structure

```text
JobQuest/
│
├── agent/
│   ├── extractor.py
│   ├── job_discovery.py
│   ├── job_discovery_lever.py
│   ├── job_search_agent.py
│   ├── email_drafter.py
│   ├── excel_agent.py
│   └── poc_finder.py
│
├── api/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   └── resume_parser.py
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── mcp-servers/
│
├── scheduler/
│
├── scripts/
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── schema.sql
└── .env.example
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

- Docker Desktop
- Git
- API credentials for the required external services

### 1. Clone the repository

```bash
git clone https://github.com/Sceptile36/JobQuest.git
cd JobQuest
```

### 2. Configure environment variables

Create your local environment file:

```bash
copy .env.example .env
```

Open `.env` and configure the required credentials and database settings.

Required external integrations include:

- Groq API
- RapidAPI JSearch
- Google API credentials, where required by the extractor configuration

Never commit your `.env` file or expose API credentials publicly.

### 3. Start the application

Build and start the services:

```bash
docker compose up --build
```

### 4. Access the application

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| FastAPI Backend | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |

---

## 🔄 Current Workflow

1. Upload your resume.
2. The extractor service processes the resume.
3. Candidate information is stored in PostgreSQL.
4. Select your job preferences.
5. The job discovery agent generates relevant search queries.
6. JSearch retrieves live job listings.
7. Discovered jobs are synchronized with PostgreSQL.
8. Browse opportunities through the Jobs dashboard.
9. Save interesting opportunities to your Watchlist.

---

## 🗺️ Roadmap

JobQuest is actively being developed.

- [x] Resume upload and extraction
- [x] Candidate preference management
- [x] AI-powered job discovery pipeline
- [x] JSearch API integration
- [x] PostgreSQL job storage
- [x] Jobs dashboard integration
- [x] Watchlist API integration
- [ ] Intelligent job relevance scoring
- [ ] Automated job application tracking
- [ ] AI-generated application emails
- [ ] Company contact discovery
- [ ] Automated Greenhouse and Lever job scanning
- [ ] Functional real-time application draft delivery
- [ ] Career analytics and progress tracking

---

## 🔐 Security

- Environment variables are used for API credentials.
- Local environment files are excluded through `.gitignore`.
- API credentials should never be committed to version control.
- Resume data should be handled securely.

---

## 👨‍💻 About

JobQuest is an independent project focused on exploring AI agents, resume intelligence, automated job discovery, and full-stack application development.

Built using Python, FastAPI, React, PostgreSQL, and modern AI technologies.

**Find your next opportunity. Complete your next quest.** 🎯
