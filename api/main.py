from fastapi import FastAPI, UploadFile, Form, File, HTTPException, Response, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, Optional, List
import fitz  # PyMuPDF
from uuid import UUID
import psycopg2
from psycopg2.extras import register_uuid, Json
import os
import sys
from dotenv import load_dotenv
from pathlib import Path
import httpx

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 2. Import your job search agent runner
from agent.job_discovery import run_personalized_discovery
from agent.email_drafter import generate_email_draft

BASE_DIR = Path(__file__).resolve().parent.parent

dotenv_path = BASE_DIR / ".env"

load_dotenv(dotenv_path=dotenv_path, override=True)

register_uuid()

app = FastAPI(
    title="Resume Parser & Storage API",
    description="Multi-step async pipeline optimized for PostgreSQL JSONB architecture.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)  


AGENT_API_URL = os.getenv("AGENT_API_URL", "http://extractor-agent:8005/extract-agent")

DB_CONFIG = {
    "dbname": os.getenv("POSTGRES_DB", "job_search_db"),
    "user": os.getenv("POSTGRES_USER", "postgres_admin"),
    "password": os.getenv("POSTGRES_PASSWORD"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432")
}

def get_db_connection():
    try:
        return psycopg2.connect(**DB_CONFIG)
    except psycopg2.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

class UserCreatePayload(BaseModel):
    name: str
    email: str


class AgentCallbackPayload(BaseModel):
    resume_id: UUID
    experience: List[Dict[str, Any]]
    skills: Dict[str, Any]
    education: List[Dict[str, Any]]
    preferences: Optional[Dict[str, Any]] = None

class AgentRequestPayload(BaseModel):
    text: str

class RejectDraftPayload(BaseModel):
    feedback: str

@app.get("/")
def read_root():
    return {"message": "Resume Parser Pipeline Running"}


@app.post("/users")
def create_user(payload: UserCreatePayload):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (name, email)
                VALUES (%s, %s)
                ON CONFLICT (email)
                DO UPDATE SET name = EXCLUDED.name
                RETURNING id, name, email, created_at;
                """,
                (payload.name, payload.email)
            )
            row = cursor.fetchone()
        conn.commit()

    return {
        "id": row[0],
        "name": row[1],
        "email": row[2],
        "created_at": row[3],
    }




@app.post("/resumes/upload")
async def upload_and_extract_resume(
    file: UploadFile = File(...), 
    user_id: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks() # 3. Injected background task queue
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are allowed.")
    
    try:
        # Step 1: Extract raw text from PDF
        pdf_data = await file.read()
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        raw_text = "".join([page.get_text() for page in doc])
        
        # Step 2: Insert initial placeholder into database
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                #WE REMOVED THIS AUTO PART SINCE WE DONT NEED AUTO USER ID. WE WILL BE USING THE USER ID PASSED IN THE FORM DATA 

                #import random
                #random_suffix = random.randint(1000, 9999)
                #cursor.execute(
                #    """
                #    INSERT INTO users (email) 
                #   VALUES (%s) 
                #    RETURNING id;
                #   """,
                #   (f"auto_user_{random_suffix}@example.com",)
                #)
                #auto_user_id = cursor.fetchone()[0]
                
                # FIX: Added 'raw_text' to satisfy the NULL constraint in models.py
                cursor.execute(
                    """
                    INSERT INTO resumes (user_id, filename, raw_text)
                    VALUES (%s, %s, %s)
                    RETURNING id, uploaded_at;
                    """,
                    (user_id, file.filename, raw_text)
                )
                db_row = cursor.fetchone()
                new_resume_id = db_row[0]
                uploaded_at = db_row[1]
            conn.commit()

        # Step 3: Call the Extraction Agent API
        async with httpx.AsyncClient() as client:
            try:
                agent_response = await client.post(
                    AGENT_API_URL,
                    json={"text": raw_text},
                    timeout=30.0
                )
                agent_response.raise_for_status()
                agent_data = agent_response.json()
            except httpx.HTTPStatusError as e:
                raise HTTPException(status_code=502, detail=f"Agent API error: {e.response.text}")
            except httpx.RequestError as e:
                raise HTTPException(status_code=503, detail=f"Agent API unreachable: {str(e)}")

        # Step 4: Map incoming data defensively to verify your JSONB keys align
        preferences_payload = agent_data.get("preferences", {})
        
        # If the extractor used different key names, map them securely here:
        final_preferences = {
            "target_roles": preferences_payload.get("target_roles", preferences_payload.get("job_title", [])),
            "locations": preferences_payload.get("locations", preferences_payload.get("location", [])),
            "salary": preferences_payload.get("salary", "Not Specified"),
            "industries": preferences_payload.get("industries", [])
        }

        # Step 5: Update database with final structured data
        print("UPDATE DB!")   
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE resumes 
                    SET 
                        experience = %s,
                        skills = %s,
                        education = %s,
                        preferences = %s
                    WHERE id = %s;
                    """,
                    (
                        Json(agent_data.get("work_history", [])),
                        Json(agent_data.get("skills", {})),
                        Json(agent_data.get("education_history", [])),
                        Json(final_preferences), # Using the mapped clean dictionary
                        new_resume_id
                    )
                )
            conn.commit()
            print("Updated!")

        # Step 6: Trigger the Job Search Agent in the background!
        # This will run as an isolated task while your API returns a 200 OK response immediately.
        
        ##claude chatgpt said to remove these lines to stop the agent from running the agent just after uploading resume. We will run the agent only when the user clicks on the "run agent" button in the frontend.
        # background_tasks.add_task(run_personalized_discovery, str(user_id), str(new_resume_id))
        # print(f"Job discovery agent dispatched in background for User ID: {user_id}")

        return {
            "message": "Resume processed and saved successfully! Discovery agent launched.",
            "resume_id": str(new_resume_id),
            "user_id": str(user_id),
            "filename": file.filename,
            "uploaded_at": uploaded_at,
            "extracted_data": agent_data 
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failure: {str(e)}")



class PreferencesPayload(BaseModel):
    field: str
    role: str
    salary: Optional[str] = None
    location: Optional[str] = None

@app.patch("/resumes/{resume_id}/preferences")
def update_preferences(
    resume_id: UUID,
    payload: PreferencesPayload,
    background_tasks: BackgroundTasks
):
    preferences_data = {
        "target_roles": [payload.role],
        "locations": [payload.location] if payload.location else [],
        "salary": payload.salary or "Not Specified",
        "industries": [payload.field],
    }
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE resumes
                SET preferences = %s
                WHERE id = %s
                RETURNING id, user_id, filename, preferences, uploaded_at;
                """,
                (Json(preferences_data), resume_id)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"resume_id '{resume_id}' not found.")
        conn.commit()

    background_tasks.add_task(run_personalized_discovery, str(row[1]), str(resume_id))
    print(f"Job discovery agent dispatched with real preferences for Resume ID: {resume_id}")

    return {
        "id": row[0],
        "user_id": row[1],
        "filename": row[2],
        "preferences": row[3],
        "uploaded_at": row[4],
    }









# --- FALLBACK WEBHOOK ---
@app.post("/resumes/agent-callback")
async def agent_callback(payload: AgentCallbackPayload, background_tasks: BackgroundTasks = BackgroundTasks()):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, user_id FROM resumes WHERE id = %s;", (payload.resume_id,))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail=f"resume_id '{payload.resume_id}' not found.")
                user_id = row[1]
                
                cursor.execute(
                    """
                    UPDATE resumes 
                    SET experience = %s, skills = %s, education = %s, preferences = %s
                    WHERE id = %s;
                    """,
                    (
                        Json(payload.experience), Json(payload.skills),
                        Json(payload.education), Json(payload.preferences) if payload.preferences else None,
                        payload.resume_id
                    )
                )
            conn.commit()
        
        # Also trigger discovery here if a fallback webhook execution happens
        background_tasks.add_task(run_personalized_discovery, str(user_id), str(payload.resume_id))
        return {"status": "success", "message": "Updated via callback. Discovery agent launched."}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Callback failure: {str(e)}")






class WatchlistCreatePayload(BaseModel):
    resume_id: UUID
    slug: str
    platform: str

@app.get("/watchlist")
def get_watchlist(resume_id: UUID):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, resume_id, slug, platform, last_scanned FROM watchlist WHERE resume_id = %s;",
                (resume_id,)
            )
            rows = cursor.fetchall()
    companies = [
        {"id": r[0], "resume_id": r[1], "slug": r[2], "platform": r[3], "last_scanned": r[4]}
        for r in rows
    ]
    return {"companies": companies}

