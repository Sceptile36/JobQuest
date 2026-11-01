import os
import asyncio
from dotenv import load_dotenv
from mcp import StdioServerParameters
from google.adk import Agent, Workflow
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from google.adk.runners import InMemoryRunner
from google.adk.models.lite_llm import LiteLlm
load_dotenv(override=True)

AGENT_MODEL = LiteLlm(model="groq/openai/gpt-oss-120b")

async def main():
    job_server_params = StdioServerParameters(
        command="python3",
        args=["mcp-servers/main.py"]
    )
    job_connection = StdioConnectionParams(server_params=job_server_params)
    job_tools = McpToolset(connection_params=job_connection)

    excel_tools = McpToolset(
        connection_params=StdioConnectionParams(
            timeout=50,
            server_params = StdioServerParameters(
                command="python3",
                args=["-m", "excel_mcp", "stdio"],
                # We point the tool's execution directory to /app so files save directly to your workspace folder
                env={"EXCEL_FILES_PATH": "/app"}
            )
        )
    )

    job_search_agent = Agent(
        model="gemini-2.5-flash",
        name="job_search_agent",
        instruction="""
            You are a specialized Job Discovery Agent using an MCP Server connected to Greenhouse and Lever. 

            CRITICAL TOOL PROTOCOL:
            1. Your `fetch_postings` tool requires BOTH a 'slug' (company name string) and an 'ats' ("greenhouse" or "lever").
            2. If you don't know which ATS a company uses (e.g., PhonePe), prioritize checking "greenhouse" first. If that returns an error or empty result, immediately try "lever" with the same company slug.
            3. Once you fetch the listings, parse the payload to extract:
               - Company Name
               - Job Title
               - Job Apply URL / Source Link
               - Location
            4. Filter the results down to match the user's specific query criteria (e.g., only "Software engineering" roles, limit to 3 listings).
            5. Output the final data in a clean Markdown table format so the downstream Excel Agent can parse it cleanly.
            """,
        tools=[job_tools],
    )



    excel_agent = Agent(
        model = AGENT_MODEL,
        name = "excel_agent",
        instruction="""
            You are a meticulous Data Automation Specialist whose sole job is to format and write job listing data into clean Microsoft Excel workbooks.

            OPERATIONAL RULES:
            1. **Input Schema**: You will receive a clean, structured list of job postings containing data fields like Company Name, Job Title, and Job Apply URL.
            2. **Target File Path**: You must save all generated files inside the designated `/app` directory matching your workspace root.
            3. **File Naming Convention**: Name files logically using lowercase characters and underscores based on the target company (e.g., `phonepe_job_leads.xlsx` or `job_search_results.xlsx`).
            4. **Spreadsheet Layout Architecture**:
               - Create a clean data table with explicit columns matching the source information.
               - Mandatory column structure: `Company Name` | `Job Title` | `Job Apply URL` | `Location`
               - Apply formatting to ensure headers are clearly separated from the row rows (e.g., bold formatting on row 1 headers).
            5. **Completion Signal**: When the file has been successfully written via the excel toolset, return a brief markdown summary statement confirming the target location path and filename so the client knows exactly where to collect the asset.
            """,
        tools = [excel_tools]
    )


    root_agent = Workflow(
        name = "root_agent",
        edges=[
            ("START", job_search_agent),
            (job_search_agent, excel_agent)
        ]
    )
    # agent goes in the constructor, not in .run()
    runner = InMemoryRunner(agent=root_agent)

    user_prompt = "Give 3 active Software engineering jobs open at PhonePe"
    print(f"Prompting Agent: '{user_prompt}'\nThinking...")

    # Initialize the async debug event stream
    events = await runner.run_debug(user_prompt, verbose=True)

    final_text = ""
    for event in events:
        if event.is_final_response() and event.content:
            for part in event.content.parts:
                if part.text:
                    final_text += part.text

    print("\nAgent Response:\n")
    print(final_text)

if __name__ == "__main__":
    asyncio.run(main())


    
