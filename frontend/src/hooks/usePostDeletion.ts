import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/toastContext'
import { useI18n } from '../i18n'
import { deleteAnswer, deleteQuestion } from '../services/questions'

// Suppression de son propre contenu, confirmée au préalable par une boîte de dialogue
export function useDeleteQuestion(id: number) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useI18n()
  return useMutation({
    mutationFn: () => deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      toast(t('edit.question_deleted'), 'trash')
      navigate('/app', { replace: true })
    },
  })
}

export function useDeleteAnswer(questionId: number, answerId: number, onDone: () => void) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  return useMutation({
    mutationFn: () => deleteAnswer(answerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question', questionId] })
      toast(t('edit.answer_deleted'), 'trash')
      onDone()
    },
  })
}
