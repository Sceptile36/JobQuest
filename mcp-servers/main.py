import asyncio
import httpx
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.types as types
import json
from mcp.server.stdio import stdio_server

GREENHOUSE_BASE = "https://boards-api.greenhouse.io/v1/boards"
LEVER_BASE = "https://api.lever.co/v0/postings"
HEADERS = {"User-Agent": "JobSearchAgent/1.0 (contact: you@example.com)"}

app = Server("greenhouse-lever-mcp")

async def fetch_greenhouse_postings(slug: str) -> list[dict]:
    url = f"{GREENHOUSE_BASE}/{slug}/jobs"
    async with httpx.AsyncClient(timeout=15.0, headers = HEADERS) as client:
        res = await client.get(url)
        res.raise_for_status()
        data = res.json()
    
    return[
        {
            "external_id": str(job["id"]),
            "title": job.get("title"),
            "location" : (job.get("location") or {}).get("name"),
            "url" : job.get("absolute_url"),
        }

        for job in data.get("jobs", [])
    ]

async def fetch_lever_postings(slug: str) -> list[dict]:
    url = f"{LEVER_BASE}/{slug}"
    params = {"mode": "json"}
    async with httpx.AsyncClient(timeout=15.0, headers = HEADERS) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    return [
        {
            "external_id": posting.get("id"),
            "title": posting.get("text"),
            "location": (posting.get("categories") or {}).get("location"),
            "url": posting.get("hostedUrl"),
        }
        for posting in data
    ]

async def fetch_greenhouse_detail(slug: str, external_id: str)-> dict:
    url = f"{GREENHOUSE_BASE}/{slug}/jobs/{external_id}"
    params = {"content": "true"}
    async with httpx.AsyncClient(timeout=15.0, headers = HEADERS) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
        job = res.json()

    return {
        "external_id" : str(job.get("id")),
        "title" : job.get("title"),
        "location" : (job.get("location") or {}).get("name"),
        "url" : job.get("absolute_url"),
        "description_html" : job.get("content"),
    }

async def fetch_lever_detail(slug: str, external_id: str) -> dict:
    url = f"{LEVER_BASE}/{slug}"
    params = {"mode": "json"}
    async with httpx.AsyncClient(timeout=15.0, headers = HEADERS) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    for posting in data:
        if str(posting.get("id")) == str(external_id):
            return {
                "external_id": posting.get("id"),
                "title": posting.get("text"),
                "location": (posting.get("categories") or {}).get("location"),
                "url": posting.get("hostedUrl"),
                "description_html": (posting.get("description") or "")
                + (posting.get("descriptionPlain") or ""),
            }

    raise ValueError(f"No Lever posting with id={external_id} found for slug={slug}")


@app.list_tools()
async def list_tools() -> list[types.Tool]:
    """Defines precise tool schemas so the LLM understands parameter constraints."""

    return[
        types.Tool(
            name = "fetch_postings",
            description = "Fetch a summary catalog list of all open positions for a company's public board.",
            inputSchema = {
                "type" : "object",
                "properties" : {
                    "slug" : {"type" : "string", "description" : "The company identifier string (e.g., 'stripe', 'figma')."},
                    "ats": {"type": "string", "enum": ["greenhouse", "lever"], "description": "The target ATS platform engine."}
                },
                "required" : ["slug", "ats"]
            }
        ),

        types.Tool(
            name="get_posting_detail",
            description="Fetch full contextual details, including explicit HTML formatting descriptions for a single position.",
            inputSchema={
                "type": "object",
                "properties": {
                    "slug": {"type": "string", "description": "The company board identifier."},
                    "external_id": {"type": "string", "description": "The unique targeting ID string returned by fetch_postings."},
                    "ats": {"type": "string", "enum": ["greenhouse", "lever"], "description": "The target ATS platform engine."}
                },
                "required": ["slug", "external_id", "ats"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    """Central routing hub parsing incoming JSON request commands from the client."""
    slug = arguments.get("slug")
    ats = arguments.get("ats")

    if not slug or not ats:
        raise ValueError("Missing target parameters: 'slug' and 'ats' ")
    
    if name == "fetch_postings":
        if ats == "greenhouse":
            results = await fetch_greenhouse_postings(slug)
        elif ats == "lever":
            results = await fetch_lever_postings(slug)
        else:
            raise ValueError(f"Unsupported ATS: {ats}")

    elif name == "get_posting_detail":
        external_id = arguments.get("external_id")
        if not external_id:
            raise ValueError("The parameter 'external_id' is mandatory to extract explicit row details.")
        
        if ats == "greenhouse":
            results = await fetch_greenhouse_detail(slug, external_id)
        elif ats == "lever":
            results = await fetch_lever_detail(slug, external_id)
        else:
            raise ValueError(f"Unsupported ATS: {ats}")
            
    else:
        raise ValueError(f"Target tool variant not found: {name}")

    return [
        types.TextContent(
            type = "text",
            text = json.dumps(results, indent=2)
        )
    ]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream, 
            write_stream,
            InitializationOptions(
                server_name = "greenhouse-lever-mcp",
                server_version = "1.0.0",
                capabilities = app.get_capabilities(
                    notification_options = NotificationOptions(),
                    experimental_capabilities = {}
                )
            )
        )
if __name__ == "__main__":
    asyncio.run(main())