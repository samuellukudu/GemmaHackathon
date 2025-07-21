import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '@/lib/api-client'
import { ContentResponse, Lesson } from '@/types/api'

interface LessonsState {
  loading: boolean
  error: string | null
  lessons: Lesson[]
  queryId: string | null
  createdAt: string | null
  processingTime: number | null
}

interface UseLessonsReturn {
  state: LessonsState
  fetchLessons: (queryId: string) => Promise<void>
  clearError: () => void
  reset: () => void
  getCurrentLesson: (index: number) => Lesson | null
  getTotalLessons: () => number
}

export function useLessons(): UseLessonsReturn {
  const [state, setState] = useState<LessonsState>({
    loading: false,
    error: null,
    lessons: [],
    queryId: null,
    createdAt: null,
    processingTime: null,
  })

  const fetchLessons = useCallback(async (queryId: string) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      queryId,
    }))

    try {
      const response: ContentResponse = await APIClient.getLessons(queryId)
      
      // Validate that content is an array of lessons
      if (!Array.isArray(response.content)) {
        throw new Error('Invalid response format: expected array of lessons')
      }

      const lessons: Lesson[] = response.content.map((item: any) => ({
        title: item.title || 'Untitled Lesson',
        overview: item.overview || item.content || 'No overview available',
        key_concepts: Array.isArray(item.key_concepts) ? item.key_concepts : 
                     Array.isArray(item.key_points) ? item.key_points : [],
        examples: Array.isArray(item.examples) ? item.examples : [],
      }))

      setState(prev => ({
        ...prev,
        loading: false,
        lessons,
        createdAt: response.created_at,
        processingTime: response.processing_time || null,
      }))

    } catch (error) {
      let errorMessage = 'Failed to fetch lessons'
      
      if (error instanceof APIClientError) {
        if (error.statusCode === 404) {
          errorMessage = 'Lessons not found. They may still be generating.'
        } else {
          errorMessage = error.message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
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
      lessons: [],
      queryId: null,
      createdAt: null,
      processingTime: null,
    })
  }, [])

  const getCurrentLesson = useCallback((index: number): Lesson | null => {
    if (index >= 0 && index < state.lessons.length) {
      return state.lessons[index]
    }
    return null
  }, [state.lessons])

  const getTotalLessons = useCallback(() => {
    return state.lessons.length
  }, [state.lessons.length])

  return {
    state,
    fetchLessons,
    clearError,
    reset,
    getCurrentLesson,
    getTotalLessons,
  }
}

// Hook for getting recent lessons
export function useRecentLessons() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentLessons, setRecentLessons] = useState<any[]>([])

  const fetchRecentLessons = useCallback(async (limit: number = 20) => {
    setLoading(true)
    setError(null)

    try {
      const response = await APIClient.getRecentLessons(limit)
      setRecentLessons(response.items)
    } catch (error) {
      let errorMessage = 'Failed to fetch recent lessons'
      
      if (error instanceof APIClientError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    recentLessons,
    fetchRecentLessons,
  }
} 