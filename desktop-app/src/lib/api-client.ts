import {
  QueryRequest,
  QueryResponse,
  TaskStatusResponse,
  ContentResponse,
  ContentListResponse,
  HealthCheckResponse,
  PerformanceMetrics,
  APIError,
  APIEndpoints,
  TaskStatus
} from '../types/api'

// Configuration
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

// Custom error class for API errors
export class APIClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message)
    this.name = 'APIClientError'
  }
}

// Retry utility function
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on client errors (4xx) except 408, 429
      if (error instanceof APIClientError) {
        const shouldRetry = error.statusCode === 408 || error.statusCode === 429 || error.statusCode >= 500
        if (!shouldRetry || attempt === maxRetries) {
          throw error
        }
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError!
}

// Request wrapper with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorDetails: any = null

      try {
        errorDetails = await response.json()
        errorMessage = errorDetails.detail || errorMessage
      } catch {
        // If response is not JSON, use status text
      }

      throw new APIClientError(errorMessage, response.status, errorDetails)
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    } else {
      return {} as T
    }
  } catch (error) {
    if (error instanceof APIClientError) {
      throw error
    }
    
    // Handle network errors, timeouts, etc.
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new APIClientError('Request timeout', 408)
      }
      throw new APIClientError(`Network error: ${error.message}`, 0)
    }
    
    throw new APIClientError('Unknown error occurred', 0)
  }
}

// API Client class
export class APIClient {
  // Submit a learning query
  static async submitQuery(request: QueryRequest): Promise<QueryResponse> {
    return withRetry(() =>
      apiRequest<QueryResponse>(APIEndpoints.QUERY, {
        method: 'POST',
        body: JSON.stringify(request),
      })
    )
  }

  // Get task status
  static async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    return withRetry(() =>
      apiRequest<TaskStatusResponse>(`${APIEndpoints.TASKS}/${taskId}`)
    )
  }

  // Get lessons by query ID
  static async getLessons(queryId: string): Promise<ContentResponse> {
    return withRetry(() =>
      apiRequest<ContentResponse>(`${APIEndpoints.LESSONS}/${queryId}`)
    )
  }

  // Get flashcards by query ID and lesson index
  static async getFlashcards(queryId: string, lessonIndex: number = 0): Promise<ContentResponse> {
    return withRetry(() =>
      apiRequest<ContentResponse>(`${APIEndpoints.FLASHCARDS}/${queryId}/${lessonIndex}`)
    )
  }

  // Get quiz by query ID and lesson index
  static async getQuiz(queryId: string, lessonIndex: number = 0): Promise<ContentResponse> {
    return withRetry(() =>
      apiRequest<ContentResponse>(`${APIEndpoints.QUIZ}/${queryId}/${lessonIndex}`)
    )
  }

  // Get related questions by query ID
  static async getRelatedQuestions(queryId: string): Promise<ContentResponse> {
    return withRetry(() =>
      apiRequest<ContentResponse>(`${APIEndpoints.RELATED_QUESTIONS}/${queryId}`)
    )
  }

  // Submit query and wait for completion with progress updates
  static async submitQueryAndWait(
    request: QueryRequest,
    onProgress?: (progress: string) => void
  ): Promise<{
    queryId: string
    lessons?: ContentResponse
    relatedQuestions?: ContentResponse
  }> {
    onProgress?.('Submitting query...')
    
    // Submit the query
    const queryResponse = await this.submitQuery(request)
    
    if (!queryResponse.success || !queryResponse.query_id) {
      throw new APIClientError(queryResponse.message || 'Query submission failed', 400)
    }

    const queryId = queryResponse.query_id
    onProgress?.('Processing lessons...')

    // Wait for lessons to be ready
    const lessons = await this.waitForContent(() => this.getLessons(queryId), onProgress)
    
    onProgress?.('Getting related questions...')
    
    // Get related questions (optional, don't fail if this fails)
    let relatedQuestions: ContentResponse | undefined
    try {
      relatedQuestions = await this.getRelatedQuestions(queryId)
    } catch (error) {
      console.warn('Failed to get related questions:', error)
    }

    return {
      queryId,
      lessons,
      relatedQuestions,
    }
  }

  // Wait for content to be ready with retries
  private static async waitForContent<T>(
    contentFetcher: () => Promise<T>,
    onProgress?: (progress: string) => void,
    maxAttempts: number = 30,
    delay: number = 2000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        onProgress?.(`Processing... (${attempt}/${maxAttempts})`)
        return await contentFetcher()
      } catch (error) {
        if (error instanceof APIClientError && error.statusCode === 404) {
          // Content not ready yet, wait and retry
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }
        throw error
      }
    }
    
    throw new APIClientError('Content generation timeout', 408)
  }

  // Health check
  static async healthCheck(): Promise<HealthCheckResponse> {
    return apiRequest<HealthCheckResponse>(APIEndpoints.HEALTH)
  }

  // Performance metrics
  static async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return apiRequest<PerformanceMetrics>(APIEndpoints.PERFORMANCE)
  }
}

export default APIClient 