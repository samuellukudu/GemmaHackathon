# Introduction

```python
import dspy
lm = dspy.LM("openai/gemma3n:e4b", api_key="ollama", api_base="http://localhost:11434/v1")
dspy.configure(lm=lm)

class ExtractInfo(dspy.Signature):
    """Extract structured information from text."""

    text: str = dspy.InputField()
    title: str = dspy.OutputField()
    headings: list[str] = dspy.OutputField()
    entities: list[dict[str, str]] = dspy.OutputField(desc="a list of entities and their metadata")

module = dspy.Predict(ExtractInfo)

text = "Apple Inc. announced its latest iPhone 14 today." \
    "The CEO, Tim Cook, highlighted its new features in a press release."
response = module(text=text)

print(response.title)
print(response.headings)
print(response.entities)

from typing import Literal

class Classify(dspy.Signature):
    """Classify sentiment of a given sentence."""

    sentence: str = dspy.InputField()
    sentiment: Literal["positive", "negative", "neutral"] = dspy.OutputField()
    confidence: float = dspy.OutputField()

classify = dspy.Predict(Classify)
classify(sentence="This book was super fun to read, though not the last chapter.")

from pydantic import BaseModel, Field
from typing import List

class Flashcard(BaseModel):
    """A single flashcard with a question and an answer."""
    question: str = Field(description="The question for the flashcard.")
    answer: str = Field(description="The answer to the flashcard's question.")

class FlashcardSet(BaseModel):
    """A set of flashcards generated from the lesson content."""
    flashcards: List[Flashcard] = Field(description="A list of flashcard objects.")

class GenerateFlashcards(dspy.Signature):
    """
    You are an AI assistant that creates flashcards from educational lesson content.
    Your task is to generate a set of flashcards (question and answer pairs) that
    help a learner review and remember the key concepts from the lesson provided.
    
    Guidelines:
    - Focus on the most important facts, definitions, and concepts in the lesson.
    - Phrase questions clearly and concisely.
    - Provide accurate, concise answers.
    - Cover all key concepts and examples from the lesson.
    - Use a variety of question types (definition, application, example, etc.).
    - Generate at least 5 flashcards per lesson.
    """
    lesson_content: str = dspy.InputField(desc="The educational content of the lesson.")
    flashcard_set: FlashcardSet = dspy.OutputField(desc="A JSON object containing a list of flashcards.")

lesson = """
The solar system is the gravitationally bound system of the Sun and the objects that orbit it.
It formed 4.6 billion years ago from the gravitational collapse of a giant interstellar molecular cloud.
The vast majority of the system's mass is in the Sun, with most of the remaining mass contained in the planet Jupiter.
The four inner terrestrial planets are Mercury, Venus, Earth and Mars. The four outer giant planets are Jupiter, Saturn, Uranus and Neptune.
"""
module = dspy.Predict(GenerateFlashcards)
flashcards = module(lesson_content=lesson)

flashcards.flashcard_set.flashcards
```

## `async`
```python
import dspy
import asyncio
import os

os.environ["OPENAI_API_KEY"] = "your_api_key"

dspy.configure(lm=dspy.LM("openai/gpt-4o-mini"))
predict = dspy.Predict("question->answer")

async def main():
    # Use acall() for async execution
    output = await predict.acall(question="why did a chicken cross the kitchen?")
    print(output)


asyncio.run(main())

import asyncio
import dspy
import os

os.environ["OPENAI_API_KEY"] = "your_api_key"

async def foo(x):
    # Simulate an async operation
    await asyncio.sleep(0.1)
    print(f"I get: {x}")

# Create a tool from the async function
tool = dspy.Tool(foo)

async def main():
    # Execute the tool asynchronously
    await tool.acall(x=2)

asyncio.run(main())

import dspy
import asyncio
import os

os.environ["OPENAI_API_KEY"] = "your_api_key"
dspy.configure(lm=dspy.LM("openai/gpt-4o-mini"))

class MyModule(dspy.Module):
    def __init__(self):
        self.predict1 = dspy.ChainOfThought("question->answer")
        self.predict2 = dspy.ChainOfThought("answer->simplified_answer")

    async def aforward(self, question, **kwargs):
        # Execute predictions sequentially but asynchronously
        answer = await self.predict1.acall(question=question)
        return await self.predict2.acall(answer=answer)


async def main():
    mod = MyModule()
    result = await mod.acall(question="Why did a chicken cross the kitchen?")
    print(result)


asyncio.run(main())
```