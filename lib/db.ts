// IndexedDB wrapper for offline data storage
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
  steps: Array<{
    title: string
    description: string
    keyPoint: string
  }>
  summary: string
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
          topicsStore.createIndex("category", "category", { unique: false })
          topicsStore.createIndex("lastAccessed", "lastAccessed", { unique: false })
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

        // Completed steps store
        if (!db.objectStoreNames.contains("completedSteps")) {
          const stepsStore = db.createObjectStore("completedSteps", { keyPath: "topicId" })
        }
      }
    })
  }

  async saveTopic(topic: Topic): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["topics"], "readwrite")
      const store = transaction.objectStore("topics")
      const request = store.put(topic)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getTopics(): Promise<Topic[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["topics"], "readonly")
      const store = transaction.objectStore("topics")
      const index = store.index("lastAccessed")
      const request = index.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const topics = request.result.sort(
          (a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime(),
        )
        resolve(topics)
      }
    })
  }

  async saveQuizResult(result: QuizResult): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["quizResults"], "readwrite")
      const store = transaction.objectStore("quizResults")
      const request = store.put(result)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getQuizResults(): Promise<QuizResult[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["quizResults"], "readonly")
      const store = transaction.objectStore("quizResults")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async saveUserStats(stats: UserStats): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["userStats"], "readwrite")
      const store = transaction.objectStore("userStats")
      const request = store.put({ id: "main", ...stats })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getUserStats(): Promise<UserStats | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["userStats"], "readonly")
      const store = transaction.objectStore("userStats")
      const request = store.get("main")

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          const { id, ...stats } = result
          resolve(stats)
        } else {
          resolve(null)
        }
      }
    })
  }

  async saveExplanation(explanation: ExplanationData): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["explanations"], "readwrite")
      const store = transaction.objectStore("explanations")
      const request = store.put(explanation)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getExplanation(topic: string): Promise<ExplanationData | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["explanations"], "readonly")
      const store = transaction.objectStore("explanations")
      const index = store.index("topic")
      const request = index.get(topic)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async saveCompletedSteps(topicId: string, steps: number[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["completedSteps"], "readwrite")
      const store = transaction.objectStore("completedSteps")
      const request = store.put({ topicId, steps })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getCompletedSteps(topicId: string): Promise<number[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["completedSteps"], "readonly")
      const store = transaction.objectStore("completedSteps")
      const request = store.get(topicId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.steps : [])
      }
    })
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init()

    const stores = ["topics", "quizResults", "userStats", "explanations", "completedSteps"]

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, "readwrite")
      let completed = 0

      stores.forEach((storeName) => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()

        request.onsuccess = () => {
          completed++
          if (completed === stores.length) {
            resolve()
          }
        }
        request.onerror = () => reject(request.error)
      })
    })
  }
}

export const offlineDB = new OfflineDB()
