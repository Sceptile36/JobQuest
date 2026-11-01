import asyncio
import os
import sys
import uuid
import json
import re
import httpx
from dotenv import load_dotenv

# Ensure local module path resolution works smoothly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import AsyncSessionLocal  
from api.models import Resume, Job         
from sqlalchemy.future import select        

from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from google.adk.models.lite_llm import LiteLlm

# Required structured types for Google GenAI compatibility
from google.genai.types import Content, Part

load_dotenv(override=True)
RAPID_API_KEY = os.getenv("RAPIDAPI_KEY")
AGENT_MODEL = LiteLlm(
    model="groq/openai/gpt-oss-120b",
    include_reasoning=False
)


# FIXED: Stripped down to a single parameter. 
# Optional filters are hardcoded inside to keep the schema clean for Groq.
async def search_jobs(query: str) -> str:
    """
    Search for active job listings using the JSearch API platform.
    """
    api_key = os.getenv("RAPIDAPI_KEY", "").strip()
    
    clean_query = str(query).strip()
    if not clean_query or clean_query in ["[] in []", "[]", "None", "[ ] in [ ]"]:
        clean_query = "Data Analyst in San Francisco"
        
    print(f"Searching for jobs with query: {clean_query}")

    url = "https://jsearch.p.rapidapi.com/search-v2"
    headers = {
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        "X-RapidAPI-Key": api_key
    }
    params = {
        "query": clean_query,
        "num_pages": 1
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params, timeout=20.0)
            
            print(f"--> JSearch API HTTP Status: {response.status_code}")
            
            if response.status_code == 200:
                raw_payload = response.json()
                inner_data = raw_payload.get("data")
                
                # 💎 FIX: Adaptive unpacking to protect against dictionary nesting
                if isinstance(inner_data, dict):
                    results = inner_data.get("jobs", [])
                elif isinstance(inner_data, list):
                    results = inner_data
                else:
                    results = []
                
                print(f"--> Success! Extracted {len(results)} live jobs from payload.")
                
                cleaned_jobs = []
                for job in results[:5]:  
                    cleaned_jobs.append({
                        "title": job.get("job_title"),
                        "company": job.get("employer_name"),
                        "location": ", ".join(
                            p for p in [
                                job.get("job_city"),
                                job.get("job_state"),
                                job.get("job_country")
                            ] if p
                        ) or "Remote / Not specified",
                        "jd_url": job.get("job_apply_link"),
                        "source": "jsearch"
                    })
                return json.dumps(cleaned_jobs)
            else:
                print(f"--> JSearch API Error Body: {response.text}")
                return f"Error from JSearch API: Status {response.status_code}"
    except Exception as e:
        print(f"--> JSearch Parsing Exception: {str(e)}")
        return f"Failed to parse jobs: {str(e)}"


