"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Bell,
  User,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Plus,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
} from "lucide-react"
import AppShell from "./app-shell"
import { offlineManager } from "@/lib/offline-manager"
import { useRelatedQuestions, useRecentRelatedQuestions } from "@/hooks/use-related-questions"
import { useLessonProgress } from "@/hooks/use-lesson-progress"
import { useLibraryStats } from "@/hooks/use-library-stats"

const categories = [
  {
    id: "tech",
    name: "Technology",
    subcategories: [
      "How do smartphones work?",
      "How does the internet work?",
      "How do electric cars work?",
      "How do electric cars work?",
      "How do solar panels work?",
      "How does GPS work?",
    ],
  },
  {
    id: "nature",
    name: "Nature & Science",
    subcategories: [
      "How do plants make oxygen?",
      "How do earthquakes happen?",
      "How does photosynthesis work?",
      "How do hurricanes form?",
      "How does the water cycle work?",
      "How do volcanoes erupt?",
    ],
  },
  {
    id: "food",
    name: "Food & Cooking",
    subcategories: [
      "How does bread rise?",
      "How does fermentation work?",
      "How do microwaves heat food?",
      "How does refrigeration work?",
      "How is cheese made?",
      "How does coffee brewing work?",
    ],
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    subcategories: [
      "How are cars manufactured?",
      "How is glass made?",
      "How does 3D printing work?",
      "How are computer chips made?",
      "How is paper made?",
      "How does injection molding work?",
    ],
  },
]

interface HomePageProps {
  onStartExploration: (topic: string, category?: string) => void
  onShowLibrary: () => void
  onShowExplore: () => void
  onShowLessons: () => void
}

interface UserStats {
  totalTopicsExplored: number
  totalStepsCompleted: number
  totalQuizzesTaken: number
  averageQuizScore: number
  totalStudyTime: number
  streak: number
  lastStudyDate: string
}

