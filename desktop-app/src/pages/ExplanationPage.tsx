import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { ArrowLeft, BookOpen, Brain, CheckCircle, BarChart3, AlertCircle } from "lucide-react"
import { Progress } from "../components/ui/progress"
import { Alert, AlertDescription } from "../components/ui/alert"
import Navbar from "../components/Navbar"
import { useApiQuery } from "../hooks/use-api-query"
import { useLessons } from "../hooks/use-lessons"
import { Lesson } from "../types/api"
import TaskTracker from "../components/TaskTracker"
import { offlineManager } from "@/lib/offline-manager"

interface ExplanationPageProps {
  topic: string
  currentStepIndex: number
  isUserQuery?: boolean
  onBack: () => void
  onGenerateFlashcards: (explanation: any) => void
  onShowLibrary: () => void
  onShowExplore: () => void
  onStepNavigation: (stepIndex: number) => void
}

export default function ExplanationPage({
  topic = "Artificial Intelligence",
  currentStepIndex = 0,
  isUserQuery = true,
  onBack = () => {},
  onGenerateFlashcards = () => {},
  onShowLibrary = () => {},
  onShowExplore = () => {},
  onStepNavigation = () => {},
}: Partial<ExplanationPageProps>) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const { state: apiState, taskTracker, submitQuery, clearError } = useApiQuery()
  const { state: lessonsState, fetchLessons, clearError: clearLessonsError } = useLessons()

  const loadCompletedSteps = async () => {
    if (apiState.queryId) {
      try {
        const progress = await offlineManager.getLessonProgress(apiState.queryId)
        const completedStepIndices = Object.entries(progress)
          .filter(([_, data]) => data.completed)
          .map(([index]) => parseInt(index))
        setCompletedSteps(new Set(completedStepIndices))

      } catch (error) {

      }
    }
  }

  const generateExplanation = useCallback(async () => {
    // First, try to get lessons from API if we have a query ID
    if (apiState.queryId && !lessonsState.lessons.length && !lessonsState.loading) {
      try {
        await fetchLessons(apiState.queryId)
        return
      } catch (error) {

      }
    }

    // If no API data yet, try to submit a query
    if (!apiState.loading && !apiState.queryId && !apiState.error) {
      try {
        await submitQuery(topic, 'user-001') // Default user ID
        return
      } catch (error) {

      }
    }
  }, [topic, apiState, lessonsState, submitQuery, fetchLessons])

  useEffect(() => {
    generateExplanation()
  }, [generateExplanation])

  // Load completed steps when queryId changes
  useEffect(() => {
    loadCompletedSteps()
  }, [apiState.queryId])

  // Track lesson access when component mounts or step changes
  useEffect(() => {
    if (apiState.queryId && currentStepIndex !== undefined) {
      // Save lesson access progress (not completed, just accessed)

      offlineManager.saveLessonProgress(apiState.queryId, currentStepIndex, false)
      
      // Save topic info for later reference (only for user queries)
      if (lessonsState.lessons.length > 0 && isUserQuery) {

        offlineManager.saveTopicInfo(apiState.queryId, topic, lessonsState.lessons.length, isUserQuery)
      }
    }
  }, [apiState.queryId, currentStepIndex, topic, lessonsState.lessons.length, isUserQuery])

  // Watch for API state changes and fetch lessons (only for fresh queries)
  useEffect(() => {
    if (apiState.queryId && !lessonsState.lessons.length && !lessonsState.loading && !lessonsState.error) {
      // Only fetch if this is a fresh query (has recent activity)
      const isRecentQuery = apiState.loading || (apiState.progress && apiState.progress !== 'idle')
      if (isRecentQuery) {
        fetchLessons(apiState.queryId)
      }
    }
  }, [apiState.queryId, lessonsState.lessons.length, lessonsState.loading, lessonsState.error, fetchLessons, apiState.loading, apiState.progress])

  const handleNavigate = (page: string) => {
    switch (page) {
      case "home":
        onBack()
        break
      case "library":
        onShowLibrary()
        break
      case "explore":
        onShowExplore()
        break
      default:
        // Handle other navigation
        break
    }
  }



  const createFlashcardFromLesson = async (lesson: Lesson, stepIndex: number) => {
    // Mark this lesson as completed when user starts learning it
    if (apiState.queryId) {

      await offlineManager.saveLessonProgress(apiState.queryId, stepIndex, true)
      setCompletedSteps(prev => new Set([...prev, stepIndex]))
    }

    // Extract meaningful data for flashcard generation
    const explanation = {
      queryId: apiState.queryId,
      currentStepIndex: stepIndex,
      lesson: lesson,
      topic: topic,
      totalSteps: lessonsState.lessons.length
    }
    
    onGenerateFlashcards(explanation)
  }

  // Show task tracking during content generation
  if (apiState.loading || taskTracker.state.tasks.length > 0 && !taskTracker.state.isComplete) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />

        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 capitalize truncate">{topic}</h1>
                <p className="text-sm text-gray-600">Generating comprehensive learning content...</p>
              </div>
            </div>

            {/* Task Tracker - The main feature! */}
            <div className="flex justify-center">
              <TaskTracker
                tasks={taskTracker.state.tasks}
                overallProgress={taskTracker.state.overallProgress}
                isComplete={taskTracker.state.isComplete}
                hasErrors={taskTracker.state.hasErrors}
                startTime={taskTracker.state.startTime}
                completedTime={taskTracker.state.completedTime}
                className="mb-6"
              />
            </div>

            {/* Helpful information */}
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-6 text-center">
                <Brain className="h-12 w-12 text-indigo-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Creating Your Learning Experience
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Our AI is generating personalized lessons, flashcards, quizzes, and related questions 
                  to help you master "{topic}". You can see the progress above.
                </p>
                
                {/* Show current progress message if available */}
                {apiState.progress && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm font-medium">
                      {apiState.progress}
                    </p>
                  </div>
                )}

                {/* Task completion summary */}
                {taskTracker.state.tasks.length > 0 && (
                  <div className="mt-4 text-xs text-gray-500">
                    <p>
                      {taskTracker.getCompletedTasks().length} of {taskTracker.state.tasks.length} tasks completed
                    </p>
                    {taskTracker.state.hasErrors && (
                      <p className="text-red-600 mt-1">
                        Some tasks encountered issues, but we'll continue with available content.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if API failed and no lessons
  if ((apiState.error || lessonsState.error) && !lessonsState.lessons.length) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar 
          currentPage="lessons" 
          isOnline={true} 
          onNavigate={handleNavigate}
        />

        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Error Loading Explanation</h1>
            </div>
            
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load lessons: {apiState.error || lessonsState.error}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button onClick={() => {
                clearError()
                clearLessonsError()
                taskTracker.reset()
                generateExplanation()
              }}>
                Try Again
              </Button>
              <Button variant="outline" onClick={onBack}>
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!lessonsState.lessons.length) return null

  const currentLesson = lessonsState.lessons[currentStepIndex]
  const isLastStep = currentStepIndex >= lessonsState.lessons.length - 1

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <Navbar 
        currentPage="lessons" 
        isOnline={true} 
        onNavigate={handleNavigate}
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3">
        <div className="max-w-4xl mx-auto h-screen flex flex-col">
          {/* Header - Compact */}
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 capitalize truncate">{topic}</h1>
              <p className="text-sm text-gray-600 truncate">
                Lesson {currentStepIndex + 1} of {lessonsState.lessons.length}: {currentLesson?.title}
              </p>
            </div>

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
                <span className="text-xs font-medium text-gray-700">Current Step</span>
                <span className="text-xs text-gray-600">
                  {currentStepIndex + 1}/{lessonsState.lessons.length}
                </span>
              </div>
              <Progress value={((currentStepIndex + 1) / lessonsState.lessons.length) * 100} className="h-1.5" />
            </div>
          </div>

          {/* Main Content - Flexible Height */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Overview (only show on first lesson) - Compact */}
            {currentStepIndex === 0 && lessonsState.lessons.length > 0 && (
              <Card className="mb-3">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    AI-generated lessons for: {topic}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Current Lesson - Main Content */}
            {currentLesson && (
              <Card className="mb-3 ring-2 ring-indigo-500 shadow-lg flex-1 flex flex-col">
                <CardHeader className="pb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm px-2 py-1">
                      Lesson {currentStepIndex + 1}
                    </Badge>
                    <CardTitle className="text-lg">{currentLesson.title}</CardTitle>
                    {completedSteps.has(currentStepIndex) && <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />}

                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between py-3">
                  <div>
                    <p className="text-gray-700 mb-3 text-sm leading-relaxed">{currentLesson.overview}</p>
                    
                    {/* Key Concepts */}
                    {currentLesson.key_concepts.length > 0 && (
                      <div className="bg-indigo-50 p-3 rounded-lg mb-3">
                        <h4 className="text-indigo-800 font-medium text-sm mb-2">🔑 Key Concepts:</h4>
                        <ul className="text-indigo-700 text-sm space-y-1">
                          {currentLesson.key_concepts.map((concept: string, idx: number) => (
                            <li key={idx} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{concept}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Examples */}
                    {currentLesson.examples.length > 0 && (
                      <div className="bg-green-50 p-3 rounded-lg mb-2">
                        <h4 className="text-green-800 font-medium text-sm mb-2">💡 Examples:</h4>
                        <ul className="text-green-700 text-sm space-y-1">
                          {currentLesson.examples.map((example: string, idx: number) => (
                            <li key={idx} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => createFlashcardFromLesson(currentLesson, currentStepIndex)}
                    variant="outline"
                    className="w-full h-10 text-sm"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Start Learning This Lesson
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Lessons Overview - Compact */}
            <Card className="mb-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">All Lessons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {lessonsState.lessons.map((lesson, index) => (
                    <div
                      key={index}
                      onClick={() => onStepNavigation(index)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center cursor-pointer hover:shadow-md transition-all duration-200 ${
                        index === currentStepIndex
                          ? "border-indigo-500 bg-indigo-50 hover:bg-indigo-100"
                          : completedSteps.has(index)
                            ? "border-green-500 bg-green-50 hover:bg-green-100"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <Badge variant={index === currentStepIndex ? "default" : "secondary"} className="text-xs">
                        {index + 1}
                      </Badge>
                      <span className="text-xs font-medium truncate w-full" title={lesson.title}>
                        {lesson.title}
                      </span>
                      {completedSteps.has(index) && <CheckCircle className="h-3 w-3 text-green-500" />}
                      {index === currentStepIndex && <Badge className="text-xs px-1 py-0">Current</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary (only show on last lesson) - Compact */}
            {isLastStep && lessonsState.processingTime && (
              <Card className="mb-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    You've completed all {lessonsState.lessons.length} lessons about {topic}!
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Generated in {lessonsState.processingTime.toFixed(2)} seconds
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}