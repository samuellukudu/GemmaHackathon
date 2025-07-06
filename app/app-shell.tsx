"use client"

import { useState } from "react"
import { HomePage, LibraryPage, ExplorePage, LessonsPage } from "./page"
import ExplanationPage from "./explanation/page"
import FlashcardsPage from "./flashcards/page"
import QuizPage from "./quiz/page"

type AppState = "home" | "library" | "explore" | "lessons" | "explanation" | "flashcards" | "quiz"

export default function AppShell() {
  const [currentState, setCurrentState] = useState<AppState>("home")
  const [currentTopic, setCurrentTopic] = useState("")
  const [currentExplanation, setCurrentExplanation] = useState(null)
  const [currentFlashcards, setCurrentFlashcards] = useState([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const handleStartExploration = (topic: string, category?: string) => {
    setCurrentTopic(topic)
    setCurrentStepIndex(0) // Reset to first step
    setCurrentState("explanation")
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

  const handleShowLibraryFromStudy = () => {
    setCurrentState("library")
  }

  const handleBackToHome = () => {
    setCurrentState("home")
    setCurrentTopic("")
    setCurrentExplanation(null)
    setCurrentFlashcards([])
    setCurrentStepIndex(0)
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
    // Move to the next step
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

    case "library":
      return (
        <LibraryPage
          onBack={handleBackToHome}
          onStartExploration={handleStartExploration}
          onShowExplore={handleShowExplore}
          onShowLessons={handleShowLessons}
        />
      )

    case "explore":
      return (
        <ExplorePage
          onBack={handleBackToHome}
          onStartExploration={handleStartExploration}
          onShowLibrary={handleShowLibrary}
          onShowLessons={handleShowLessons}
        />
      )

    case "lessons":
      return (
        <LessonsPage
          onBack={handleBackToHome}
          onStartExploration={handleStartExploration}
          onShowExplore={handleShowExplore}
          onShowLibrary={handleShowLibrary}
        />
      )

    case "explanation":
      return (
        <ExplanationPage
          topic={currentTopic}
          currentStepIndex={currentStepIndex}
          onBack={handleBackToHome}
          onGenerateFlashcards={handleGenerateFlashcards}
          onShowLibrary={handleShowLibraryFromStudy}
        />
      )

    case "flashcards":
      return (
        <FlashcardsPage
          explanation={currentExplanation}
          onBack={handleBackToExplanation}
          onStartQuiz={handleStartQuiz}
          onShowLibrary={handleShowLibraryFromStudy}
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
          onShowLibrary={handleShowLibraryFromStudy}
        />
      )

    default:
      return (
        <HomePage
          onStartExploration={handleStartExploration}
          onShowLibrary={handleShowLibrary}
          onShowExplore={handleShowExplore}
          onShowLessons={handleShowLessons}
        />
      )
  }
}
