import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '../lib/api-client'
import { ContentResponse, Flashcard } from '../types/api'

interface FlashcardsState {
  loading: boolean
  error: string | null
  flashcards: Flashcard[]
  processingTime: number | null
}

interface UseFlashcardsReturn {
  state: FlashcardsState
  fetchFlashcards: (queryId: string, lessonIndex?: number) => Promise<void>
  clearError: () => void
  reset: () => void
}

export function useFlashcards(): UseFlashcardsReturn {
  const [state, setState] = useState<FlashcardsState>({
    loading: false,
    error: null,
    flashcards: [],
    processingTime: null,
  })

  const fetchFlashcards = useCallback(async (queryId: string, lessonIndex: number = 0) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }))

    try {
      const response: ContentResponse = await APIClient.getFlashcards(queryId, lessonIndex)
      
      // Parse the flashcards content
      const flashcards: Flashcard[] = Array.isArray(response.content) 
        ? response.content 
        : response.content?.flashcards || []

      setState(prev => ({
        ...prev,
        loading: false,
        flashcards,
        processingTime: response.processing_time || null,
      }))

    } catch (error) {
      let errorMessage = 'Failed to fetch flashcards'
      
      if (error instanceof APIClientError) {
        errorMessage = error.message
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
      processingTime: null,
    })
  }, [])

  return {
    state,
    fetchFlashcards,
    clearError,
    reset,
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