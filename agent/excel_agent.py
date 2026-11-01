import os
import asyncio
from dotenv import load_dotenv
from mcp import StdioServerParameters

# ─── GOOGLE ADK SPECIFIC IMPORTS ───
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from google.adk.runners import InMemoryRunner


job_ranker_agent = Agent(
    model = "gemini-2.5-flash",
    name = "job_ranker_agent",

)