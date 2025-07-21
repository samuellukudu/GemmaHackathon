import { useState, useCallback } from 'react'
import APIClient, { APIClientError } from '../lib/api-client'
import { ContentResponse, Quiz, TrueFalseQuestion, MultipleChoiceQuestion } from '../types/api'

interface QuizState {
  loading: boolean
  error: string | null
  quiz: Quiz | null
  processingTime: number | null
}

interface UseQuizReturn {
  state: QuizState
  fetchQuiz: (queryId: string, lessonIndex?: number) => Promise<void>
  clearError: () => void
  reset: () => void
  getAllQuestions: () => Array<{ type: 'true_false' | 'multiple_choice', question: TrueFalseQuestion | MultipleChoiceQuestion }>
  getTotalQuestions: () => number
}

export function useQuiz(): UseQuizReturn {
  const [state, setState] = useState<QuizState>({
    loading: false,
    error: null,
    quiz: null,
    processingTime: null,
  })

  const fetchQuiz = useCallback(async (queryId: string, lessonIndex: number = 0) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }))

    try {
      const response: ContentResponse = await APIClient.getQuiz(queryId, lessonIndex)
      
      // Parse the quiz content
      const quiz: Quiz = response.content || { true_false_questions: [], multiple_choice_questions: [] }

      setState(prev => ({
        ...prev,
        loading: false,
        quiz,
        processingTime: response.processing_time || null,
      }))

    } catch (error) {
      let errorMessage = 'Failed to fetch quiz'
      
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
      quiz: null,
      processingTime: null,
    })
  }, [])

  const getAllQuestions = useCallback(() => {
    if (!state.quiz) return []
    
    const questions: Array<{ type: 'true_false' | 'multiple_choice', question: TrueFalseQuestion | MultipleChoiceQuestion }> = []
    
    // Add true/false questions
    state.quiz.true_false_questions.forEach(q => {
      questions.push({ type: 'true_false', question: q })
    })
    
    // Add multiple choice questions
    state.quiz.multiple_choice_questions.forEach(q => {
      questions.push({ type: 'multiple_choice', question: q })
    })
    
    return questions
  }, [state.quiz])

  const getTotalQuestions = useCallback(() => {
    if (!state.quiz) return 0
    return state.quiz.true_false_questions.length + state.quiz.multiple_choice_questions.length
  }, [state.quiz])

  return {
    state,
    fetchQuiz,
    clearError,
    reset,
    getAllQuestions,
    getTotalQuestions,
  }
} 