@app.post("/watchlist")
def add_watchlist(payload: WatchlistCreatePayload):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO watchlist (resume_id, slug, platform)
                VALUES (%s, %s, %s)
                RETURNING id, resume_id, slug, platform, last_scanned;
                """,
                (payload.resume_id, payload.slug, payload.platform)
            )
            row = cursor.fetchone()
        conn.commit()
    return {"id": row[0], "resume_id": row[1], "slug": row[2], "platform": row[3], "last_scanned": row[4]}

@app.delete("/watchlist/{entry_id}")
def delete_watchlist(entry_id: UUID):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM watchlist WHERE id = %s RETURNING id;", (entry_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Entry not found")
        conn.commit()
    return Response(status_code=204)



@app.get("/jobs")
def get_jobs(resume_id: UUID):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, resume_id, title, company, location,jd_url, source, match_score, found_at
                FROM jobs
                WHERE resume_id = %s
                ORDER BY match_score DESC, found_at DESC;
                """,
                (resume_id,)
            )
            rows = cursor.fetchall()

    jobs = [
        {
            "id": str(r[0]),
            "resume_id": str(r[1]),
            "title": r[2],
            "company": r[3],
            "location": r[4],
            "jd_url": r[5],
            "source": r[6],
            "match_score": r[7],
            "found_at": r[8].isoformat() if r[8] else None,
        }
        for r in rows
    ]

    return {"jobs": jobs}



