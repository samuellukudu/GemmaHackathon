"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Trophy, ArrowRight, BarChart3 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface QuizPageProps {
  flashcards: any[]
  onBack: () => void
  onReturnHome: () => void
  onNextStep: () => void
  explanation?: any
  onShowLibrary: () => void
}

interface QuizQuestion {
  id: number
  question: string
  type: "multiple-choice" | "true-false"
  options?: string[]
  correctAnswer: string
  explanation: string
}

interface QuizResult {
  questionId: number
  userAnswer: string
  correct: boolean
}

export default function QuizPage({
  flashcards,
  onBack,
  onReturnHome,
  onNextStep,
  explanation,
  onShowLibrary,
}: QuizPageProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [results, setResults] = useState<QuizResult[]>([])
  const [showResult, setShowResult] = useState(false)
  const [quizComplete, setQuizComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    generateQuiz()
  }, [flashcards])

  const generateQuiz = async () => {
    setIsLoading(true)

    // Simulate AI quiz generation based on the current step
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const stepTitle = explanation?.step?.title || "General"
    const stepKeyPoint = explanation?.step?.keyPoint || "Key concept"

    const mockQuestions: QuizQuestion[] = [
      {
        id: 1,
        question: `What is the main purpose of ${stepTitle}?`,
        type: "multiple-choice",
        options: [
          "To provide backup functionality",
          explanation?.step?.description || "To serve the primary function",
          "To monitor other components",
          "To reduce system complexity",
        ],
        correctAnswer: explanation?.step?.description || "To serve the primary function",
        explanation: `${stepTitle} is important because: ${explanation?.step?.description}`,
      },
      {
        id: 2,
        question: `The key point about ${stepTitle.toLowerCase()} is: "${stepKeyPoint}"`,
        type: "true-false",
        correctAnswer: "true",
        explanation: `This is correct. ${stepKeyPoint}`,
      },
    ]

    setQuestions(mockQuestions)
    setIsLoading(false)
  }

  const handleAnswerSubmit = () => {
    if (!selectedAnswer) return

    const currentQ = questions[currentQuestion]
    const isCorrect = selectedAnswer.toLowerCase() === currentQ.correctAnswer.toLowerCase()

    const result: QuizResult = {
      questionId: currentQ.id,
      userAnswer: selectedAnswer,
      correct: isCorrect,
    }

    setResults((prev) => [...prev, result])
    setShowResult(true)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
      setSelectedAnswer("")
      setShowResult(false)
    } else {
      setQuizComplete(true)
      // Mark step as completed and save quiz results
      if (explanation?.currentStepIndex !== undefined) {
        const topic = explanation.parentExplanation?.topic || explanation.topic
        const completedSteps = JSON.parse(localStorage.getItem(`completedSteps_${topic}`) || "[]")
        const newCompleted = [...new Set([...completedSteps, explanation.currentStepIndex])]
        localStorage.setItem(`completedSteps_${topic}`, JSON.stringify(newCompleted))

        // Save quiz result for stats
        saveQuizResult(topic)
      }

      // Update last study date
      localStorage.setItem("lastStudyDate", new Date().toISOString())
    }
  }

  const saveQuizResult = (topic: string) => {
    const score = results.filter((r) => r.correct).length
    const percentage = Math.round((score / questions.length) * 100)

    const quizResult = {
      topic,
      score: percentage,
      totalQuestions: questions.length,
      correctAnswers: score,
      date: new Date().toISOString(),
      stepIndex: explanation?.currentStepIndex,
    }

    // Save to all quiz results
    const allResults = JSON.parse(localStorage.getItem("allQuizResults") || "[]")
    allResults.push(quizResult)
    localStorage.setItem("allQuizResults", JSON.stringify(allResults))

    // Update user stats
    updateUserStats()
  }

  const updateUserStats = () => {
    const recentTopics = JSON.parse(localStorage.getItem("recentTopics") || "[]")
    const allQuizResults = JSON.parse(localStorage.getItem("allQuizResults") || "[]")

    // Calculate total steps completed across all topics
    let totalStepsCompleted = 0
    recentTopics.forEach((topic: string) => {
      const completedSteps = JSON.parse(localStorage.getItem(`completedSteps_${topic}`) || "[]")
      totalStepsCompleted += completedSteps.length
    })

    // Calculate average quiz score
    const averageScore =
      allQuizResults.length > 0
        ? allQuizResults.reduce((sum: number, result: any) => sum + result.score, 0) / allQuizResults.length
        : 0

    const userStats = {
      totalTopicsExplored: recentTopics.length,
      totalStepsCompleted,
      totalQuizzesTaken: allQuizResults.length,
      averageQuizScore: Math.round(averageScore),
      totalStudyTime: allQuizResults.length * 5, // Estimate 5 minutes per quiz
      streak: calculateStreak(),
      lastStudyDate: new Date().toISOString(),
    }

    localStorage.setItem("userStats", JSON.stringify(userStats))
  }

  const calculateStreak = (): number => {
    const lastStudyDate = localStorage.getItem("lastStudyDate")
    if (!lastStudyDate) return 1

    const today = new Date()
    const lastDate = new Date(lastStudyDate)
    const diffTime = Math.abs(today.getTime() - lastDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // If studied within last 2 days, increment streak, otherwise reset
    return diffDays <= 2 ? diffDays + 1 : 1
  }

  const handleRetakeQuiz = () => {
    setCurrentQuestion(0)
    setSelectedAnswer("")
    setResults([])
    setShowResult(false)
    setQuizComplete(false)
  }

  const handleNextStep = () => {
    onNextStep()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <Trophy className="h-16 w-16 text-purple-600 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Preparing Your Quiz...</h2>
            <p className="text-gray-600">Creating questions from your flashcards</p>
          </div>
        </div>
      </div>
    )
  }

  const score = results.filter((r) => r.correct).length
  const progress = ((currentQuestion + (showResult ? 1 : 0)) / questions.length) * 100
  const isStepMode = explanation?.currentStepIndex !== undefined
  const isLastStep = isStepMode && explanation?.currentStepIndex === explanation?.totalSteps - 1

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100)

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-3">
        <div className="max-w-4xl mx-auto h-screen flex flex-col justify-center">
          <div className="text-center">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {isStepMode ? `Step ${explanation.currentStepIndex + 1} Complete!` : "Quiz Complete!"}
            </h1>

            <Card className="max-w-xl mx-auto mb-6">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-purple-600 mb-3">{percentage}%</div>
                <p className="text-lg text-gray-700 mb-3">
                  You scored {score} out of {questions.length} correctly!
                </p>

                <div className="space-y-2 text-left">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      {result.correct ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-700">Question {index + 1}</span>
                      <Badge variant={result.correct ? "default" : "destructive"} className="ml-auto text-xs">
                        {result.correct ? "Correct" : "Incorrect"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-center">
              <Button onClick={handleRetakeQuiz} variant="outline" className="h-10 px-6 text-sm bg-transparent">
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>

              {isStepMode && !isLastStep ? (
                <Button onClick={handleNextStep} className="h-10 px-6 text-sm">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Next Step
                </Button>
              ) : (
                <Button onClick={onReturnHome} className="h-10 px-6 text-sm">
                  {isLastStep ? "🎉 Complete!" : "New Topic"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-3">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {isStepMode ? `Step ${explanation.currentStepIndex + 1} Quiz` : "Quiz Time!"}
            </h1>
            <p className="text-sm text-gray-600 truncate">
              {isStepMode ? `Testing: ${explanation.step.title}` : "Test your knowledge"}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {currentQuestion + 1} / {questions.length}
          </Badge>
          <Button
            variant="outline"
            onClick={onShowLibrary}
            className="h-10 w-10 p-0 bg-transparent"
            title="View Library & Stats"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card - Main Content */}
        <Card className="mb-4 flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{currentQ?.question}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {currentQ?.type === "multiple-choice" && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  {currentQ.options?.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="text-sm cursor-pointer flex-1">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {currentQ?.type === "true-false" && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true" className="text-sm cursor-pointer flex-1">
                      True
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false" className="text-sm cursor-pointer flex-1">
                      False
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        {/* Result Display */}
        {showResult && (
          <Card
            className={`mb-4 ${results[results.length - 1]?.correct ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                {results[results.length - 1]?.correct ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <h3 className="text-lg font-semibold">
                  {results[results.length - 1]?.correct ? "Correct!" : "Incorrect"}
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-2">{currentQ?.explanation}</p>
              {!results[results.length - 1]?.correct && (
                <p className="text-sm font-medium text-gray-900">Correct answer: {currentQ?.correctAnswer}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Button - Fixed at bottom */}
        <div className="text-center">
          {!showResult ? (
            <Button onClick={handleAnswerSubmit} disabled={!selectedAnswer} className="h-12 px-8 text-sm" size="lg">
              Submit Answer
            </Button>
          ) : (
            <Button onClick={handleNextQuestion} className="h-12 px-8 text-sm" size="lg">
              {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Quiz"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