async def fetch_user_preferences_async(resume_uuid: uuid.UUID) -> dict:
    """Asynchronously queries the resumes table for a specific resume's JSONB preference block."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Resume).where(Resume.id == resume_uuid)
        )
        resume = result.scalar_one_or_none()
        if resume and resume.preferences:
            return resume.preferences
    return {}


def _sanitize_preference_string(value, default_fallback: str) -> str:
    """Helper method to protect instructions against empty objects or empty lists."""
    if isinstance(value, list):
        filtered_list = [str(item).strip() for item in value if str(item).strip() not in ["", "[]", "None"]]
        return filtered_list[0] if filtered_list else default_fallback
    
    stringified = str(value).strip() if value is not None else ""
    if not stringified or stringified in ["[]", "None", ""]:
        return default_fallback
    return stringified


def create_personalized_agent(preferences: dict) -> Agent:
    """Maps custom JSONB preference parameters into structured instructions for the native search tool."""
    role = _sanitize_preference_string(preferences.get("target_roles"), "Data Analyst")
    location = _sanitize_preference_string(preferences.get("locations"), "San Francisco")

    # Hardened system prompt to prevent placeholder hallucinations
    instruction_payload = (
        "You are an automated job acquisition assistant.\n\n"
        "YOUR CRITICAL OPERATIONAL RULES:\n"
        f"1. You MUST call the `search_jobs` tool immediately using exactly the query: '{role} in {location}'.\n"
        "2. Once the tool executes and returns the live data, read the real job listings inside it.\n"
        "3. Reformat that REAL data into a clean JSON array using these exact keys: 'title', 'company', 'location', 'jd_url', 'source'.\n"
        "4. STERN WARNING: Never output placeholder text like 'Company Name', 'Job Title', 'Job Location', or 'Job Description URL'.\n"
        "5. If the tool returns empty or no jobs are found, return an empty array `[]`. Do NOT invent fake listings or template data under any circumstances."
    )

    return Agent(
        model=AGENT_MODEL, 
        name="job_search_agent",
        instruction=instruction_payload,
        tools=[search_jobs],  
    )


async def run_personalized_discovery(user_id_str: str, resume_id_str: str):
    """Executes the core pipeline to retrieve recommendations from the agent and persist results."""
    user_uuid = uuid.UUID(user_id_str)
    resume_uuid = uuid.UUID(resume_id_str)
    
    print(f"\n--- Starting Discovery Job Pipeline for Resume UUID: {resume_uuid} ---")

    preferences = await fetch_user_preferences_async(resume_uuid)
    job_search_agent = create_personalized_agent(preferences)
    app_name = job_search_agent.name or "job_search_agent"
    
    runner = InMemoryRunner(agent=job_search_agent, app_name=app_name)
    
    await runner.session_service.create_session(
        app_name=app_name,
        user_id=user_id_str,
        session_id=resume_id_str
    )
    
    print("Launching JSearch Agent queries...")
    search_prompt = "Execute your job discovery protocol using the tool provided."
    final_text = ""
    
    user_message = Content(
        role="user",
        parts=[Part.from_text(text=search_prompt)]
    )
    
    async for event in runner.run_async(
        user_id=user_id_str,
        session_id=resume_id_str,
        new_message=user_message
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_text = event.content.parts[0].text.strip()
            print("\n--- Raw Agent Response Output Captured ---")

    try:
        if not final_text:
            raise ValueError("Agent failed to return a valid final response block.")

        json_match = re.search(r'(\[.*\]|\{.*\})', final_text, re.DOTALL)
        if not json_match:
            raise ValueError("No valid structured JSON blocks discovered in the output payload.")
            
        parsed_payload = json.loads(json_match.group(1))
        
        if isinstance(parsed_payload, dict):
            for key, val in parsed_payload.items():
                if isinstance(val, list):
                    found_jobs = val
                    break
            else:
                found_jobs = [parsed_payload]
        else:
            found_jobs = parsed_payload

        print(f"Agent successfully extracted {len(found_jobs)} matching job listings!")
        
        if not isinstance(found_jobs, list):
            raise TypeError("Extracted payload structure could not be normalized into an iterable array.")

        async with AsyncSessionLocal() as session:
            for job_data in found_jobs:
                if not isinstance(job_data, dict):
                    continue
                new_job = Job(
                    resume_id=resume_uuid,
                    title=job_data.get("title"),
                    company=job_data.get("company"),
                    location=job_data.get("location"),
                    jd_url=job_data.get("jd_url"),
                    source=job_data.get("source", "jsearch"),
                    match_score=1.0
                )
                session.add(new_job)
            await session.commit()
            
        print("Successfully synchronized agent data to PostgreSQL 'jobs' table!")
        
    except Exception as e:
        print(f"Failed to automatically store jobs to DB: {str(e)}")
        print(f"Raw Agent Text was: {final_text}")


if __name__ == "__main__":
    async def run_local_test_harness():
        print("Initializing database lookup for verification test...")
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Resume).limit(1))
            sample_record = result.scalar_one_or_none()
            
            if sample_record:
                print(f"Found existing record. User ID: {sample_record.user_id} | Resume ID: {sample_record.id}")
                await run_personalized_discovery(str(sample_record.user_id), str(sample_record.id))
            else:
                print("❌ Testing Error: The resumes table is currently empty.")

    asyncio.run(run_local_test_harness())