# 1. GENERATE DRAFT FOR A DISCOVERED JOB

@app.post("/jobs/{job_id}/draft")
def create_job_draft(job_id: UUID):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    j.id, j.title, j.company, j.description,
                    j.resume_id, u.name, r.skills, r.experience
                FROM jobs j
                JOIN resumes r ON j.resume_id = r.id
                JOIN users u ON r.user_id = u.id
                WHERE j.id = %s;
                """,
                (job_id,)
            )

            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Job not found.")

            _, title, company, description, resume_id, user_name, skills, experience = row

    # Use the actual job description
    real_jd = (
        description
        if description and description.strip()
        else f"{title} at {company}"
    )

    # Generate the email using Gemini
    draft_data = generate_email_draft(
        candidate_name=user_name or "Candidate",
        skills=skills or {},
        experience=experience or [],
        job_title=title or "Software Engineer",
        company=company or "Company",
        job_description=real_jd
    )

    # Save the generated email in PostgreSQL
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO email_drafts
                (job_id, poc_name, poc_email, poc_source, subject, body, status, version)
                VALUES (%s, %s, %s, %s, %s, %s, 'pending', 1)
                RETURNING id, created_at;
                """,
                (
                    job_id,
                    "Hiring Team",
                    None,
                    "unverified",
                    draft_data.get("subject", f"Application for {title}"),
                    draft_data.get("body", "")
                )
            )

            draft_row = cursor.fetchone()

        conn.commit()

    return {
        "message": "Draft created successfully",
        "draft_id": str(draft_row[0])
    }




# 2. GET ALL DRAFTS FOR A RESUME

@app.get("/drafts")
def get_drafts(resume_id: UUID):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    d.id, j.resume_id, d.job_id, d.subject, d.body,
                    d.poc_name, d.poc_email, d.status, d.version,
                    d.created_at, j.company, j.title, j.match_score
                FROM email_drafts d
                JOIN jobs j ON d.job_id = j.id
                WHERE j.resume_id = %s
                ORDER BY d.created_at DESC;
                """,
                (resume_id,)
            )

            rows = cursor.fetchall()

    drafts = [
        {
            "id": str(r[0]),
            "resume_id": str(r[1]),
            "job_posting_id": str(r[2]),
            "subject": r[3],
            "body": r[4],
            "poc_name": r[5] or "Hiring Team",
            "poc_email": r[6],
            "poc_confidence": "low",
            "status": r[7],
            "version": r[8],
            "created_at": r[9].isoformat() if r[9] else None,
            "company": r[10] or "Unknown",
            "job_title": r[11] or "Role",
            "match_score": round(r[12]) if r[12] is not None else 0,
        }
        for r in rows
    ]

    return {"drafts": drafts}




# 3. APPROVE DRAFT (HUMAN-IN-THE-LOOP)

@app.post("/drafts/{draft_id}/approve")
def approve_draft(draft_id: UUID):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE email_drafts
                SET status = 'approved'
                WHERE id = %s
                RETURNING id, job_id;
                """,
                (draft_id,)
            )

            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Draft not found")

            job_id = row[1]

            # Record approval as a dry-run application
            cursor.execute(
                """
                INSERT INTO applications (draft_id, sent_at, status)
                VALUES (%s, NULL, 'approved')
                RETURNING id;
                """,
                (draft_id,)
            )

        conn.commit()

    print(
        f"[DRY-RUN OUTREACH] Draft {draft_id} approved "
        f"for Job {job_id}. No email was actually sent."
    )

    return {
        "message": "Draft approved and recorded",
        "id": str(draft_id),
        "status": "approved"
    }




