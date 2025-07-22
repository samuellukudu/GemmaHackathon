import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import {
  BookOpen,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Plus,
  ArrowLeft,
  BarChart3,
  Calendar,
  Award,
  Brain,
  Zap
} from 'lucide-react'
import { useLibraryStats } from '../hooks/use-library-stats'

interface MyLibraryPageProps {
  onBack: () => void
  onStartExploration: (topic: string) => void
  onShowExplore: () => void
  onShowLessons: () => void
}

export default function MyLibraryPage({
  onBack,
  onStartExploration,
  onShowExplore,
  onShowLessons,
}: MyLibraryPageProps) {
  const { stats: userStats, loading, formatStudyTime } = useLibraryStats()

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">AI Explainer Desktop</span>
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
            <Button variant="outline" onClick={onBack} className="bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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
                  <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.totalQuizzesTaken}</div>
                  <p className="text-xs text-muted-foreground">Knowledge assessments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{userStats.averageQuizScore}%</div>
                  <p className="text-xs text-muted-foreground">Quiz performance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Study Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{formatStudyTime ? formatStudyTime(userStats.totalStudyTime) : `${userStats.totalStudyTime}m`}</div>
                  <p className="text-xs text-muted-foreground">Total learning time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{userStats.streak}</div>
                  <p className="text-xs text-muted-foreground">Days in a row</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Study</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{userStats.lastStudyDate ? new Date(userStats.lastStudyDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}</div>
                  <p className="text-xs text-muted-foreground">Most recent activity</p>
                </CardContent>
              </Card>

              {/* Progress Summary Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Learning Progress</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-lg font-semibold">
                      {userStats.totalTopicsExplored > 0 ? 
                        Math.round((userStats.totalStepsCompleted / (userStats.totalTopicsExplored * 3)) * 100) : 0}%
                    </div>
                    <Progress value={userStats.totalTopicsExplored > 0 ? 
                      Math.round((userStats.totalStepsCompleted / (userStats.totalTopicsExplored * 3)) * 100) : 0} className="h-2" />
                    <p className="text-xs text-muted-foreground">Overall completion</p>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                    <Brain className="h-5 w-5" />
                    Recent Quiz Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userStats.recentQuizResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 truncate">{result.topic}</h4>
                          <p className="text-sm text-gray-500">{result.date}</p>
                        </div>
                        <Badge 
                          variant={result.score >= 80 ? "default" : result.score >= 60 ? "secondary" : "destructive"}
                          className="text-sm"
                        >
                          {result.score}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievements */}
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
                    {userStats.totalTopicsExplored >= 1 && (
                      <Badge className="mt-2" variant="secondary">Unlocked!</Badge>
                    )}
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
                    {userStats.totalQuizzesTaken >= 5 && (
                      <Badge className="mt-2" variant="secondary">Unlocked!</Badge>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-lg border ${userStats.streak >= 7 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy
                        className={`h-5 w-5 ${userStats.streak >= 7 ? "text-green-600" : "text-gray-400"}`}
                      />
                      <span className="font-medium">Week Warrior</span>
                    </div>
                    <p className="text-sm text-gray-600">Study for 7 days straight</p>
                    {userStats.streak >= 7 && (
                      <Badge className="mt-2" variant="secondary">Unlocked!</Badge>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-lg border ${userStats.totalTopicsExplored >= 10 ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-gray-200"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy
                        className={`h-5 w-5 ${userStats.totalTopicsExplored >= 10 ? "text-purple-600" : "text-gray-400"}`}
                      />
                      <span className="font-medium">Knowledge Seeker</span>
                    </div>
                    <p className="text-sm text-gray-600">Explore 10 different topics</p>
                    {userStats.totalTopicsExplored >= 10 && (
                      <Badge className="mt-2" variant="secondary">Unlocked!</Badge>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-lg border ${userStats.averageQuizScore >= 90 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy
                        className={`h-5 w-5 ${userStats.averageQuizScore >= 90 ? "text-red-600" : "text-gray-400"}`}
                      />
                      <span className="font-medium">Perfectionist</span>
                    </div>
                    <p className="text-sm text-gray-600">Maintain 90%+ quiz average</p>
                    {userStats.averageQuizScore >= 90 && (
                      <Badge className="mt-2" variant="secondary">Unlocked!</Badge>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-lg border ${userStats.totalStudyTime >= 300 ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy
                        className={`h-5 w-5 ${userStats.totalStudyTime >= 300 ? "text-indigo-600" : "text-gray-400"}`}
                      />
                      <span className="font-medium">Time Scholar</span>
                    </div>
                    <p className="text-sm text-gray-600">Study for 5+ hours total</p>
                    {userStats.totalStudyTime >= 300 && (
                      <Badge className="mt-2" variant="secondary">Unlocked!</Badge>
                    )}
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