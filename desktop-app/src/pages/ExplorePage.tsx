import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { 
  BookOpen, 
  Bell, 
  User, 
  Target,
  ArrowLeft,
  Brain,
  Lightbulb,
  Rocket,
  Search
} from 'lucide-react'
import { useRelatedQuestions, useRecentRelatedQuestions } from '../hooks/use-related-questions'

interface ExplorePageProps {
  onBack: () => void
  onStartExploration: (topic: string) => void
  onShowLibrary: () => void
  onShowLessons: () => void
}

export default function ExplorePage({
  onBack,
  onStartExploration,
  onShowLibrary,
  onShowLessons,
}: ExplorePageProps) {
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { state: relatedQuestionsState, fetchRelatedQuestions, clearError } = useRelatedQuestions()
  const { recentQuestions, fetchRecentQuestions } = useRecentRelatedQuestions()

  // Sample recommendations (in a real app, these would come from API)
  const [recommendations] = useState([
    "How does machine learning work?",
    "How do quantum computers work?",
    "How does blockchain technology work?",
    "How do neural networks function?",
    "How does cloud computing work?",
    "How do self-driving cars work?",
    "How does renewable energy work?",
    "How do smartphones work?",
    "How does the internet work?",
    "How do electric vehicles work?"
  ])

  const filteredRecommendations = recommendations.filter(topic =>
    topic.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    fetchRecentQuestions(10) // Load recent questions from API
  }, [])

  const handleTestRelatedQuestions = async () => {
    // Test with a sample query ID (in real app, this would be from user's history)
    const testQueryId = "b61c880c-817c-4345-8384-96e6993ab8ab"
    setSelectedQueryId(testQueryId)
    await fetchRelatedQuestions(testQueryId)
  }

  const categoryConfig = {
    basic: { 
      icon: Lightbulb, 
      color: "text-green-600 bg-green-50 border-green-200",
      title: "Basic Questions"
    },
    intermediate: { 
      icon: Brain, 
      color: "text-blue-600 bg-blue-50 border-blue-200",
      title: "Intermediate Questions"
    },
    advanced: { 
      icon: Rocket, 
      color: "text-purple-600 bg-purple-50 border-purple-200",
      title: "Advanced Questions"
    }
  }

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Explore More Topics</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover related topics and expand your knowledge beyond what you've already learned
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* AI-Generated Related Questions Section */}
        <div className="mb-12">
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
                
                const config = categoryConfig[category as keyof typeof categoryConfig]
                const IconComponent = config.icon
                
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <IconComponent className="h-5 w-5" />
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {config.title}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {questionsInCategory.map((question, index) => (
                        <Card
                          key={index}
                          className={`hover:shadow-md transition-shadow cursor-pointer group border-2 ${config.color}`}
                          onClick={() => onStartExploration(question.question)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors flex-1 pr-2">
                                {question.question}
                              </h4>
                              <Target className="h-4 w-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 mt-1" />
                            </div>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {question.focus_area || "Explore this topic to learn more"}
                            </p>
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs">
                                {category}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onStartExploration(question.question)
                                }}
                              >
                                Start Learning
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            !relatedQuestionsState.loading && !relatedQuestionsState.error && (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Related Questions Yet</h3>
                <p className="text-gray-600 mb-4">
                  Complete some lessons first, and we'll generate personalized questions for you!
                </p>
                <Button onClick={onShowLessons} variant="outline" className="bg-transparent">
                  View My Lessons
                </Button>
              </div>
            )
          )}
        </div>

        {/* Recommended Topics Section */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {searchTerm ? `Search Results for "${searchTerm}"` : "Recommended for You"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(searchTerm ? filteredRecommendations : recommendations.slice(0, 6)).map((topic, index) => (
              <Card 
                key={index} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onStartExploration(topic)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors flex-1 pr-2">
                      {topic}
                    </h3>
                    <BookOpen className="h-4 w-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 mt-1" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Discover the fundamentals and dive deep into this fascinating topic
                  </p>
                  <Button
                    size="sm"
                    className="w-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartExploration(topic)
                    }}
                  >
                    Start Learning
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {searchTerm && filteredRecommendations.length === 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">
                Try searching for a different topic or browse our recommendations
              </p>
              <Button onClick={() => setSearchTerm("")} variant="outline" className="bg-transparent">
                Clear Search
              </Button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={onShowLessons} variant="outline" className="h-16 flex flex-col gap-2 bg-transparent">
                  <BookOpen className="h-6 w-6" />
                  <span>Continue Lessons</span>
                </Button>
                <Button onClick={onShowLibrary} variant="outline" className="h-16 flex flex-col gap-2 bg-transparent">
                  <Target className="h-6 w-6" />
                  <span>View Stats</span>
                </Button>
                <Button onClick={onBack} variant="outline" className="h-16 flex flex-col gap-2 bg-transparent">
                  <Search className="h-6 w-6" />
                  <span>Start New Topic</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 