export function HomePage({ onStartExploration, onShowLibrary, onShowExplore, onShowLessons }: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("")
  const [customTopic, setCustomTopic] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string>("")
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Initialize offline manager and check connection status
    setIsOnline(offlineManager.getConnectionStatus())

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleCategorySelect = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory("")
    } else {
      setExpandedCategory(categoryId)
      setSelectedCategory(categoryId)
      setSelectedSubcategory("")
      setShowCustomInput(false)
      setCustomTopic("")
    }
  }

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory)
    setSelectedCategory(expandedCategory)
  }

  const handleCustomSelect = () => {
    setSelectedCategory("")
    setSelectedSubcategory("")
    setExpandedCategory("")
    setShowCustomInput(true)
    setCustomTopic("")
  }

  const handleContinue = async () => {
    if (showCustomInput && customTopic.trim()) {
      await offlineManager.saveTopicProgress(customTopic.trim())
      onStartExploration(customTopic.trim())
    } else if (selectedSubcategory) {
      await offlineManager.saveTopicProgress(selectedSubcategory, selectedCategory)
      onStartExploration(selectedSubcategory, selectedCategory)
    }
  }

  const canContinue = (showCustomInput && customTopic.trim()) || selectedSubcategory

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">AI Explainer</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <button className="text-gray-900 font-medium">Home</button>
            <button className="text-gray-500 hover:text-gray-900" onClick={() => onShowExplore()}>
              Explore
            </button>
            <button className="text-gray-500 hover:text-gray-900" onClick={onShowLessons}>
              My Lessons
            </button>
            <button className="text-gray-500 hover:text-gray-900" onClick={onShowLibrary}>
              My Library
            </button>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-orange-500" />
              )}
            </div>
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="h-5 w-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 rounded-full">
              <User className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-orange-800">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">
              You're offline. Your progress is being saved locally and will sync when you're back online.
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">What do you want to learn about?</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Enter your own topic or choose from popular categories below to get started.
          </p>
        </div>

        {/* Custom Topic Section */}
        <div className="mb-8">
          {!showCustomInput ? (
            <div className="text-center mb-8">
              <Button
                variant="outline"
                onClick={handleCustomSelect}
                className="px-6 py-3 text-base font-medium rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-transparent"
              >
                <Plus className="h-5 w-5 mr-2" />
                Enter Custom Topic
              </Button>
            </div>
          ) : (
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Input
                  placeholder="e.g., How do solar panels work?"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="text-center text-lg h-14 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && canContinue) {
                      e.preventDefault()
                      handleContinue()
                    }
                  }}
                  autoFocus
                />
                {customTopic && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomTopic("")
                      setShowCustomInput(false)
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    ×
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">
                Be specific for better explanations (e.g., "How do electric cars work?" instead of just "cars")
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm font-medium">OR</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Popular Categories with Subcategories */}
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Popular Categories</h2>
          <div className="space-y-4 mb-8">
            {categories.map((category) => (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors p-4"
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-gray-900">{category.name}</CardTitle>
                    {expandedCategory === category.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </CardHeader>

                {expandedCategory === category.id && (
                  <CardContent className="pt-0 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.subcategories.map((subcategory, index) => (
                        <Button
                          key={index}
                          variant={selectedSubcategory === subcategory ? "default" : "ghost"}
                          onClick={() => handleSubcategorySelect(subcategory)}
                          className={`justify-start text-left h-auto py-3 px-4 ${
                            selectedSubcategory === subcategory
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {subcategory}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <Button
              onClick={handleContinue}
              disabled={!canContinue}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canContinue ? "Start Learning" : "Select a Topic"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LessonsPage({
  onBack,
  onStartExploration,
  onShowExplore,
  onShowLibrary,
}: {
  onBack: () => void
  onStartExploration: (topic: string) => void
  onShowExplore: () => void
  onShowLibrary: () => void
}) {
  const { lessonProgressList, clearAllProgress, refreshProgress, cleanupDuplicates } = useLessonProgress()

  const clearHistory = async () => {
    await clearAllProgress()
    await offlineManager.clearAllData() // Also clear old data
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">AI Explainer</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <button className="text-gray-500 hover:text-gray-900" onClick={onBack}>
              Home
            </button>
            <button className="text-gray-500 hover:text-gray-900" onClick={onShowExplore}>
              Explore
            </button>
            <button className="text-gray-900 font-medium">My Lessons</button>
            <button className="text-gray-500 hover:text-gray-900" onClick={onShowLibrary}>
              My Library
            </button>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="h-5 w-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 rounded-full">
              <User className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">My Lessons</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Continue your learning journey with your ongoing lessons
          </p>
        </div>

        {/* Lessons Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Continue Learning</h2>
            {lessonProgressList.length > 0 && (
              <Button variant="outline" onClick={clearHistory} className="text-sm bg-transparent">
                Clear All Lessons
              </Button>
            )}
          </div>

          {lessonProgressList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessonProgressList.map((lessonInfo, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-medium text-gray-900 flex-1 pr-2">{lessonInfo.topic}</h3>
                      {lessonInfo.progress === 100 && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Trophy className="h-4 w-4" />
                          <span className="text-xs font-medium">Complete</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {/* Progress Section */}
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Progress</span>
                          <span className="font-medium">{lessonInfo.completedLessons}/{lessonInfo.totalLessons} steps</span>
                        </div>
                        <Progress value={lessonInfo.progress} className="h-2" />
                      </div>
                      
                      {/* Status and Continue Button */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="text-sm text-gray-500">
                            {lessonInfo.progress === 100 
                              ? 'All steps completed' 
                              : lessonInfo.lastAccessedLesson < lessonInfo.totalLessons 
                                ? `Next: Step ${lessonInfo.lastAccessedLesson + 1}`
                                : 'Ready to start'
                            }
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Last accessed: {new Date(lessonInfo.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <Button
                          onClick={() => onStartExploration(lessonInfo.topic)}
                          size="sm"
                          className="ml-4"
                          variant={lessonInfo.progress === 100 ? "outline" : "default"}
                        >
                          {lessonInfo.progress === 100 ? 'Review' : 'Continue'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-6">
                <BookOpen className="h-20 w-20 mx-auto mb-4" />
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-3">No lessons yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start learning new topics to see your lessons here. Each topic becomes a lesson you can continue
                anytime.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={onBack} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Start New Lesson
                </Button>
                <Button onClick={onShowExplore} variant="outline" className="bg-transparent">
                  Explore Topics
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {lessonProgressList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Lesson Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{lessonProgressList.length}</div>
                  <p className="text-sm text-gray-600">Total Topics</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {lessonProgressList.filter(lesson => lesson.progress === 100).length}
                  </div>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {lessonProgressList.filter(lesson => lesson.progress > 0 && lesson.progress < 100).length}
                  </div>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export function LibraryPage({
  onBack,
  onStartExploration,
  onShowExplore,
  onShowLessons,
}: {
  onBack: () => void
  onStartExploration: (topic: string) => void
  onShowExplore: () => void
  onShowLessons: () => void
}) {
  const { stats: userStats, loading, formatStudyTime } = useLibraryStats()

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">AI Explainer</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <button className="text-gray-500 hover:text-gray-900" onClick={onBack}>
              Home
            </button>
            <button className="text-gray-500 hover:text-gray-900" onClick={onShowExplore}>
              Explore
            </button>
            <button className="text-gray-500 hover:text-gray-900" onClick={onShowLessons}>
              My Lessons
            </button>
            <button className="text-gray-900 font-medium">My Library</button>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="h-5 w-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 rounded-full">
              <User className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">My Library</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Your learning progress and achievements</p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your stats...</p>
          </div>
        ) : (
          <>
        

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Topics Explored</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalTopicsExplored}</div>
              <p className="text-xs text-muted-foreground">Total subjects learned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Steps Completed</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalStepsCompleted}</div>
              <p className="text-xs text-muted-foreground">Learning milestones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quiz Average</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.averageQuizScore}%</div>
              <p className="text-xs text-muted-foreground">Across {userStats.totalQuizzesTaken} quizzes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatStudyTime(userStats.totalStudyTime)}</div>
              <p className="text-xs text-muted-foreground">Total learning time</p>
            </CardContent>
          </Card>
        </div>

        {/* Learning Progress */}
        {userStats.totalTopicsExplored > 0 && (
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Learning Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Completion</span>
                    <span>
                      {Math.round((userStats.totalStepsCompleted / (userStats.totalTopicsExplored * 5)) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(userStats.totalStepsCompleted / (userStats.totalTopicsExplored * 5)) * 100}
                    className="h-2"
                  />
                </div>

                {userStats.streak > 0 && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <Trophy className="h-4 w-4" />
                    <span>{userStats.streak} day learning streak!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={onShowLessons} variant="outline" className="h-16 flex flex-col gap-2 bg-transparent">
                <BookOpen className="h-6 w-6" />
                <span>Continue Lessons</span>
              </Button>
              <Button onClick={onShowExplore} variant="outline" className="h-16 flex flex-col gap-2 bg-transparent">
                <Target className="h-6 w-6" />
                <span>Explore Topics</span>
              </Button>
              <Button onClick={onBack} variant="outline" className="h-16 flex flex-col gap-2 bg-transparent">
                <Plus className="h-6 w-6" />
                <span>Start New Topic</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Quiz Results */}
        {userStats.recentQuizResults && userStats.recentQuizResults.length > 0 && (
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recent Quiz Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userStats.recentQuizResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{result.topic}</p>
                      <p className="text-xs text-gray-500">{result.date}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-sm font-medium ${
                      result.score >= 80 ? 'bg-green-100 text-green-800' :
                      result.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.score}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Achievements Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`p-4 rounded-lg border ${userStats.totalTopicsExplored >= 1 ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy
                    className={`h-5 w-5 ${userStats.totalTopicsExplored >= 1 ? "text-yellow-600" : "text-gray-400"}`}
                  />
                  <span className="font-medium">First Explorer</span>
                </div>
                <p className="text-sm text-gray-600">Complete your first topic</p>
              </div>

              <div
                className={`p-4 rounded-lg border ${userStats.totalQuizzesTaken >= 5 ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy
                    className={`h-5 w-5 ${userStats.totalQuizzesTaken >= 5 ? "text-blue-600" : "text-gray-400"}`}
                  />
                  <span className="font-medium">Quiz Master</span>
                </div>
                <p className="text-sm text-gray-600">Take 5 quizzes</p>
              </div>

              <div
                className={`p-4 rounded-lg border ${userStats.averageQuizScore >= 80 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy
                    className={`h-5 w-5 ${userStats.averageQuizScore >= 80 ? "text-green-600" : "text-gray-400"}`}
                  />
                  <span className="font-medium">High Achiever</span>
                </div>
                <p className="text-sm text-gray-600">Maintain 80% quiz average</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </>
        )}
      </div>
    </div>
  )
}

export function ExplorePage({
  onBack,
  onStartExploration,
  onShowLibrary,
  onShowLessons,
}: {
  onBack: () => void
  onStartExploration: (topic: string) => void
  onShowLibrary: () => void
  onShowLessons: () => void
}) {
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const { state: relatedQuestionsState, fetchRelatedQuestions, clearError } = useRelatedQuestions()
  const { recentQuestions, fetchRecentQuestions } = useRecentRelatedQuestions()

  useEffect(() => {
    fetchRecentQuestions(10) // Load recent questions from API
  }, [])

  const handleTestRelatedQuestions = async () => {
    // Test with the query ID from your example
    const testQueryId = "b61c880c-817c-4345-8384-96e6993ab8ab"
    setSelectedQueryId(testQueryId)
    await fetchRelatedQuestions(testQueryId)
  }

  // Note: Removed automatic loading of related questions to prevent 404 errors
  // Users can manually load related questions using the "Load Related Questions" button



  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">AI Explainer</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <button className="text-gray-500 hover:text-gray-900" onClick={onBack}>
              Home
            </button>
            <button className="text-gray-900 font-medium">Explore</button>
            <button className="text-gray-500 hover:text-gray-900" onClick={onShowLessons}>
              My Lessons
            </button>
            <button className="text-gray-500 hover:text-gray-900" onClick={onShowLibrary}>
              My Library
            </button>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="h-5 w-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 rounded-full">
              <User className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Explore More Topics</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover related topics based on what you've already learned
          </p>
        </div>

        {/* AI-Generated Related Questions Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">AI-Generated Related Questions</h2>
            <Button onClick={handleTestRelatedQuestions} variant="outline" className="bg-transparent">
              Load Related Questions
            </Button>
          </div>
          
          {relatedQuestionsState.loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading related questions...</p>
            </div>
          )}
          
          {relatedQuestionsState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">Error: {relatedQuestionsState.error}</p>
              <Button onClick={clearError} variant="outline" className="mt-2 bg-transparent">
                Try Again
              </Button>
            </div>
          )}
          
          {relatedQuestionsState.questions.length > 0 ? (
            <div className="space-y-6">
              {/* Questions by Category */}
              {['basic', 'intermediate', 'advanced'].map((category) => {
                const questionsInCategory = relatedQuestionsState.questions.filter(q => q.category === category)
                if (questionsInCategory.length === 0) return null
                
                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                      {category} Questions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {questionsInCategory.map((question, index) => (
                        <Card
                          key={index}
                          className="hover:shadow-md transition-shadow cursor-pointer group"
                          onClick={() => onStartExploration(question.question)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <Badge 
                                variant={category === 'basic' ? 'secondary' : category === 'intermediate' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {question.focus_area}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {category}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors text-sm leading-relaxed">
                              {question.question}
                            </h4>
                            <p className="text-xs text-gray-500">Click to start learning about this topic</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}
              
              {relatedQuestionsState.processingTime && (
                <div className="text-center text-sm text-gray-500">
                  Generated in {relatedQuestionsState.processingTime.toFixed(2)} seconds
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <BookOpen className="h-16 w-16 mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No related questions yet</h3>
              <p className="text-gray-600 mb-6">
                Click "Load Related Questions" above to see AI-generated questions based on recent topics
              </p>
              <Button onClick={onBack} className="bg-blue-500 hover:bg-blue-600 text-white">
                Start Learning
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  useEffect(() => {
    // Register service worker for PWA functionality
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration)
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError)
        })
    }
  }, [])

  return <AppShell />
}
