// IndexedDB wrapper for offline storage
export interface Topic {
  id: string
  title: string
  category: string
  completedSteps: number[]
  createdAt: Date
  lastAccessed: Date
}

export interface QuizResult {
  id: string
  topicId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  date: Date
  stepIndex?: number
}

export interface UserStats {
  totalTopicsExplored: number
  totalStepsCompleted: number
  totalQuizzesTaken: number
  averageQuizScore: number
  totalStudyTime: number
  streak: number
  lastStudyDate: string
}

export interface ExplanationData {
  id: string
  topic: string
  overview: string
  steps: any[]
  summary: string
  createdAt: Date
}

export interface Flashcard {
  id: string
  topicId: string
  question: string
  answer: string
  createdAt: Date
}

export interface Quiz {
  id: string
  topicId: string
  questions: any[]
  createdAt: Date
}

class OfflineDB {
  private dbName = "AIExplainerDB"
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Topics store
        if (!db.objectStoreNames.contains("topics")) {
          const topicsStore = db.createObjectStore("topics", { keyPath: "id" })
          topicsStore.createIndex("title", "title", { unique: false })
          topicsStore.createIndex("category", "category", { unique: false })
        }

        // Quiz results store
        if (!db.objectStoreNames.contains("quizResults")) {
          const quizStore = db.createObjectStore("quizResults", { keyPath: "id" })
          quizStore.createIndex("topicId", "topicId", { unique: false })
          quizStore.createIndex("date", "date", { unique: false })
        }

        // User stats store
        if (!db.objectStoreNames.contains("userStats")) {
          db.createObjectStore("userStats", { keyPath: "id" })
        }

        // Explanations store
        if (!db.objectStoreNames.contains("explanations")) {
          const explanationsStore = db.createObjectStore("explanations", { keyPath: "id" })
          explanationsStore.createIndex("topic", "topic", { unique: false })
        }

        // Flashcards store
        if (!db.objectStoreNames.contains("flashcards")) {
          const flashcardsStore = db.createObjectStore("flashcards", { keyPath: "id" })
          flashcardsStore.createIndex("topicId", "topicId", { unique: false });
        }

        // Quizzes store
        if (!db.objectStoreNames.contains("quizzes")) {
          const quizzesStore = db.createObjectStore("quizzes", { keyPath: "id" })
          quizzesStore.createIndex("topicId", "topicId", { unique: false });
        }

        // Completed steps store
        if (!db.objectStoreNames.contains("completedSteps")) {
          const stepsStore = db.createObjectStore("completedSteps", { keyPath: "topicId" })
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  async saveTopic(topic: Topic): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["topics"], "readwrite")
      const store = transaction.objectStore("topics")
      const request = store.put(topic)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getTopics(): Promise<Topic[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["topics"], "readonly")
      const store = transaction.objectStore("topics")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async saveQuizResult(result: QuizResult): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["quizResults"], "readwrite")
      const store = transaction.objectStore("quizResults")
      const request = store.put(result)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getQuizResults(): Promise<QuizResult[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["quizResults"], "readonly")
      const store = transaction.objectStore("quizResults")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async saveUserStats(stats: UserStats): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["userStats"], "readwrite")
      const store = transaction.objectStore("userStats")
      const request = store.put({ ...stats, id: "main" })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getUserStats(): Promise<UserStats | null> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["userStats"], "readonly")
      const store = transaction.objectStore("userStats")
      const request = store.get("main")

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async saveExplanation(explanation: ExplanationData): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["explanations"], "readwrite")
      const store = transaction.objectStore("explanations")
      const request = store.put(explanation)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getAllExplanations(): Promise<ExplanationData[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["explanations"], "readonly")
      const store = transaction.objectStore("explanations")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async getAllFlashcards(): Promise<Flashcard[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["flashcards"], "readonly")
      const store = transaction.objectStore("flashcards")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async getAllQuizzes(): Promise<Quiz[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["quizzes"], "readonly")
      const store = transaction.objectStore("quizzes")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async getExplanation(topic: string): Promise<ExplanationData | null> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["explanations"], "readonly")
      const store = transaction.objectStore("explanations")
      const index = store.index("topic")
      const request = index.get(topic)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async saveCompletedSteps(topicId: string, steps: number[]): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["completedSteps"], "readwrite")
      const store = transaction.objectStore("completedSteps")
      const request = store.put({ topicId, steps })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getCompletedSteps(topicId: string): Promise<number[]> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["completedSteps"], "readonly")
      const store = transaction.objectStore("completedSteps")
      const request = store.get(topicId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result?.steps || [])
    })
  }

  async clearAllData(): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        ["topics", "quizResults", "userStats", "explanations", "completedSteps"],
        "readwrite",
      )

      const stores = ["topics", "quizResults", "userStats", "explanations", "completedSteps"]
      let completed = 0

      const checkComplete = () => {
        completed++
        if (completed === stores.length) {
          resolve()
        }
      }

      stores.forEach((storeName) => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => checkComplete()
      })
    })
  }
}

export const offlineDB = new OfflineDB()
