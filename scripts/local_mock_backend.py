from datetime import datetime, timezone
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Any, Dict, List, Optional
from uuid import uuid4
import asyncio
import json

app = FastAPI(title="JobSearchAgent Local Mock Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.10.34.167:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

users: Dict[str, Dict[str, Any]] = {}
resumes: Dict[str, Dict[str, Any]] = {}
watchlist: Dict[str, List[Dict[str, Any]]] = {}
drafts: Dict[str, List[Dict[str, Any]]] = {}
applications: Dict[str, List[Dict[str, Any]]] = {}
ws_connections: Dict[str, List[WebSocket]] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_user(name: str, email: str) -> Dict[str, Any]:
    return {
        "id": str(uuid4()),
        "name": name,
        "email": email,
        "created_at": now_iso(),
    }


def build_resume(user_id: str, filename: str) -> Dict[str, Any]:
    resume_id = str(uuid4())
    resume = {
        "id": resume_id,
        "user_id": user_id,
        "filename": filename,
        "parsed": True,
        "skills": [],
        "created_at": now_iso(),
        "preferences": None,
    }
    return resume


def build_watchlist_entry(resume_id: str, slug: str, platform: str) -> Dict[str, Any]:
    return {
        "id": str(uuid4()),
        "resume_id": resume_id,
        "slug": slug,
        "platform": platform,
        "last_scanned": None,
    }


def build_draft(resume_id: str, job_title: str, company: str) -> Dict[str, Any]:
    return {
        "id": str(uuid4()),
        "resume_id": resume_id,
        "job_posting_id": str(uuid4()),
        "subject": f"Opportunity at {company}",
        "body": f"Hi {company},\n\nI would love to work as a {job_title}. Please find my resume attached.",
        "poc_name": "Hiring Manager",
        "poc_email": f"hiring@{company.replace(' ', '').lower()}.com",
        "poc_confidence": "high",
        "status": "pending",
        "version": 1,
        "match_score": 85,
        "company": company,
        "job_title": job_title,
        "created_at": now_iso(),
    }


def build_application(resume_id: str, draft: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(uuid4()),
        "resume_id": resume_id,
        "draft_id": draft["id"],
        "company": draft["company"],
        "job_title": draft["job_title"],
        "poc_email": draft["poc_email"],
        "poc_name": draft["poc_name"],
        "match_score": draft["match_score"],
        "status": "sent",
        "sent_at": now_iso(),
        "created_at": now_iso(),
    }


def send_ws_message(resume_id: str, message: Dict[str, Any]) -> None:
    for ws in ws_connections.get(resume_id, []):
        try:
            asyncio.create_task(ws.send_text(json.dumps(message)))
        except RuntimeError:
            pass


@app.post("/users")
async def create_user(payload: Dict[str, str]):
    name = payload.get("name")
    email = payload.get("email")
    if not name or not email:
        raise HTTPException(status_code=400, detail="name and email are required")
    user = build_user(name, email)
    users[user["id"]] = user
    return JSONResponse(user)


@app.post("/resumes/upload")
async def upload_resume(file: UploadFile = File(...), user_id: Optional[str] = Form(None)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF uploads are allowed")
    if not user_id:
        user_id = str(uuid4())
    resume = build_resume(user_id, file.filename)
    resumes[resume["id"]] = resume
    watchlist.setdefault(resume["id"], [])
    drafts.setdefault(resume["id"], [])
    applications.setdefault(resume["id"], [])
    return JSONResponse(resume)


@app.patch("/resumes/{resume_id}/preferences")
async def update_preferences(resume_id: str, payload: Dict[str, Any]):
    if resume_id not in resumes:
        raise HTTPException(status_code=404, detail="Resume not found")
    resumes[resume_id]["preferences"] = payload
    # Simulate pipeline updates and push a draft
    send_ws_message(resume_id, {"type": "pipeline_update", "step": "scan", "message": "Scanning watchlist..."})
    await asyncio.sleep(0.3)
    send_ws_message(resume_id, {"type": "pipeline_update", "step": "draft", "message": "Draft generated."})
    if not drafts[resume_id]:
        draft = build_draft(resume_id, payload.get("role", "Role"), payload.get("field", "Company"))
        drafts[resume_id].append(draft)
        send_ws_message(resume_id, {"type": "new_draft", "draft": draft})
    return JSONResponse(resumes[resume_id])


@app.get("/watchlist")
async def get_watchlist(resume_id: str):
    return {"companies": watchlist.get(resume_id, [])}


@app.post("/watchlist")
async def add_watchlist(resume_id: str, slug: str, platform: str):
    if not resume_id or not slug or not platform:
        raise HTTPException(status_code=400, detail="resume_id, slug, and platform are required")
    entry = build_watchlist_entry(resume_id, slug, platform)
    watchlist.setdefault(resume_id, []).append(entry)
    return JSONResponse(entry)


@app.delete("/watchlist/{entry_id}")
async def delete_watchlist(entry_id: str):
    for resume_id, entries in watchlist.items():
        for entry in entries:
            if entry["id"] == entry_id:
                entries.remove(entry)
                return JSONResponse({}, status_code=204)
    raise HTTPException(status_code=404, detail="Entry not found")


@app.get("/drafts")
async def get_drafts(resume_id: str):
    return {"drafts": drafts.get(resume_id, [])}


@app.post("/drafts/{draft_id}/approve")
async def approve_draft(draft_id: str):
    for resume_id, items in drafts.items():
        for draft in items:
            if draft["id"] == draft_id:
                draft["status"] = "approved"
                app_item = build_application(resume_id, draft)
                applications.setdefault(resume_id, []).append(app_item)
                return JSONResponse(draft)
    raise HTTPException(status_code=404, detail="Draft not found")


@app.post("/drafts/{draft_id}/reject")
async def reject_draft(draft_id: str, payload: Dict[str, Any]):
    feedback = payload.get("feedback", "")
    for items in drafts.values():
        for draft in items:
            if draft["id"] == draft_id:
                draft["status"] = "rewriting"
                draft["version"] = draft.get("version", 1) + 1
                draft["body"] += f"\n\nRewriting note: {feedback}"
                return JSONResponse(draft)
    raise HTTPException(status_code=404, detail="Draft not found")


@app.get("/applications")
async def get_applications(resume_id: str):
    return {"applications": applications.get(resume_id, [])}


@app.websocket("/ws/drafts/{resume_id}")
async def websocket_endpoint(websocket: WebSocket, resume_id: str):
    await websocket.accept()
    ws_connections.setdefault(resume_id, []).append(websocket)
    try:
        await websocket.send_text(json.dumps({"type": "pipeline_update", "step": "connecting", "message": "Websocket connected."}))
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({"type": "pipeline_update", "step": "connected", "message": "Received ping."}))
    except WebSocketDisconnect:
        ws_connections[resume_id].remove(websocket)




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
    return JSONResponse(content={}, status_code=204)





if __name__ == "__main__":
    import uvicorn
    uvicorn.run("local_mock_backend:app", host="0.0.0.0", port=8000, reload=False)
