"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BookOpen, Brain, CheckCircle, BarChart3, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { offlineManager } from "@/lib/offline-manager"
import { useApiQuery } from "@/hooks/use-api-query"
import { useLessons } from "@/hooks/use-lessons"
import { Lesson } from "@/types/api"

interface ExplanationPageProps {
  topic: string
  currentStepIndex: number
  isUserQuery?: boolean
  onBack: () => void
  onGenerateFlashcards: (explanation: any) => void
  onShowLibrary: () => void
  onStepNavigation?: (stepIndex: number) => void
}

// Remove old interfaces - we'll use the Lesson interface from types/api.ts

export default function ExplanationPage({
  topic,
  currentStepIndex,
  isUserQuery = true,
  onBack,
  onGenerateFlashcards,
  onShowLibrary,
  onStepNavigation,
}: ExplanationPageProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const { state: apiState, submitQuery, clearError } = useApiQuery()
  const { state: lessonsState, fetchLessons, clearError: clearLessonsError } = useLessons()

  const loadCompletedSteps = async () => {
    const steps = await offlineManager.getCompletedSteps(topic)
    setCompletedSteps(new Set(steps))
  }

  const generateExplanation = useCallback(async () => {
    // First, try to get lessons from API if we have a query ID
    if (apiState.queryId && !lessonsState.lessons.length && !lessonsState.loading) {
      try {
        await fetchLessons(apiState.queryId)
        return
      } catch (error) {
        console.warn('Failed to fetch lessons from API:', error)
      }
    }

    // If no API data yet, try to submit a query
    if (!apiState.loading && !apiState.queryId && !apiState.error) {
      try {
        await submitQuery(topic, 'user-001') // Default user ID
        return
      } catch (error) {
        console.warn('Failed to submit query to API:', error)
      }
    }

    // Check for cached explanation as fallback
    const cachedExplanation = await offlineManager.getExplanation(topic)
    if (cachedExplanation && !lessonsState.lessons.length) {
      // Convert cached explanation to lessons format for consistency
      const lessons: Lesson[] = cachedExplanation.steps?.map((step: any) => ({
        title: step.title || 'Untitled Lesson',
        overview: step.description || 'No overview available',
        key_concepts: step.keyPoint ? [step.keyPoint] : [],
        examples: [],
      })) || []
      
      // Manually set lessons state (this is a fallback)
      // In a real app, you might want to create a setter for this
      console.log('Using cached explanation as fallback:', lessons)
    }
  }, [topic, apiState, lessonsState, submitQuery, fetchLessons])

  useEffect(() => {
    generateExplanation()
  }, [generateExplanation])

  useEffect(() => {
    loadCompletedSteps()
  }, [topic])

  // Track lesson access when component mounts or step changes
  useEffect(() => {
    if (apiState.queryId && currentStepIndex !== undefined) {
      // Save lesson access progress (not completed, just accessed)
      offlineManager.saveLessonProgress(apiState.queryId, currentStepIndex, false)
      
      // Save topic info for later reference (only for user queries)
      if (lessonsState.lessons.length > 0) {
        offlineManager.saveTopicInfo(apiState.queryId, topic, lessonsState.lessons.length, isUserQuery)
      }
    }
  }, [apiState.queryId, currentStepIndex, topic, lessonsState.lessons.length])

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



  const createFlashcardFromLesson = async (lesson: Lesson, index: number) => {
    // Mark this lesson as completed when user starts learning it
    if (apiState.queryId) {
      await offlineManager.saveLessonProgress(apiState.queryId, index, true)
      setCompletedSteps(prev => new Set([...prev, index]))
    }

    // Create flashcards for this specific lesson and go to flashcards page
    const lessonFlashcards = [
      {
        id: 1,
        front: `What is ${lesson.title}?`,
        back: lesson.overview,
        category: lesson.title,
      },
      ...lesson.key_concepts.map((concept, idx) => ({
        id: idx + 2,
        front: `What is the key concept: ${concept}?`,
        back: lesson.examples[idx] || `This relates to ${lesson.title}`,
        category: lesson.title,
      })),
    ]

    // Create a lesson-specific explanation object
    const lessonExplanation = {
      topic: `${topic} - Lesson ${index + 1}: ${lesson.title}`,
      currentStepIndex: index,
      totalSteps: lessonsState.lessons.length,
      lesson: lesson,
      flashcards: lessonFlashcards,
      parentLessons: lessonsState.lessons,
      queryId: apiState.queryId, // Pass query ID for API integration
    }

    onGenerateFlashcards(lessonExplanation)
  }

  if (apiState.loading || lessonsState.loading || (!lessonsState.lessons.length && !apiState.error && !lessonsState.error)) {
    // Determine current generation phase based on progress message
    const getGenerationPhase = () => {
      if (!apiState.progress) return { phase: 'Starting', progress: 10 }
      
      if (apiState.progress.includes('submitted') || apiState.progress.includes('Submitting')) {
        return { phase: 'Generating lessons and related questions', progress: 25 }
      } else if (apiState.progress.includes('Lessons ready')) {
        return { phase: 'Lessons complete, generating flashcards', progress: 60 }
      } else if (apiState.progress.includes('Related questions ready')) {
        return { phase: 'Generating flashcards from lesson content', progress: 75 }
      } else if (apiState.progress.includes('Flashcards ready')) {
        return { phase: 'Creating quiz questions', progress: 90 }
      } else {
        return { phase: 'Preparing your learning experience', progress: 15 }
      }
    }
    
    const { phase, progress } = getGenerationPhase()
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <Brain className="h-16 w-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Creating Your Learning Experience
            </h2>
            <p className="text-gray-600 mb-6">Building a comprehensive breakdown of "{topic}"</p>
            
            {/* Sequential Progress Display */}
            <div className="max-w-md mx-auto space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{phase}</span>
                  <span className="text-sm text-gray-500">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              
              {/* Generation Steps */}
              <div className="text-left space-y-2 text-sm">
                <div className={`flex items-center gap-2 ${progress >= 25 ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${progress >= 25 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>Lessons & Related Questions {progress >= 60 ? '✓' : progress >= 25 ? '(in progress)' : ''}</span>
                </div>
                <div className={`flex items-center gap-2 ${progress >= 75 ? 'text-green-600' : progress >= 60 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${progress >= 75 ? 'bg-green-500' : progress >= 60 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <span>Flashcards {progress >= 75 ? '✓' : progress >= 60 ? '(in progress)' : '(waiting for lessons)'}</span>
                </div>
                <div className={`flex items-center gap-2 ${progress >= 90 ? 'text-green-600' : progress >= 75 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${progress >= 90 ? 'bg-green-500' : progress >= 75 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <span>Quiz Questions {progress >= 90 ? '✓' : progress >= 75 ? '(in progress)' : '(waiting for flashcards)'}</span>
                </div>
              </div>
              
              {apiState.progress && (
                <p className="text-xs text-gray-500 mt-4 italic">{apiState.progress}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if API failed and no lessons
  if ((apiState.error || lessonsState.error) && !lessonsState.lessons.length) {
    return (
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
    )
  }

  if (!lessonsState.lessons.length) return null

  const currentLesson = lessonsState.lessons[currentStepIndex]
  const isLastStep = currentStepIndex >= lessonsState.lessons.length - 1

  return (
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
                        {currentLesson.key_concepts.map((concept, idx) => (
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
                        {currentLesson.examples.map((example, idx) => (
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
                    onClick={() => onStepNavigation?.(index)}
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
  )
}
