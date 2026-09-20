import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePublishFeedback } from '../../src/composables/usePublishFeedback'
import { useNotificationStore } from '../../src/stores/notificationStore'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../src/api/documents', () => ({ clearDocumentsCache: vi.fn() }))

import { clearDocumentsCache } from '../../src/api/documents'

describe('usePublishFeedback', () => {
  let notifications

  beforeEach(() => {
    setActivePinia(createPinia())
    notifications = useNotificationStore()
    vi.clearAllMocks()
  })

  it('should confirm the publication with the document code', () => {
    const { onPublished } = usePublishFeedback()

    onPublished({ id: 9, code: 'AK-2100-EST-DWG-0006' })

    expect(notifications.items).toHaveLength(1)
    expect(notifications.items[0]).toMatchObject({
      type: 'success',
      message: 'Documento AK-2100-EST-DWG-0006 publicado com sucesso.',
    })
  })

  it('should send the user to the documents list after the publication', () => {
    const { onPublished } = usePublishFeedback()

    onPublished({ id: 9, code: 'AK-2100-EST-DWG-0006' })

    expect(push).toHaveBeenCalledWith({ name: 'document-list' })
  })

  it('should drop the cached list so the new document shows on top', () => {
    const { onPublished } = usePublishFeedback()

    onPublished({ id: 9, code: 'AK-2100-EST-DWG-0006' })

    expect(clearDocumentsCache).toHaveBeenCalledTimes(1)
  })

  it('should still confirm the publication when the response has no code', () => {
    const { onPublished } = usePublishFeedback()

    onPublished(undefined)

    expect(notifications.items[0].message).toBe('Documento publicado com sucesso.')
  })

  it('should raise an error notification and stay on the page when the publication fails', () => {
    const { onPublishFailed } = usePublishFeedback()

    onPublishFailed('Erro interno do servidor. Tente novamente mais tarde.')

    expect(notifications.items[0]).toMatchObject({
      type: 'error',
      message: 'Erro interno do servidor. Tente novamente mais tarde.',
    })
    expect(push).not.toHaveBeenCalled()
    expect(clearDocumentsCache).not.toHaveBeenCalled()
  })

  it('should use a generic message when the failure has no message', () => {
    const { onPublishFailed } = usePublishFeedback()

    onPublishFailed('')

    expect(notifications.items[0].message).toBe(
      'Não foi possível publicar o documento. Tente novamente.',
    )
  })
})
