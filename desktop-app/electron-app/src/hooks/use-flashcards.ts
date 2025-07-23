import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '../lib/api-client'
import { ContentResponse, Flashcard } from '../types/api'

interface FlashcardsState {
  loading: boolean
  error: string | null
  flashcards: Flashcard[]
  queryId: string | null
  lessonIndex: number | null
  createdAt: string | null
  processingTime: number | null
}

interface UseFlashcardsReturn {
  state: FlashcardsState
  fetchFlashcards: (queryId: string, lessonIndex: number) => Promise<void>
  clearError: () => void
  reset: () => void
  getFlashcard: (index: number) => Flashcard | null
  getTotalFlashcards: () => number
}

export function useFlashcards(): UseFlashcardsReturn {
  const [state, setState] = useState<FlashcardsState>({
    loading: false,
    error: null,
    flashcards: [],
    queryId: null,
    lessonIndex: null,
    createdAt: null,
    processingTime: null,
  })

  const fetchFlashcards = useCallback(async (queryId: string, lessonIndex: number) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      queryId,
      lessonIndex,
    }))

    try {
      const response: ContentResponse = await APIClient.getFlashcardsByLesson(queryId, lessonIndex)
      
      // Validate that content is an array of flashcards
      if (!Array.isArray(response.content)) {
        throw new Error('Invalid response format: expected array of flashcards')
      }

      const flashcards: Flashcard[] = response.content.map((item: any) => ({
        term: item.term || item.front || 'Unknown Term',
        explanation: item.explanation || item.back || 'No explanation available',
        difficulty: item.difficulty || 'medium',
      }))

      setState(prev => ({
        ...prev,
        loading: false,
        flashcards,
        createdAt: response.created_at,
        processingTime: response.processing_time || null,
      }))

    } catch (error) {
      let errorMessage = 'Failed to fetch flashcards'
      
      if (error instanceof APIClientError) {
        if (error.statusCode === 404) {
          errorMessage = 'Flashcards not found. They may still be generating.'
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
      flashcards: [],
      queryId: null,
      lessonIndex: null,
      createdAt: null,
      processingTime: null,
    })
  }, [])

  const getFlashcard = useCallback((index: number): Flashcard | null => {
    if (index >= 0 && index < state.flashcards.length) {
      return state.flashcards[index]
    }
    return null
  }, [state.flashcards])

  const getTotalFlashcards = useCallback(() => {
    return state.flashcards.length
  }, [state.flashcards.length])

  return {
    state,
    fetchFlashcards,
    clearError,
    reset,
    getFlashcard,
    getTotalFlashcards,
  }
}

// Hook for getting all flashcards for a query (across all lessons)
export function useAllFlashcards() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allFlashcards, setAllFlashcards] = useState<Flashcard[]>([])

  const fetchAllFlashcards = useCallback(async (queryId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await APIClient.getFlashcards(queryId)
      
      if (!Array.isArray(response.content)) {
        throw new Error('Invalid response format: expected array of flashcards')
      }

      const flashcards: Flashcard[] = response.content.map((item: any) => ({
        term: item.term || item.front || 'Unknown Term',
        explanation: item.explanation || item.back || 'No explanation available',
        difficulty: item.difficulty || 'medium',
      }))

      setAllFlashcards(flashcards)
    } catch (error) {
      let errorMessage = 'Failed to fetch all flashcards'
      
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
    allFlashcards,
    fetchAllFlashcards,
  }
} 