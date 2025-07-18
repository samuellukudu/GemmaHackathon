import os
import asyncio
import dspy
from typing import Literal, List
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

load_dotenv()
lm = dspy.LM(f"openai/{os.getenv('MODEL')}", api_key=os.getenv("API_KEY"), api_base=os.getenv("BASE_URL"))
dspy.configure(lm=lm)

class RelatedQuestions(BaseModel):
    """Represents a single generated question."""
    question: str = Field(description="The actual question text")
    category: Literal["basic", "intermediate", "advanced"] = Field(description="The category of the question")
    focus_area: str = Field(description="Brief description of what aspect this question explores")

class RelatedQuestionsSet(BaseModel):
    """Represents a list of related questions."""
    related_questions: List[RelatedQuestions] = Field(description="A list of related questions")

class GenerateRelatedQuestions(dspy.Signature):
    """Generate related questions for a given topic."""
    topic: str = dspy.InputField()
    questions: RelatedQuestionsSet = dspy.OutputField(
        desc="A list of 5 related questions"
    )

class Lessons(BaseModel):
    """Represents a single lesson."""
    title: str = Field(description="The title of the lesson")
    overview: str = Field(description="A brief overview of what the lesson covers")
    key_concepts: List[str] = Field(description="A list of key concepts covered in the lesson")
    examples: List[str] = Field(description="A list of practical examples or applications")

class LessonsSet(BaseModel):
    """Represents a list of lessons."""
    lessons: List[Lessons] = Field(description="A list of lessons")

class GenerateLessons(dspy.Signature):
    """Generate lessons for a given topic."""
    topic: str = dspy.InputField()
    lessons: LessonsSet = dspy.OutputField(
        desc="A list of 5 lessons"
    )

class Card(BaseModel):
    """
    A single card defining a key term or concept.
    """
    term: str = Field(description="The term or concept to be defined")
    explanation: str = Field(description="A clear and concise explanation of the term or concept")

class Flashcards(BaseModel):
    """
    A list of flashcards defining key terms or concepts.
    """
    cards: List[Card] = Field(description="A list of flashcards")

    @field_validator('cards', mode='before')
    @classmethod
    def unwrap_cards(cls, v):
        # Accepts both [{"Card": {...}}, ...] and [{"term": ..., "explanation": ...}, ...]
        if v and isinstance(v, list) and isinstance(v[0], dict) and "Card" in v[0]:
            return [item["Card"] for item in v]
        return v

class GenerateFlashcards(dspy.Signature):
    """Generate flashcards for a given topic."""
    topic: str = dspy.InputField()
    flashcards: Flashcards = dspy.OutputField(
        desc="A list of 5 flashcards"
    )

question_module = dspy.Predict(GenerateRelatedQuestions)
lesson_module = dspy.Predict(GenerateLessons)
flashcard_module = dspy.Predict(GenerateFlashcards)

async def main(topic: str):
    print("Related Questions:")
    response = await question_module.acall(topic=topic)
    print(response.questions.related_questions)
    print("\n")
    response = await lesson_module.acall(topic=topic)
    print("Lessons:")
    print(response.lessons.lessons)
    print("\n")
    print("Flashcards:")
    response = await flashcard_module.acall(topic=topic)
    # print(response.flashcards.cards)
    for i, card in enumerate(response.flashcards.cards):
        print(f"Card {i+1}:")
        print(f"Term: {card.term}")
        print(f"Explanation: {card.explanation}")
        print("\n")

asyncio.run(main("How do solar panels work?")) 