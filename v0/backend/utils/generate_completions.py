from openai import AsyncOpenAI, OpenAI
import asyncio
import json
from typing import AsyncIterator
from typing import Union, List, Dict, Literal
from dotenv import load_dotenv
import os
from pydantic import BaseModel
load_dotenv()

# Initialize the async client
client = AsyncOpenAI(
    base_url=os.getenv("BASE_URL"),
    api_key=os.getenv("API_KEY"),
)

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str

# Helper function to flatten chat messages into a single string prompt
def flatten_messages(messages: List[Message]) -> str:
    return "\n".join([f"{m.role}: {m.content}" for m in messages])

def process_input(data: Union[str, List[Dict[str, str]]]) -> Union[str, List[Dict[str, str]]]:
    """
    Processes input to either uppercase a string or modify the 'content' field
    of a list of dictionaries.
    """
    if isinstance(data, str):
        return data.strip()  # Ensures prompt is cleaned up (optional)

    elif isinstance(data, list):
        # Ensure each item in the list is a dictionary with a 'content' key
        return [
            {**item, "content": item["content"].strip()}  # Trims whitespace in 'content'
            for item in data if isinstance(item, dict) and "content" in item
        ]
    
    else:
        raise TypeError("Input must be a string or a list of dictionaries with a 'content' field")

async def get_completions(
    prompt: Union[str, List[Dict[str, str]]],
    instructions: str
) -> str:
    try:
        if isinstance(prompt, list):
            formatted_query = flatten_messages(prompt)
        else:
            formatted_query = prompt

        processed_prompt = process_input(formatted_query)

        messages = [{"role": "system", "content": instructions}]

        if isinstance(processed_prompt, str):
            messages.append({"role": "user", "content": processed_prompt})

        elif isinstance(processed_prompt, list):
            history = processed_prompt[:-1]
            last_user_msg = processed_prompt[-1]
            if last_user_msg.get("role") != "user":
                raise ValueError("Last message must be from the user.")
            messages += history
            messages.append(last_user_msg)
        else:
            raise TypeError("Unexpected processed input type.")

        response = await client.chat.completions.create(
            model=os.getenv("MODEL"),
            messages=messages,
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    except Exception as e:
        import traceback
        print("[DEBUG] Error in get_completions:", e)
        traceback.print_exc()
        # Optionally, re-raise or return a more informative error
        raise