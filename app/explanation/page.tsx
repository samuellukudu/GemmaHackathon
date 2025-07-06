"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Volume2, BookOpen, Brain, CheckCircle, BarChart3 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ExplanationPageProps {
  topic: string
  currentStepIndex: number
  onBack: () => void
  onGenerateFlashcards: (explanation: any) => void
  onShowLibrary: () => void
}

interface ExplanationStep {
  title: string
  description: string
  keyPoint: string
}

interface Explanation {
  topic: string
  overview: string
  steps: ExplanationStep[]
  summary: string
  flashcards?: any[]
}

export default function ExplanationPage({
  topic,
  currentStepIndex,
  onBack,
  onGenerateFlashcards,
  onShowLibrary,
}: ExplanationPageProps) {
  const [explanation, setExplanation] = useState<Explanation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    generateExplanation()
  }, [topic])

  useEffect(() => {
    // Load completed steps from localStorage
    const saved = localStorage.getItem(`completedSteps_${topic}`)
    if (saved) {
      setCompletedSteps(new Set(JSON.parse(saved)))
    }
  }, [topic])

  const generateExplanation = async () => {
    setIsLoading(true)

    // Simulate AI explanation generation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const mockExplanation: Explanation = {
      topic: topic,
      overview: `Understanding ${topic} involves several interconnected systems working together seamlessly.`,
      steps: [
        {
          title: "Power Source",
          description: "The system begins with a reliable power source that provides the energy needed for operation.",
          keyPoint: "Energy conversion is the foundation of the entire process",
        },
        {
          title: "Control System",
          description:
            "Smart controls monitor and regulate the system's behavior, ensuring safe and efficient operation.",
          keyPoint: "Automated controls provide precision and safety",
        },
        {
          title: "Mechanical Components",
          description: "Physical parts work together to convert energy into the desired motion or output.",
          keyPoint: "Mechanical advantage multiplies force and efficiency",
        },
        {
          title: "Safety Mechanisms",
          description: "Multiple backup systems and safety features prevent accidents and ensure reliable operation.",
          keyPoint: "Redundant safety systems protect users and equipment",
        },
        {
          title: "User Interface",
          description: "Simple controls allow users to interact with the system safely and intuitively.",
          keyPoint: "User-friendly design makes complex systems accessible",
        },
      ],
      summary:
        "This system combines power, control, mechanics, safety, and user interface to achieve its purpose efficiently and safely.",
    }

    setExplanation(mockExplanation)
    setIsLoading(false)

    // Save to recent topics
    const recentTopics = JSON.parse(localStorage.getItem("recentTopics") || "[]")
    const updatedTopics = [topic, ...recentTopics.filter((t: string) => t !== topic)].slice(0, 10)
    localStorage.setItem("recentTopics", JSON.stringify(updatedTopics))
  }

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }

  const createFlashcardFromStep = (step: ExplanationStep, index: number) => {
    // Create flashcards for this specific step and go to flashcards page
    const stepFlashcards = [
      {
        id: 1,
        front: `What is ${step.title}?`,
        back: step.description,
        category: step.title,
      },
      {
        id: 2,
        front: `What is the key point about ${step.title.toLowerCase()}?`,
        back: step.keyPoint,
        category: step.title,
      },
    ]

    // Create a step-specific explanation object
    const stepExplanation = {
      topic: `${explanation?.topic} - Step ${index + 1}: ${step.title}`,
      currentStepIndex: index,
      totalSteps: explanation?.steps.length || 0,
      step: step,
      flashcards: stepFlashcards,
      parentExplanation: explanation,
    }

    onGenerateFlashcards(stepExplanation)
  }

  const markStepCompleted = (stepIndex: number) => {
    const newCompleted = new Set([...completedSteps, stepIndex])
    setCompletedSteps(newCompleted)
    localStorage.setItem(`completedSteps_${topic}`, JSON.stringify([...newCompleted]))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <Brain className="h-16 w-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Generating Explanation...</h2>
            <p className="text-gray-600">Creating a step-by-step breakdown of "{topic}"</p>
          </div>
        </div>
      </div>
    )
  }

  if (!explanation) return null

  const currentStep = explanation.steps[currentStepIndex]
  const isLastStep = currentStepIndex >= explanation.steps.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 capitalize truncate">{explanation.topic}</h1>
            <p className="text-sm text-gray-600 truncate">
              Step {currentStepIndex + 1} of {explanation.steps.length}: {currentStep?.title}
            </p>
          </div>
          <Button variant="outline" onClick={() => speakText(explanation.overview)} className="h-10 w-10 p-0">
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={onShowLibrary}
            className="h-10 w-10 p-0 bg-transparent"
            title="View Library & Stats"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bars - Compact */}
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">Course Progress</span>
              <span className="text-xs text-gray-600">
                {completedSteps.size}/{explanation.steps.length}
              </span>
            </div>
            <Progress value={(completedSteps.size / explanation.steps.length) * 100} className="h-1.5" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">Current Step</span>
              <span className="text-xs text-gray-600">
                {currentStepIndex + 1}/{explanation.steps.length}
              </span>
            </div>
            <Progress value={((currentStepIndex + 1) / explanation.steps.length) * 100} className="h-1.5" />
          </div>
        </div>

        {/* Main Content - Flexible Height */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Overview (only show on first step) - Compact */}
          {currentStepIndex === 0 && (
            <Card className="mb-3">
              <CardContent className="p-4">
                <p className="text-sm text-gray-700 leading-relaxed">{explanation.overview}</p>
              </CardContent>
            </Card>
          )}

          {/* Current Step - Main Content */}
          {currentStep && (
            <Card className="mb-3 ring-2 ring-indigo-500 shadow-lg flex-1 flex flex-col">
              <CardHeader className="pb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-2 py-1">
                    Step {currentStepIndex + 1}
                  </Badge>
                  <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                  {completedSteps.has(currentStepIndex) && <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakText(`${currentStep.title}. ${currentStep.description}`)}
                    className="ml-auto p-1"
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between py-3">
                <div>
                  <p className="text-gray-700 mb-2 text-sm leading-relaxed">{currentStep.description}</p>
                  <div className="bg-indigo-50 p-2 rounded-lg mb-2">
                    <p className="text-indigo-800 font-medium text-sm">💡 {currentStep.keyPoint}</p>
                  </div>
                </div>
                <Button
                  onClick={() => createFlashcardFromStep(currentStep, currentStepIndex)}
                  variant="outline"
                  className="w-full h-10 text-sm"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Start Learning This Step
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Steps Overview - Compact */}
          <Card className="mb-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">All Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {explanation.steps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center ${
                      index === currentStepIndex
                        ? "border-indigo-500 bg-indigo-50"
                        : completedSteps.has(index)
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <Badge variant={index === currentStepIndex ? "default" : "secondary"} className="text-xs">
                      {index + 1}
                    </Badge>
                    <span className="text-xs font-medium truncate w-full" title={step.title}>
                      {step.title}
                    </span>
                    {completedSteps.has(index) && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {index === currentStepIndex && <Badge className="text-xs px-1 py-0">Current</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary (only show on last step) - Compact */}
          {isLastStep && (
            <Card className="mb-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">{explanation.summary}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
