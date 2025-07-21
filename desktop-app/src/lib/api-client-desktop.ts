import { offlineDB } from './db';

export class DesktopAPIClient {
  private baseURL: string;
  private isOnline: boolean = true;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    this.checkOnlineStatus();
  }

  private async checkOnlineStatus() {
    try {
      const response = await fetch(`${this.baseURL}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      this.isOnline = response.ok;
    } catch {
      this.isOnline = false;
    }
  }

  async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.isOnline) {
      return this.handleOfflineRequest<T>(endpoint, options);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      return this.handleOfflineRequest<T>(endpoint, options);
    }
  }

  private async handleOfflineRequest<T>(
    endpoint: string, 
    options: RequestInit
  ): Promise<T> {
    // Implement offline fallback logic using IndexedDB
    switch (endpoint) {
      case '/api/explanations':
        return this.getLocalExplanations() as unknown as T;
      case '/api/flashcards':
        return this.getLocalFlashcards() as unknown as T;
      case '/api/quiz':
        return this.getLocalQuiz() as unknown as T;
      default:
        throw new Error('Endpoint not available offline');
    }
  }

  private async getLocalExplanations() {
    // Query IndexedDB for cached explanations
    return await offlineDB.getAllExplanations();
  }

  private async getLocalFlashcards() {
    // Query IndexedDB for cached flashcards
    return await offlineDB.getAllFlashcards();
  }

  private async getLocalQuiz() {
    // Query IndexedDB for cached quiz data
    return await offlineDB.getAllQuizzes();
  }
}