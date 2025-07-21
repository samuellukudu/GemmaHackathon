import { offlineDB, type Topic, type QuizResult, type UserStats, type ExplanationData } from "./db"

class OfflineManager {
  private isOnline = true

  constructor() {
    if (typeof window !== "undefined") {
      this.isOnline = navigator.onLine
      window.addEventListener("online", () => {
        this.isOnline = true
        this.handleOnline()
      })
      window.addEventListener("offline", () => {
        this.isOnline = false
        this.handleOffline()
      })
    }
  }

  private handleOnline() {
    console.log("App is online - syncing data...")
    // Here you could implement sync with a remote server
    this.showNotification("Back online! Data synced.", "success")
  }

  private handleOffline() {
    console.log("App is offline - using local storage")
    this.showNotification("You're offline. Don't worry, your progress is saved locally!", "info")
  }

  private showNotification(message: string, type: "success" | "info" | "warning") {
    // Simple notification system
    if (typeof window !== "undefined") {
      const notification = document.createElement("div")
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        background: ${type === "success" ? "#10b981" : type === "info" ? "#3b82f6" : "#f59e0b"};
      `
      notification.textContent = message
      document.body.appendChild(notification)

      setTimeout(() => {
        notification.remove()
      }, 4000)
    }
  }

  async saveTopicProgress(topic: string, category = "general"): Promise<void> {
    try {
      const topicData: Topic = {
        id: this.generateId(),
        title: topic,
        category,
        completedSteps: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
      }

      await offlineDB.saveTopic(topicData)

      // Also maintain localStorage for backward compatibility
      const recentTopics = await this.getRecentTopics()
      const updatedTopics = [topic, ...recentTopics.filter((t) => t !== topic)].slice(0, 10)
      localStorage.setItem("recentTopics", JSON.stringify(updatedTopics))
    } catch (error) {
      console.error("Error saving topic progress:", error)
      // Fallback to localStorage only
      const recentTopics = JSON.parse(localStorage.getItem("recentTopics") || "[]")
      const updatedTopics = [topic, ...recentTopics.filter((t: string) => t !== topic)].slice(0, 10)
      localStorage.setItem("recentTopics", JSON.stringify(updatedTopics))
    }
  }

  async getRecentTopics(): Promise<string[]> {
    try {
      const topics = await offlineDB.getTopics()
      return topics.map((t) => t.title)
    } catch (error) {
      console.error("Error getting topics from DB:", error)
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem("recentTopics") || "[]")
    }
  }

  async saveQuizResult(topic: string, score: number, totalQuestions: number, stepIndex?: number): Promise<void> {
    const result: QuizResult = {
      id: this.generateId(),
      topicId: topic,
      score,
      totalQuestions,
      correctAnswers: Math.round((score / 100) * totalQuestions),
      date: new Date(),
      stepIndex,
    }

    try {
      await offlineDB.saveQuizResult(result)
    } catch (error) {
      console.error("Error saving quiz result to DB:", error)
    }

    // Also save to localStorage for backward compatibility
    const allResults = JSON.parse(localStorage.getItem("allQuizResults") || "[]")
    allResults.push({
      topic,
      score,
      totalQuestions,
      correctAnswers: result.correctAnswers,
      date: result.date.toISOString(),
      stepIndex,
    })
    localStorage.setItem("allQuizResults", JSON.stringify(allResults))

    await this.updateUserStats()
  }

  async updateUserStats(): Promise<void> {
    try {
      const topics = await offlineDB.getTopics()
      const quizResults = await offlineDB.getQuizResults()

      let totalStepsCompleted = 0
      for (const topic of topics) {
        const steps = await offlineDB.getCompletedSteps(topic.id)
        totalStepsCompleted += steps.length
      }

      const averageScore =
        quizResults.length > 0 ? quizResults.reduce((sum, result) => sum + result.score, 0) / quizResults.length : 0

      const stats: UserStats = {
        totalTopicsExplored: topics.length,
        totalStepsCompleted,
        totalQuizzesTaken: quizResults.length,
        averageQuizScore: Math.round(averageScore),
        totalStudyTime: quizResults.length * 5, // Estimate 5 minutes per quiz
        streak: this.calculateStreak(),
        lastStudyDate: new Date().toISOString(),
      }

      await offlineDB.saveUserStats(stats)

      // Also save to localStorage
      localStorage.setItem("userStats", JSON.stringify(stats))
    } catch (error) {
      console.error("Error updating user stats:", error)
      // Fallback to localStorage calculation
      this.calculateStatsFromLocalStorage()
    }
  }

  private calculateStatsFromLocalStorage(): void {
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

    const stats: UserStats = {
      totalTopicsExplored: recentTopics.length,
      totalStepsCompleted,
      totalQuizzesTaken: allQuizResults.length,
      averageQuizScore: Math.round(averageScore),
      totalStudyTime: allQuizResults.length * 5, // Estimate 5 minutes per quiz
      streak: this.calculateStreak(),
      lastStudyDate: new Date().toISOString(),
    }

    localStorage.setItem("userStats", JSON.stringify(stats))
  }

  async getUserStats(): Promise<UserStats> {
    try {
      const stats = await offlineDB.getUserStats()
      if (stats) return stats
    } catch (error) {
      console.error("Error getting user stats from DB:", error)
    }

    // Fallback to localStorage
    const fallbackStats = localStorage.getItem("userStats")
    if (fallbackStats) {
      return JSON.parse(fallbackStats)
    }

    // Default stats
    return {
      totalTopicsExplored: 0,
      totalStepsCompleted: 0,
      totalQuizzesTaken: 0,
      averageQuizScore: 0,
      totalStudyTime: 0,
      streak: 0,
      lastStudyDate: "",
    }
  }

  async saveCompletedSteps(topic: string, stepIndex: number): Promise<void> {
    try {
      const currentSteps = await offlineDB.getCompletedSteps(topic)
      const newSteps = [...new Set([...currentSteps, stepIndex])]
      await offlineDB.saveCompletedSteps(topic, newSteps)

      // Also save to localStorage
      localStorage.setItem(`completedSteps_${topic}`, JSON.stringify(newSteps))
    } catch (error) {
      console.error("Error saving completed steps:", error)
      // Fallback to localStorage only
      const currentSteps = JSON.parse(localStorage.getItem(`completedSteps_${topic}`) || "[]")
      const newSteps = [...new Set([...currentSteps, stepIndex])]
      localStorage.setItem(`completedSteps_${topic}`, JSON.stringify(newSteps))
    }
  }

  // New lesson-based progress tracking methods
  async saveLessonProgress(queryId: string, lessonIndex: number, completed: boolean = false): Promise<void> {
    try {
      const progressKey = `lesson_progress_${queryId}`
      const currentProgress = JSON.parse(localStorage.getItem(progressKey) || '{}')
      
      currentProgress[lessonIndex] = {
        completed,
        lastAccessed: new Date().toISOString(),
        completedAt: completed ? new Date().toISOString() : currentProgress[lessonIndex]?.completedAt
      }
      
      localStorage.setItem(progressKey, JSON.stringify(currentProgress))
      
      // Also save to IndexedDB if available
      await offlineDB.saveTopic({
        id: queryId,
        title: queryId, // Will be updated with actual topic when available
        category: 'lesson',
        completedSteps: Object.keys(currentProgress).filter(k => currentProgress[k].completed).map(Number),
        createdAt: new Date(),
        lastAccessed: new Date()
      })
    } catch (error) {
      console.error("Error saving lesson progress:", error)
    }
  }

  async getLessonProgress(queryId: string): Promise<Record<number, { completed: boolean, lastAccessed: string, completedAt?: string }>> {
    try {
      const progressKey = `lesson_progress_${queryId}`
      return JSON.parse(localStorage.getItem(progressKey) || '{}')
    } catch (error) {
      console.error("Error getting lesson progress:", error)
      return {}
    }
  }

  async getLastAccessedLesson(queryId: string): Promise<number> {
    try {
      const progress = await this.getLessonProgress(queryId)
      const accessedLessons = Object.entries(progress)
        .sort(([,a], [,b]) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
      
      if (accessedLessons.length === 0) return 0
      
      // Return the last accessed lesson index
      const lastAccessedIndex = parseInt(accessedLessons[0][0])
      
      // If the last accessed lesson is completed, start the next one
      if (progress[lastAccessedIndex]?.completed) {
        return lastAccessedIndex + 1
      }
      
      return lastAccessedIndex
    } catch (error) {
      console.error("Error getting last accessed lesson:", error)
      return 0
    }
  }

  async saveTopicInfo(queryId: string, topic: string, totalLessons: number, isUserQuery: boolean = true): Promise<void> {
    try {
      // Only save if this is a user query, not an individual lesson step
      if (!isUserQuery) {
        return
      }
      
      const topicInfoKey = `topic_info_${queryId}`
      const topicInfo = {
        queryId,
        topic,
        totalLessons,
        isUserQuery,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem(topicInfoKey, JSON.stringify(topicInfo))
    } catch (error) {
      console.error("Error saving topic info:", error)
    }
  }

  async getTopicInfo(queryId: string): Promise<{ queryId: string, topic: string, totalLessons: number, createdAt: string } | null> {
    try {
      const topicInfoKey = `topic_info_${queryId}`
      const info = localStorage.getItem(topicInfoKey)
      return info ? JSON.parse(info) : null
    } catch (error) {
      console.error("Error getting topic info:", error)
      return null
    }
  }

  async getCompletedSteps(topic: string): Promise<number[]> {
    try {
      return await offlineDB.getCompletedSteps(topic)
    } catch (error) {
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem(`completedSteps_${topic}`) || "[]")
    }
  }

  async saveExplanation(topic: string, explanation: any): Promise<void> {
    const explanationData: ExplanationData = {
      id: this.generateId(),
      topic,
      overview: explanation.overview,
      steps: explanation.steps,
      summary: explanation.summary,
      createdAt: new Date(),
    }

    try {
      await offlineDB.saveExplanation(explanationData)
    } catch (error) {
      console.error("Error saving explanation to DB:", error)
    }
  }

  async getExplanation(topic: string): Promise<any | null> {
    try {
      return await offlineDB.getExplanation(topic)
    } catch (error) {
      console.error("Error getting explanation from DB:", error)
      return null
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await offlineDB.clearAllData()

      // Also clear localStorage
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (
          key.startsWith("completedSteps_") ||
          ["recentTopics", "userStats", "allQuizResults", "lastStudyDate"].includes(key)
        ) {
          localStorage.removeItem(key)
        }
      })

      this.showNotification("All data cleared successfully", "success")
    } catch (error) {
      console.error("Error clearing data:", error)
      this.showNotification("Error clearing data", "warning")
    }
  }

  private calculateStreak(): number {
    const lastStudyDate = localStorage.getItem("lastStudyDate")
    if (!lastStudyDate) return 1

    const today = new Date()
    const lastDate = new Date(lastStudyDate)
    const diffTime = Math.abs(today.getTime() - lastDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays <= 2 ? diffDays + 1 : 1
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  getConnectionStatus(): boolean {
    return this.isOnline
  }
}

export const offlineManager = new OfflineManager()
