import { useRouter } from 'vue-router'
import { clearDocumentsCache } from '../api/documents'
import { useNotificationStore } from '../stores/notificationStore'

const FALLBACK_ERROR_MESSAGE = 'Não foi possível publicar o documento. Tente novamente.'

export function usePublishFeedback() {
  const router = useRouter()
  const notifications = useNotificationStore()

  function onPublished(document) {
    const code = document?.code
    clearDocumentsCache()
    notifications.success(
      code ? `Documento ${code} publicado com sucesso.` : 'Documento publicado com sucesso.',
    )
    return router.push({ name: 'document-list' })
  }

  function onPublishFailed(message) {
    notifications.error(message || FALLBACK_ERROR_MESSAGE)
  }

  return { onPublished, onPublishFailed }
}
