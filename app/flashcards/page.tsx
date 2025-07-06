"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Volume2, Brain, BarChart3 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface FlashcardsPageProps {
  explanation: any
  onBack: () => void
  onStartQuiz: (flashcards: Flashcard[]) => void
  onShowLibrary: () => void
}

interface Flashcard {
  id: number
  front: string
  back: string
  category: string
}

export default function FlashcardsPage({ explanation, onBack, onStartQuiz, onShowLibrary }: FlashcardsPageProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentCard, setCurrentCard] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set())

  useEffect(() => {
    generateFlashcards()
  }, [explanation])

  const generateFlashcards = async () => {
    setIsLoading(true)

    // Check if we have pre-generated flashcards from a specific step
    if (explanation.flashcards) {
      setFlashcards(explanation.flashcards)
      setIsLoading(false)
      return
    }

    // Simulate AI flashcard generation for full explanation
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const mockFlashcards: Flashcard[] = [
      {
        id: 1,
        front: "What is the primary function of the power source?",
        back: "To provide the energy needed for the entire system to operate effectively.",
        category: "Power & Energy",
      },
      {
        id: 2,
        front: "How do control systems ensure safety?",
        back: "They monitor and regulate the system's behavior, preventing dangerous conditions through automated responses.",
        category: "Control Systems",
      },
      {
        id: 3,
        front: "What advantage do mechanical components provide?",
        back: "They multiply force and efficiency by converting energy into the desired motion or output.",
        category: "Mechanics",
      },
    ]

    setFlashcards(mockFlashcards)
    setIsLoading(false)
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
    if (!isFlipped) {
      setStudiedCards((prev) => new Set([...prev, currentCard]))
    }
  }

  const handleNext = () => {
    if (currentCard === flashcards.length - 1) {
      // If we're at the last card and it's been studied, go to quiz
      if (studiedCards.has(currentCard)) {
        onStartQuiz(flashcards)
        return
      }
    }
    setCurrentCard((prev) => (prev + 1) % flashcards.length)
    setIsFlipped(false)
  }

  const handlePrevious = () => {
    setCurrentCard((prev) => (prev - 1 + flashcards.length) % flashcards.length)
    setIsFlipped(false)
  }

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <Brain className="h-16 w-16 text-emerald-600 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Creating Flashcards...</h2>
            <p className="text-gray-600">Extracting key concepts for study</p>
          </div>
        </div>
      </div>
    )
  }

  const progress = (studiedCards.size / flashcards.length) * 100
  const isStepMode = explanation.currentStepIndex !== undefined
  const allCardsStudied = studiedCards.size === flashcards.length && flashcards.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-3">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={onShowLibrary}
            className="h-10 w-10 p-0 bg-transparent"
            title="View Library & Stats"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {isStepMode ? `Step ${explanation.currentStepIndex + 1} Flashcards` : "Flashcards"}
            </h1>
            <p className="text-sm text-gray-600 truncate">
              {isStepMode ? `Study: ${explanation.step.title}` : "Study key concepts"}
            </p>
          </div>
        </div>

        {/* Progress Bars - Compact */}
        <div className="space-y-3 mb-4">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">Study Progress</span>
              <span className="text-xs text-gray-600">
                {studiedCards.size}/{flashcards.length} studied
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>

        {/* Card Counter */}
        <div className="text-center mb-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            Card {currentCard + 1} of {flashcards.length}
          </Badge>
        </div>

        {/* Flashcard - Main Content */}
        <div className="flex-1 flex justify-center items-center mb-4">
          <div className="relative w-full max-w-2xl h-64 cursor-pointer" onClick={handleFlip}>
            <div
              className={`absolute inset-0 transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? "rotate-y-180" : ""}`}
            >
              {/* Front of card */}
              <Card className="absolute inset-0 backface-hidden bg-white shadow-xl hover:shadow-2xl transition-shadow">
                <CardContent className="h-full flex flex-col justify-center items-center p-6 text-center">
                  <Badge className="mb-3 text-xs">{flashcards[currentCard]?.category}</Badge>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 leading-relaxed">
                    {flashcards[currentCard]?.front}
                  </h2>
                  <p className="text-gray-500 text-sm">Click to reveal answer</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      speakText(flashcards[currentCard]?.front || "")
                    }}
                    className="mt-2 p-1"
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>

              {/* Back of card */}
              <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-emerald-50 shadow-xl">
                <CardContent className="h-full flex flex-col justify-center items-center p-6 text-center">
                  <Badge variant="secondary" className="mb-3 text-xs">
                    {flashcards[currentCard]?.category}
                  </Badge>
                  <p className="text-base text-gray-800 leading-relaxed mb-3">{flashcards[currentCard]?.back}</p>
                  <p className="text-emerald-600 font-medium text-sm">Great! You've studied this card</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      speakText(flashcards[currentCard]?.back || "")
                    }}
                    className="mt-2 p-1"
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Navigation - Fixed at bottom */}
        <div className="flex justify-center gap-3 mb-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className="h-10 px-4 bg-transparent text-sm"
            disabled={flashcards.length <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <Button variant="outline" onClick={handleFlip} className="h-10 px-4 bg-transparent text-sm">
            <RotateCcw className="h-4 w-4 mr-1" />
            Flip
          </Button>

          <Button
            variant="outline"
            onClick={handleNext}
            className="h-10 px-4 bg-transparent text-sm"
            disabled={flashcards.length <= 1}
          >
            {currentCard === flashcards.length - 1 && studiedCards.has(currentCard) ? (
              <>
                <Brain className="h-4 w-4 mr-1" />
                Quiz
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Study completion message - Compact */}
        <div className="text-center">
          {allCardsStudied ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-green-800 mb-1">🎉 All Cards Studied!</h3>
              <p className="text-xs text-green-700">Use the "Quiz" button above to test your knowledge.</p>
            </div>
          ) : (
            <p className="text-xs text-gray-600">Study all cards to unlock the quiz!</p>
          )}
        </div>
      </div>
    </div>
  )
}