# 4. REJECT DRAFT WITH FEEDBACK (REWRITE LOOP)

@app.post("/drafts/{draft_id}/reject")
def reject_draft(draft_id: UUID, payload: RejectDraftPayload):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    d.id, d.body, d.version,
                    j.title, j.company, j.description,
                    u.name, r.skills, r.experience
                FROM email_drafts d
                JOIN jobs j ON d.job_id = j.id
                JOIN resumes r ON j.resume_id = r.id
                JOIN users u ON r.user_id = u.id
                WHERE d.id = %s;
                """,
                (draft_id,)
            )

            row = cursor.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="Draft not found"
                )

            _, old_body, version, title, company, description, user_name, skills, experience = row

    real_jd = (
        description
        if description and description.strip()
        else f"{title} at {company}"
    )

    # Ask Gemini to rewrite using the user's feedback
    new_draft = generate_email_draft(
        candidate_name=user_name or "Candidate",
        skills=skills or {},
        experience=experience or [],
        job_title=title or "Software Engineer",
        company=company or "Company",
        job_description=real_jd,
        feedback=payload.feedback,
        previous_body=old_body
    )

    # Update the existing draft
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE email_drafts
                SET
                    subject = %s,
                    body = %s,
                    version = version + 1,
                    status = 'pending',
                    feedback = %s
                WHERE id = %s
                RETURNING id, version;
                """,
                (
                    new_draft.get("subject"),
                    new_draft.get("body"),
                    payload.feedback,
                    draft_id
                )
            )

            updated_row = cursor.fetchone()

        conn.commit()

    return {
        "message": "Draft rewritten successfully",
        "id": str(draft_id),
        "version": updated_row[1],
        "status": "pending"
    }



# 5. GET APPLICATION HISTORY

@app.get("/applications")
def get_applications(resume_id: UUID):

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    a.id,
                    j.resume_id,
                    a.draft_id,
                    j.company,
                    j.title,
                    d.poc_email,
                    d.poc_name,
                    j.match_score,
                    a.status,
                    a.sent_at,
                    d.created_at
                FROM applications a
                JOIN email_drafts d ON a.draft_id = d.id
                JOIN jobs j ON d.job_id = j.id
                WHERE j.resume_id = %s
                ORDER BY a.sent_at DESC NULLS LAST, d.created_at DESC;
                """,
                (resume_id,)
            )

            rows = cursor.fetchall()

    applications = [
        {
            "id": str(r[0]),
            "resume_id": str(r[1]),
            "draft_id": str(r[2]),
            "company": r[3] or "Unknown",
            "job_title": r[4] or "Role",
            "poc_email": r[5],
            "poc_name": r[6] or "Hiring Team",
            "match_score": round(r[7]) if r[7] is not None else 0,
            "status": r[8],
            "sent_at": r[9].isoformat() if r[9] else None,
            "created_at": r[10].isoformat() if r[10] else None,
        }
        for r in rows
    ]

    return {"applications": applications}





@app.websocket("/ws/drafts/{resume_id}")
async def websocket_endpoint(websocket: WebSocket, resume_id: str):
    await websocket.accept()

    try:
        await websocket.send_json({
            "type": "pipeline_update",
            "step": "upload",
            "message": "WebSocket connected."
        })

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        pass



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)