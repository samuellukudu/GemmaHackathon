import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '@/lib/api-client'
import { QueryRequest, ContentResponse } from '@/types/api'

interface QueryState {
  loading: boolean
  error: string | null
  queryId: string | null
  lessons: ContentResponse | null
  relatedQuestions: ContentResponse | null
  progress: string | null
}

interface UseApiQueryReturn {
  state: QueryState
  submitQuery: (query: string, userId?: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

export function useApiQuery(): UseApiQueryReturn {
  const [state, setState] = useState<QueryState>({
    loading: false,
    error: null,
    queryId: null,
    lessons: null,
    relatedQuestions: null,
    progress: null,
  })

  const submitQuery = useCallback(async (query: string, userId?: string) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      progress: 'Submitting query...',
    }))

    try {
      const request: QueryRequest = {
        query,
        user_id: userId,
      }

      const result = await APIClient.submitQueryAndWait(request, (progress) => {
        setState(prev => ({
          ...prev,
          progress,
        }))
      })

      setState(prev => ({
        ...prev,
        loading: false,
        queryId: result.queryId,
        lessons: result.lessons || null,
        relatedQuestions: result.relatedQuestions || null,
        progress: 'Content ready!',
      }))

    } catch (error) {
      let errorMessage = 'An unexpected error occurred'
      
      if (error instanceof APIClientError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        progress: null,
      }))
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      queryId: null,
      lessons: null,
      relatedQuestions: null,
      progress: null,
    })
  }, [])

  return {
    state,
    submitQuery,
    clearError,
    reset,
  }
}

// Hook for getting additional content by query ID
interface UseQueryContentReturn {
  loading: boolean
  error: string | null
  getFlashcards: (queryId: string) => Promise<ContentResponse | null>
  getQuiz: (queryId: string, lessonIndex: number) => Promise<ContentResponse | null>
}

export function useQueryContent(): UseQueryContentReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getFlashcards = useCallback(async (queryId: string): Promise<ContentResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const flashcards = await APIClient.getFlashcards(queryId)
      setLoading(false)
      return flashcards
    } catch (error) {
      let errorMessage = 'Failed to get flashcards'
      
      if (error instanceof APIClientError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setError(errorMessage)
      setLoading(false)
      return null
    }
  }, [])

  const getQuiz = useCallback(async (queryId: string, lessonIndex: number): Promise<ContentResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const quiz = await APIClient.getQuiz(queryId, lessonIndex)
      setLoading(false)
      return quiz
    } catch (error) {
      let errorMessage = 'Failed to get quiz'
      
      if (error instanceof APIClientError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setError(errorMessage)
      setLoading(false)
      return null
    }
  }, [])

  return {
    loading,
    error,
    getFlashcards,
    getQuiz,
  }
} 