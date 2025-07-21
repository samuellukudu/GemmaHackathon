import React from "react"
import { Button } from "../components/ui/button"
import { ArrowLeft } from "lucide-react"
import Navbar from "../components/Navbar"

interface LibraryPageProps {
  onBack?: () => void
  onShowExplore?: () => void
  onShowLessons?: () => void
}

export default function LibraryPage({
  onBack = () => {},
  onShowExplore = () => {},
  onShowLessons = () => {},
}: LibraryPageProps) {
  const handleNavigate = (page: string) => {
    switch (page) {
      case "home":
        onBack()
        break
      case "explore":
        onShowExplore()
        break
      case "lessons":
        onShowLessons()
        break
      default:
        break
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar 
        currentPage="library" 
        isOnline={true} 
        onNavigate={handleNavigate}
      />
      
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" onClick={onBack} className="h-10 w-10 p-0 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">My Library</h1>
        </div>
        
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Library Page</h2>
          <p className="text-gray-600 mb-6">This page will contain your saved lessons and progress.</p>
          <Button onClick={onBack} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
} 