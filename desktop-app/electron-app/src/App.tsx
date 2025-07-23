import React, { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
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
} from 'lucide-react';
import { Topic, UserStats } from './types/database';

// Categories from the original app
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
];

type Page = 'home' | 'explore' | 'lessons' | 'library' | 'explanation' | 'flashcards' | 'quiz';

interface AppProps {
  onStartExploration: (topic: string, category?: string) => void;
  onShowLibrary: () => void;
  onShowExplore: () => void;
  onShowLessons: () => void;
}

export function HomePage({ onStartExploration, onShowLibrary, onShowExplore, onShowLessons }: AppProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [customTopic, setCustomTopic] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string>("");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check if we're in Electron environment
    if (window.electronAPI) {
      setIsOnline(true); // Electron apps are typically always "online"
    }
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory("");
    } else {
      setExpandedCategory(categoryId);
      setSelectedCategory(categoryId);
      setSelectedSubcategory("");
      setShowCustomInput(false);
      setCustomTopic("");
    }
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSelectedCategory(expandedCategory);
  };

  const handleCustomSelect = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setExpandedCategory("");
    setShowCustomInput(true);
    setCustomTopic("");
  };

  const handleContinue = async () => {
    if (showCustomInput && customTopic.trim()) {
      onStartExploration(customTopic.trim());
    } else if (selectedSubcategory) {
      onStartExploration(selectedSubcategory, selectedCategory);
    }
  };

  const canContinue = (showCustomInput && customTopic.trim()) || selectedSubcategory;

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
            <button className="text-gray-900 font-medium">Home</button>
            <button className="text-gray-500 hover:text-gray-900" onClick={onShowExplore}>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Learn Anything with AI
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Explore topics, take quizzes, and master new concepts with our AI-powered learning platform
          </p>
        </div>

        {/* Topic Selection */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Categories */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Choose a Category</h2>
              {categories.map((category) => (
                <div key={category.id} className="border rounded-lg">
                  <button
                    onClick={() => handleCategorySelect(category.id)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{category.name}</span>
                    {expandedCategory === category.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  {expandedCategory === category.id && (
                    <div className="border-t p-4 space-y-2">
                      {category.subcategories.map((subcategory, index) => (
                        <button
                          key={index}
                          onClick={() => handleSubcategorySelect(subcategory)}
                          className={`w-full text-left p-2 rounded hover:bg-gray-100 ${
                            selectedSubcategory === subcategory ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {subcategory}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Custom Topic */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Or Ask Your Own Question</h2>
              <Card>
                <CardContent className="p-6">
                  {showCustomInput ? (
                    <div className="space-y-4">
                      <Input
                        placeholder="What would you like to learn about?"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        className="w-full"
                      />
                      <Button
                        onClick={() => setShowCustomInput(false)}
                        variant="outline"
                        className="w-full"
                      >
                        Back to Categories
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleCustomSelect}
                      variant="outline"
                      className="w-full h-32 flex flex-col items-center justify-center gap-2"
                    >
                      <Plus className="h-8 w-8" />
                      <span>Ask a Custom Question</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Continue Button */}
          <div className="mt-8 text-center">
            <Button
              onClick={handleContinue}
              disabled={!canContinue}
              size="lg"
              className="px-8 py-3"
            >
              Start Learning
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LessonsPage({
  onBack,
  onStartExploration,
  onShowExplore,
  onShowLibrary,
}: {
  onBack: () => void;
  onStartExploration: (topic: string) => void;
  onShowExplore: () => void;
  onShowLibrary: () => void;
}) {
  const [recentTopics, setRecentTopics] = useState<string[]>([]);

  useEffect(() => {
    // Load recent topics from localStorage lesson progress
    const loadRecentTopics = async () => {
      try {
        const topics: string[] = [];
        // Get topics from localStorage lesson progress
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('topic_info_')) {
            const topicData = localStorage.getItem(key);
            if (topicData) {
              const parsed = JSON.parse(topicData);
              if (parsed.topic && !topics.includes(parsed.topic)) {
                topics.push(parsed.topic);
              }
            }
          }
        }
        // Sort by most recent and take first 3
        setRecentTopics(topics.slice(0, 3));
      } catch (error) {

        setRecentTopics([]);
      }
    };
    loadRecentTopics();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">My Lessons</span>
          </div>
          <Button onClick={onBack} variant="outline">
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Recent Lessons</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentTopics.map((topic, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">{topic}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => onStartExploration(topic)}
                  className="w-full"
                >
                  Continue Learning
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LibraryPage({
  onBack,
  onStartExploration,
  onShowExplore,
  onShowLessons,
}: {
  onBack: () => void;
  onStartExploration: (topic: string) => void;
  onShowExplore: () => void;
  onShowLessons: () => void;
}) {
  const [userStats, setUserStats] = useState<UserStats>({
    totalTopicsExplored: 12,
    totalStepsCompleted: 48,
    totalQuizzesTaken: 8,
    averageQuizScore: 85,
    totalStudyTime: 360,
    streak: 5,
    lastStudyDate: "2024-01-15"
  });

  const formatStudyTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">My Library</span>
          </div>
          <Button onClick={onBack} variant="outline">
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Learning Stats</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Topics Explored
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{userStats.totalTopicsExplored}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{userStats.averageQuizScore}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Study Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{formatStudyTime(userStats.totalStudyTime)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{userStats.streak} days</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ExplorePage({
  onBack,
  onStartExploration,
  onShowLibrary,
  onShowLessons,
}: {
  onBack: () => void;
  onStartExploration: (topic: string) => void;
  onShowLibrary: () => void;
  onShowLessons: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    const loadRecentTopics = async () => {
      // This would load from database
      setRecentTopics([
        "How do solar panels work?",
        "How does the internet work?",
        "How do electric cars work?"
      ]);
    };
    loadRecentTopics();
  }, []);

  const generateRecommendations = (topics: string[]) => {
    // This would generate AI recommendations based on user history
    return [
      "How does machine learning work?",
      "How do quantum computers work?",
      "How does blockchain technology work?",
      "How do neural networks function?",
      "How does cloud computing work?",
      "How do self-driving cars work?"
    ];
  };

  useEffect(() => {
    setRecommendations(generateRecommendations(recentTopics));
  }, [recentTopics]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">Explore</span>
          </div>
          <Button onClick={onBack} variant="outline">
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Explore New Topics</h1>
        
        {/* Search */}
        <div className="mb-8">
          <Input
            placeholder="Search for topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Recommendations */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Recommended for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((topic, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{topic}</h3>
                  <Button
                    onClick={() => onStartExploration(topic)}
                    size="sm"
                    className="w-full"
                  >
                    Start Learning
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentTopic, setCurrentTopic] = useState<string>('');

  const handleStartExploration = (topic: string, category?: string) => {
    setCurrentTopic(topic);
    setCurrentPage('explanation');
  };

  const handleShowLibrary = () => setCurrentPage('library');
  const handleShowExplore = () => setCurrentPage('explore');
  const handleShowLessons = () => setCurrentPage('lessons');
  const handleBack = () => setCurrentPage('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onStartExploration={handleStartExploration}
            onShowLibrary={handleShowLibrary}
            onShowExplore={handleShowExplore}
            onShowLessons={handleShowLessons}
          />
        );
      case 'lessons':
        return (
          <LessonsPage
            onBack={handleBack}
            onStartExploration={handleStartExploration}
            onShowExplore={handleShowExplore}
            onShowLibrary={handleShowLibrary}
          />
        );
      case 'library':
        return (
          <LibraryPage
            onBack={handleBack}
            onStartExploration={handleStartExploration}
            onShowExplore={handleShowExplore}
            onShowLessons={handleShowLessons}
          />
        );
      case 'explore':
        return (
          <ExplorePage
            onBack={handleBack}
            onStartExploration={handleStartExploration}
            onShowLibrary={handleShowLibrary}
            onShowLessons={handleShowLessons}
          />
        );
      default:
        return (
          <HomePage
            onStartExploration={handleStartExploration}
            onShowLibrary={handleShowLibrary}
            onShowExplore={handleShowExplore}
            onShowLessons={handleShowLessons}
          />
        );
    }
  };

  return (
    <div className="App">
      {renderPage()}
    </div>
  );
}