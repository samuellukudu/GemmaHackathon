"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Bell, User, Trophy, Target, Clock, TrendingUp, Plus, ChevronDown, ChevronUp } from "lucide-react"
import AppShell from "./app-shell"

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

  const handleContinue = () => {
    if (showCustomInput && customTopic.trim()) {
      onStartExploration(customTopic.trim())
    } else if (selectedSubcategory) {
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
                  onKeyPress={(e) => e.key === "Enter" && canContinue && handleContinue()}
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
              {showCustomInput ? "Start Learning" : selectedSubcategory ? "Start Learning" : "Select a Topic"}
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
  const [recentTopics, setRecentTopics] = useState<string[]>([])

  useEffect(() => {
    // Load recent topics from localStorage
    const saved = localStorage.getItem("recentTopics")
    if (saved) {
      setRecentTopics(JSON.parse(saved))
    }
  }, [])

  const clearHistory = () => {
    localStorage.removeItem("recentTopics")
    // Also clear related data
    recentTopics.forEach((topic) => {
      localStorage.removeItem(`completedSteps_${topic}`)
    })
    setRecentTopics([])
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
            {recentTopics.length > 0 && (
              <Button variant="outline" onClick={clearHistory} className="text-sm bg-transparent">
                Clear All Lessons
              </Button>
            )}
          </div>

          {recentTopics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentTopics.map((topic, index) => {
                const completedSteps = JSON.parse(localStorage.getItem(`completedSteps_${topic}`) || "[]")
                const progress = (completedSteps.length / 5) * 100 // Assuming 5 steps per topic

                return (
                  <Card
                    key={index}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onStartExploration(topic)}
                  >
                    <CardContent className="p-6">
                      <h3 className="font-medium text-gray-900 mb-3">{topic}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Progress</span>
                          <span>{completedSteps.length}/5 steps</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">Click to continue</p>
                          {progress === 100 && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Trophy className="h-4 w-4" />
                              <span className="text-xs font-medium">Complete</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
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
        {recentTopics.length > 0 && (
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
                  <div className="text-2xl font-bold text-blue-600 mb-1">{recentTopics.length}</div>
                  <p className="text-sm text-gray-600">Total Lessons</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {
                      recentTopics.filter((topic) => {
                        const completedSteps = JSON.parse(localStorage.getItem(`completedSteps_${topic}`) || "[]")
                        return completedSteps.length === 5
                      }).length
                    }
                  </div>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {
                      recentTopics.filter((topic) => {
                        const completedSteps = JSON.parse(localStorage.getItem(`completedSteps_${topic}`) || "[]")
                        return completedSteps.length > 0 && completedSteps.length < 5
                      }).length
                    }
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
  const [userStats, setUserStats] = useState<UserStats>({
    totalTopicsExplored: 0,
    totalStepsCompleted: 0,
    totalQuizzesTaken: 0,
    averageQuizScore: 0,
    totalStudyTime: 0,
    streak: 0,
    lastStudyDate: "",
  })

  useEffect(() => {
    // Load user stats
    loadUserStats()
  }, [])

  const loadUserStats = () => {
    const stats = localStorage.getItem("userStats")
    if (stats) {
      setUserStats(JSON.parse(stats))
    } else {
      // Calculate stats from existing data
      calculateStatsFromData()
    }
  }

  const calculateStatsFromData = () => {
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

    // Calculate streak (simplified - days with activity)
    const lastStudyDate = localStorage.getItem("lastStudyDate") || ""
    const streak = calculateStreak(lastStudyDate)

    const calculatedStats: UserStats = {
      totalTopicsExplored: recentTopics.length,
      totalStepsCompleted,
      totalQuizzesTaken: allQuizResults.length,
      averageQuizScore: Math.round(averageScore),
      totalStudyTime: allQuizResults.length * 5, // Estimate 5 minutes per quiz
      streak,
      lastStudyDate,
    }

    setUserStats(calculatedStats)
    localStorage.setItem("userStats", JSON.stringify(calculatedStats))
  }

  const calculateStreak = (lastStudyDate: string): number => {
    if (!lastStudyDate) return 0

    const today = new Date()
    const lastDate = new Date(lastStudyDate)
    const diffTime = Math.abs(today.getTime() - lastDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Simple streak calculation - if studied within last 2 days, maintain streak
    return diffDays <= 2 ? Math.max(1, diffDays) : 0
  }

  const formatStudyTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
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
  const [recentTopics, setRecentTopics] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])

  useEffect(() => {
    // Load recent topics from localStorage
    const saved = localStorage.getItem("recentTopics")
    if (saved) {
      const topics = JSON.parse(saved)
      setRecentTopics(topics)
      generateRecommendations(topics)
    }
  }, [])

  const generateRecommendations = (topics: string[]) => {
    const allRecommendations: string[] = []

    // Generate recommendations based on learned topics
    topics.forEach((topic) => {
      const lowerTopic = topic.toLowerCase()

      // Technology recommendations
      if (lowerTopic.includes("smartphone") || lowerTopic.includes("phone") || lowerTopic.includes("mobile")) {
        allRecommendations.push(
          "How do touchscreens work?",
          "How does wireless charging work?",
          "How do phone cameras work?",
          "How does Bluetooth work?",
          "How do phone batteries work?",
          "How does face recognition work?",
        )
      } else if (lowerTopic.includes("internet") || lowerTopic.includes("wifi") || lowerTopic.includes("network")) {
        allRecommendations.push(
          "How does cloud storage work?",
          "How do routers work?",
          "How does email work?",
          "How do websites load?",
          "How does streaming work?",
          "How does cybersecurity work?",
        )
      } else if (lowerTopic.includes("electric") || lowerTopic.includes("car") || lowerTopic.includes("vehicle")) {
        allRecommendations.push(
          "How do hybrid cars work?",
          "How does regenerative braking work?",
          "How do car engines work?",
          "How does cruise control work?",
          "How do airbags work?",
          "How does anti-lock braking work?",
        )
      } else if (lowerTopic.includes("solar") || lowerTopic.includes("energy") || lowerTopic.includes("power")) {
        allRecommendations.push(
          "How do wind turbines work?",
          "How do batteries store energy?",
          "How does hydroelectric power work?",
          "How do electric grids work?",
          "How do nuclear reactors work?",
          "How do fuel cells work?",
        )
      }

      // Nature & Science recommendations
      if (lowerTopic.includes("plant") || lowerTopic.includes("photosynthesis") || lowerTopic.includes("oxygen")) {
        allRecommendations.push(
          "How do trees grow so tall?",
          "How do flowers bloom?",
          "How do seeds germinate?",
          "How do leaves change color?",
          "How do plants communicate?",
          "How do carnivorous plants work?",
        )
      } else if (
        lowerTopic.includes("earthquake") ||
        lowerTopic.includes("volcano") ||
        lowerTopic.includes("geological")
      ) {
        allRecommendations.push(
          "How do mountains form?",
          "How do tsunamis work?",
          "How are fossils formed?",
          "How do geysers work?",
          "How do caves form?",
          "How do crystals grow?",
        )
      } else if (lowerTopic.includes("weather") || lowerTopic.includes("hurricane") || lowerTopic.includes("storm")) {
        allRecommendations.push(
          "How do tornadoes form?",
          "How does lightning work?",
          "How do clouds form?",
          "How does rain happen?",
          "How do rainbows form?",
          "How do seasons change?",
        )
      }

      // Food & Cooking recommendations
      if (lowerTopic.includes("bread") || lowerTopic.includes("baking") || lowerTopic.includes("yeast")) {
        allRecommendations.push(
          "How does sourdough starter work?",
          "How do cakes rise?",
          "How does gluten work?",
          "How does pizza dough work?",
          "How do cookies spread?",
          "How does pastry work?",
        )
      } else if (lowerTopic.includes("fermentation") || lowerTopic.includes("cheese") || lowerTopic.includes("wine")) {
        allRecommendations.push(
          "How is yogurt made?",
          "How is beer brewed?",
          "How is vinegar made?",
          "How is kimchi fermented?",
          "How is chocolate made?",
          "How is coffee roasted?",
        )
      }

      // Manufacturing recommendations
      if (lowerTopic.includes("manufacturing") || lowerTopic.includes("factory") || lowerTopic.includes("production")) {
        allRecommendations.push(
          "How are smartphones assembled?",
          "How are clothes made?",
          "How are books printed?",
          "How are bottles made?",
          "How are circuits printed?",
          "How are metals forged?",
        )
      }
    })

    // Add general recommendations if no specific matches or to fill out the list
    if (allRecommendations.length === 0 && topics.length > 0) {
      allRecommendations.push(
        "How do magnets work?",
        "How does gravity work?",
        "How do vaccines work?",
        "How does memory work?",
        "How do dreams work?",
        "How does music work?",
      )
    }

    // Remove duplicates and limit to reasonable number
    const uniqueRecommendations = [...new Set(allRecommendations)]
    setRecommendations(uniqueRecommendations.slice(0, 12))
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

        {recentTopics.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <BookOpen className="h-16 w-16 mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Start learning to see recommendations</h3>
            <p className="text-gray-600 mb-6">
              Once you explore some topics, we'll suggest related subjects you might find interesting
            </p>
            <Button onClick={onBack} className="bg-blue-500 hover:bg-blue-600 text-white">
              Start Learning
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {recommendations.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recommended for You</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {recommendations.map((topic, index) => (
                    <Card
                      key={index}
                      className="hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => onStartExploration(topic)}
                    >
                      <CardContent className="p-6">
                        <h3 className="font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {topic}
                        </h3>
                        <p className="text-sm text-gray-500">Click to start learning about this topic</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* General Suggestions */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Popular Topics to Explore</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  "How do optical illusions work?",
                  "How does the human brain work?",
                  "How do black holes work?",
                  "How does DNA work?",
                  "How do antibiotics work?",
                  "How does the stock market work?",
                ].map((topic, index) => (
                  <Card
                    key={index}
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => onStartExploration(topic)}
                  >
                    <CardContent className="p-6">
                      <h3 className="font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {topic}
                      </h3>
                      <p className="text-sm text-gray-500">Click to start learning about this topic</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
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
