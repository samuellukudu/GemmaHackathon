import os
import asyncio
import dspy
from typing import Literal, List, Union
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv
import sqlite3

load_dotenv()
lm = dspy.LM(f"openai/{os.getenv('MODEL')}", api_key=os.getenv("API_KEY"), api_base=os.getenv("BASE_URL"))
dspy.configure(lm=lm)

# Database setup
DB_PATH = 'learning.db'
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Create tables if they don't exist
c.execute('''CREATE TABLE IF NOT EXISTS related_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT,
    question TEXT,
    category TEXT,
    focus_area TEXT
)''')
c.execute('''CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT,
    title TEXT,
    overview TEXT,
    key_concepts TEXT,
    examples TEXT
)''')
c.execute('''CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER,
    term TEXT,
    explanation TEXT,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
)''')
c.execute('''CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flashcard_set_id INTEGER,
    type TEXT,
    question TEXT,
    options TEXT,
    correct_answer TEXT,
    explanation TEXT,
    FOREIGN KEY (flashcard_set_id) REFERENCES flashcards(id)
)''')
conn.commit()

def store_related_questions(topic, questions):
    for q in questions:
        c.execute('''INSERT INTO related_questions (topic, question, category, focus_area) VALUES (?, ?, ?, ?)''',
                  (topic, q.question, q.category, q.focus_area))
    conn.commit()

def store_lesson(topic, lesson):
    c.execute('''INSERT INTO lessons (topic, title, overview, key_concepts, examples) VALUES (?, ?, ?, ?, ?)''',
              (topic, lesson.title, lesson.overview, ','.join(lesson.key_concepts), ','.join(lesson.examples)))
    conn.commit()
    return c.lastrowid

def store_flashcards(lesson_id, flashcards):
    for card in flashcards:
        c.execute('''INSERT INTO flashcards (lesson_id, term, explanation) VALUES (?, ?, ?)''',
                  (lesson_id, card.term, card.explanation))
    conn.commit()

def store_quiz(flashcard_set_id, quiz):
    # True/False
    for q in quiz.true_false_questions:
        c.execute('''INSERT INTO quizzes (flashcard_set_id, type, question, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?)''',
                  (flashcard_set_id, 'true_false', q.question, '', str(q.correct_answer), q.explanation))
    # Multiple Choice
    for q in quiz.multiple_choice_questions:
        c.execute('''INSERT INTO quizzes (flashcard_set_id, type, question, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?)''',
                  (flashcard_set_id, 'multiple_choice', q.question, ','.join(q.options), str(q.correct_answer), q.explanation))
    conn.commit()

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
    """Generate flashcards for a given topic or lesson dictionary."""
    topic: Union[str, dict] = dspy.InputField()
    flashcards: Flashcards = dspy.OutputField(
        desc="A list of 5 flashcards"
    )

class TrueFalseQuestion(BaseModel):
    """A true/false question."""
    question: str = Field(description="The question text")
    correct_answer: bool = Field(description="The correct answer (True or False)")
    explanation: str = Field(description="Explanation of why the answer is correct")

class MultipleChoiceQuestion(BaseModel):
    """A multiple choice question with 4 options."""
    question: str = Field(description="The question text")
    options: List[str] = Field(description="List of 4 answer options")
    correct_answer: int = Field(description="Index of the correct answer (0-3)")
    explanation: str = Field(description="Explanation of why the answer is correct")

class Quiz(BaseModel):
    """A quiz containing true/false and multiple choice questions."""
    true_false_questions: List[TrueFalseQuestion] = Field(description="List of 2 true/false questions")
    multiple_choice_questions: List[MultipleChoiceQuestion] = Field(description="List of 3 multiple choice questions")

class GenerateQuiz(dspy.Signature):
    """Generate a quiz based on flashcards."""
    flashcards: Union[Flashcards, dict] = dspy.InputField()
    quiz: Quiz = dspy.OutputField(
        desc="A quiz with 2 true/false questions and 3 multiple choice questions"
    )

question_module = dspy.Predict(GenerateRelatedQuestions)
lesson_module = dspy.Predict(GenerateLessons)
flashcard_module = dspy.Predict(GenerateFlashcards)
quiz_module = dspy.Predict(GenerateQuiz)

async def main(topic: str):
    print("Related Questions:")
    response = await question_module.acall(topic=topic)
    print(response.questions.related_questions)
    # Store related questions
    store_related_questions(topic, response.questions.related_questions)
    print("\n")

    response = await lesson_module.acall(topic=topic)
    print("Lessons:")
    print(response.lessons.lessons)
    # Store lessons and get lesson IDs
    lesson_ids = []
    for lesson in response.lessons.lessons:
        lesson_id = store_lesson(topic, lesson)
        lesson_ids.append(lesson_id)
    print("\n")

    print("Flashcards:")
    # Generate flashcards for all lessons
    all_flashcards = []
    for i, lesson in enumerate(response.lessons.lessons):
        print(f"\nGenerating flashcards for lesson {i+1}: {lesson.title}")
        lesson_id = lesson_ids[i]
        flashcard_response = await flashcard_module.acall(topic=lesson)
        flashcards = flashcard_response.flashcards.cards
        print(f"Generated {len(flashcards)} flashcards")
        # Store flashcards for this lesson
        store_flashcards(lesson_id, flashcards)
        all_flashcards.append((lesson_id, flashcards))
        print(flashcards)

    print("\nQuiz:")
    # Generate quiz for each lesson's flashcards
    for i, (lesson_id, flashcards) in enumerate(all_flashcards):
        print(f"\nGenerating quiz for lesson {i+1} flashcards:")
        # Get the first flashcard's ID for quiz linkage
        c.execute('SELECT id FROM flashcards WHERE lesson_id = ? ORDER BY id ASC', (lesson_id,))
        flashcard_ids = [row[0] for row in c.fetchall()]
        flashcard_set_id = flashcard_ids[0] if flashcard_ids else None
        
        # Create Flashcards object for quiz generation
        quiz_flashcards = Flashcards(cards=flashcards)
        quiz_response = await quiz_module.acall(flashcards=quiz_flashcards)
        quiz = quiz_response.quiz
        
        print("True/False Questions:")
        for j, question in enumerate(quiz.true_false_questions):
            print(f"Question {j+1}: {question.question}")
            print(f"Correct Answer: {question.correct_answer}")
            print(f"Explanation: {question.explanation}")
            print()
        print("Multiple Choice Questions:")
        for j, question in enumerate(quiz.multiple_choice_questions):
            print(f"Question {j+1}: {question.question}")
            for k, option in enumerate(question.options):
                print(f"  {k+1}. {option}")
            print(f"Correct Answer: {question.correct_answer + 1}")
            print(f"Explanation: {question.explanation}")
            print()
        
        # Store quiz in DB
        if flashcard_set_id is not None:
            store_quiz(flashcard_set_id, quiz)

asyncio.run(main("How do solar panels work?")) 