import React, { useState, useCallback } from "react"
import HomePage from "./HomePage"
import ExplanationPage from "./ExplanationPage"
import FlashcardsPage from "./FlashcardsPage"
import QuizPage from "./QuizPage"
import ExplorePage from "./ExplorePage"
import LibraryPage from "./LibraryPage"
import LessonsPage from "./LessonsPage"

type AppState = "home" | "explanation" | "flashcards" | "quiz" | "explore" | "library" | "lessons"

export default function AppShell() {
  const [currentState, setCurrentState] = useState<AppState>("home")
  const [currentTopic, setCurrentTopic] = useState("")
  const [currentExplanation, setCurrentExplanation] = useState<any>(null)
  const [currentFlashcards, setCurrentFlashcards] = useState<any[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isUserQuery, setIsUserQuery] = useState(true)

  const handleStartExploration = useCallback((topic: string) => {
    setCurrentTopic(topic)
    setCurrentStepIndex(0)
    setIsUserQuery(true)
    setCurrentState("explanation")
  }, [])

  const handleBackToHome = () => {
    setCurrentState("home")
    setCurrentTopic("")
    setCurrentExplanation(null)
    setCurrentFlashcards([])
    setCurrentStepIndex(0)
  }

  const handleShowLibrary = () => {
    setCurrentState("library")
  }

  const handleShowExplore = () => {
    setCurrentState("explore")
  }

  const handleShowLessons = () => {
    setCurrentState("lessons")
  }

  const handleGenerateFlashcards = (explanation: any) => {
    setCurrentExplanation(explanation)
    setCurrentState("flashcards")
  }

  const handleStartQuiz = (flashcards: any[]) => {
    setCurrentFlashcards(flashcards)
    setCurrentState("quiz")
  }

  const handleBackToExplanation = () => {
    setCurrentState("explanation")
  }

  const handleBackToFlashcards = () => {
    setCurrentState("flashcards")
  }

  const handleNextStep = () => {
    setCurrentStepIndex((prev) => prev + 1)
    setCurrentState("explanation")
    setCurrentExplanation(null)
    setCurrentFlashcards([])
  }

  switch (currentState) {
    case "home":
      return (
        <HomePage
          onStartExploration={handleStartExploration}
          onShowLibrary={handleShowLibrary}
          onShowExplore={handleShowExplore}
          onShowLessons={handleShowLessons}
        />
      )

    case "explore":
      return (
        <ExplorePage
          onBack={handleBackToHome}
          onShowLibrary={handleShowLibrary}
          onShowLessons={handleShowLessons}
        />
      )

    case "library":
      return (
        <LibraryPage
          onBack={handleBackToHome}
          onShowExplore={handleShowExplore}
          onShowLessons={handleShowLessons}
        />
      )

    case "lessons":
      return (
        <LessonsPage
          onBack={handleBackToHome}
          onShowExplore={handleShowExplore}
          onShowLibrary={handleShowLibrary}
        />
      )

    case "explanation":
      return (
        <ExplanationPage
          topic={currentTopic}
          currentStepIndex={currentStepIndex}
          isUserQuery={isUserQuery}
          onBack={handleBackToHome}
          onGenerateFlashcards={handleGenerateFlashcards}
          onShowLibrary={handleShowLibrary}
        />
      )

    case "flashcards":
      return (
        <FlashcardsPage
          explanation={currentExplanation}
          onBack={handleBackToExplanation}
          onStartQuiz={handleStartQuiz}
          onShowLibrary={handleShowLibrary}
        />
      )

    case "quiz":
      return (
        <QuizPage
          flashcards={currentFlashcards}
          onBack={handleBackToFlashcards}
          onReturnHome={handleBackToHome}
          onNextStep={handleNextStep}
          explanation={currentExplanation}
          onShowLibrary={handleShowLibrary}
        />
      )

    default:
      return <HomePage onStartExploration={handleStartExploration} />
  }
} 