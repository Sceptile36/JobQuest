import os
import json
import litellm
from typing import Optional
from dotenv import load_dotenv


load_dotenv()
litellm.drop_params = True

MODEL = "groq/openai/gpt-oss-120b"


def generate_email_draft(
    candidate_name: str,
    skills: dict,
    experience: list,
    job_title: str,
    company: str,
    job_description: str,
    feedback: Optional[str] = None,
    previous_body: Optional[str] = None
) -> dict:
    """
    Generates a personalized recruiter outreach email or rewrites an existing one based on feedback.
    """
    system_prompt = (
        "You are an expert executive career coach and technical outreach specialist. "
        "Write concise, highly compelling, professional cold outreach emails from candidates to hiring managers. "
        "Rules:\n"
        "1. Keep the email under 150 words.\n"
        "2. Do not use generic buzzwords. Explicitly connect the candidate's real skills/projects to the job's requirements.\n"
        "3. Output MUST be a valid raw JSON object with keys: 'subject', 'poc_name', 'poc_email', 'body'.\n"
        "4. In 'poc_name', use 'Hiring Team' if specific name is unknown. In 'poc_email', construct a sensible hiring address like 'careers@{company.replace(' ', '').lower()}.com'."
    )

    if feedback and previous_body:
        user_prompt = (
            f"REWRITE INSTRUCTION:\n"
            f"The user rejected the previous draft with this feedback: '{feedback}'\n\n"
            f"Previous email body:\n{previous_body}\n\n"
            f"Candidate: {candidate_name}\n"
            f"Job: {job_title} at {company}\n"
            f"Please rewrite the email adhering strictly to the user's feedback."
        )
    else:
        user_prompt = (
            f"Candidate: {candidate_name}\n"
            f"Skills: {skills}\n"
            f"Experience: {experience}\n"
            f"Target Role: {job_title} at {company}\n"
            f"Job Description: {job_description[:700]}\n\n"
            f"Write a high-conversion cold outreach email."
        )

    response = litellm.completion(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        num_retries=2,
        temperature=0.3,
        
    )

    content = response.choices[0].message.content
    return json.loads(content)