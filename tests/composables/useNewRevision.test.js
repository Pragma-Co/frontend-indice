import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const route = { params: { documentId: '23' } }
const router = { push: vi.fn() }
const notifications = { success: vi.fn(), error: vi.fn() }
const queue = ref([])
const removeFile = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))
vi.mock('@/api/documents.js', () => ({
  fetchDocumentDetail: vi.fn(),
  createDocumentRevision: vi.fn(),
}))
vi.mock('@/stores/authStore.js', () => ({
  useAuthStore: () => ({ currentUser: { id: 12, name: 'Beatriz Canuto' } }),
}))
vi.mock('@/stores/notificationStore.js', () => ({
  useNotificationStore: () => notifications,
}))
vi.mock('@/composables/useDocumentUpload.js', () => ({
  useDocumentUpload: () => ({
    queue,
    addFiles: vi.fn(),
    removeFile,
    resolveDuplicate: vi.fn(),
    ACCEPTED_EXTENSIONS: ['pdf', 'docx'],
  }),
}))

import { createDocumentRevision, fetchDocumentDetail } from '@/api/documents.js'
import { useNewRevision } from '@/views/document/composables/useNewRevision.js'

const VALID_JUSTIFICATION = 'Updated the load combinations of the pylon.'

function makeDocument(overrides = {}) {
  return {
    id: 23,
    code: 'AK-3100-EST-ESP-0001',
    title: 'Pylon structural verification report',
    revision: { id: 5, version: 1, status: 'APPROVED' },
    access_status: 'APPROVED',
    responsible: { id: 12, name: 'Beatriz Canuto' },
    ...overrides,
  }
}

function makeFile(overrides = {}) {
  return {
    id: 1,
    name: 'report_rev02.pdf',
    size: 2048,
    status: 'success',
    documentId: 'temp-a',
    ...overrides,
  }
}

const mountedHosts = []

async function mountRevision() {
  let revision
  const Host = defineComponent({
    setup() {
      revision = useNewRevision()
      return () => h('div')
    },
  })
  mountedHosts.push(mount(Host))
  await flushPromises()
  return revision
}

describe('useNewRevision', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queue.value = []
    fetchDocumentDetail.mockResolvedValue(makeDocument())
    createDocumentRevision.mockResolvedValue({ id: 6, version: 2 })
  })

  afterEach(() => {
    mountedHosts.splice(0).forEach((host) => host.unmount())
  })

  it('should load the parent document of the route for the current user', async () => {
    const revision = await mountRevision()

    expect(fetchDocumentDetail).toHaveBeenCalledWith('23', 12)
    expect(revision.parentDocument.value.code).toBe('AK-3100-EST-ESP-0001')
    expect(revision.loading.value).toBe(false)
    expect(revision.loadError.value).toBe('')
  })

  it('should indicate the current and the next revision numbers', async () => {
    const revision = await mountRevision()

    expect(revision.currentRevisionLabel.value).toBe('REV01')
    expect(revision.nextRevisionLabel.value).toBe('REV02')
  })

  it('should start from the first revision when the document has none', async () => {
    fetchDocumentDetail.mockResolvedValue(makeDocument({ revision: null }))

    const revision = await mountRevision()

    expect(revision.currentRevisionLabel.value).toBeNull()
    expect(revision.nextRevisionLabel.value).toBe('REV01')
  })

  it('should tell a missing document apart from a failed request', async () => {
    fetchDocumentDetail.mockRejectedValueOnce(Object.assign(new Error('missing'), { status: 404 }))
    const missing = await mountRevision()

    fetchDocumentDetail.mockRejectedValueOnce(new Error('offline'))
    const failed = await mountRevision()

    expect(missing.loadError.value).toBe('Documento não encontrado.')
    expect(failed.loadError.value).toBe('Não foi possível carregar o documento.')
  })

  it('should block the submission while the file or the justification is missing', async () => {
    const revision = await mountRevision()

    const withNothing = revision.canSubmit.value
    queue.value = [makeFile()]
    const withFileOnly = revision.canSubmit.value
    queue.value = []
    revision.justification.value = VALID_JUSTIFICATION
    const withJustificationOnly = revision.canSubmit.value
    queue.value = [makeFile()]
    const withBoth = revision.canSubmit.value

    expect(withNothing).toBe(false)
    expect(withFileOnly).toBe(false)
    expect(withJustificationOnly).toBe(false)
    expect(withBoth).toBe(true)
  })

  it('should not accept a justification shorter than the minimum or made of spaces', async () => {
    const revision = await mountRevision()
    queue.value = [makeFile()]

    revision.justification.value = 'Too short'
    const short = revision.canSubmit.value
    revision.justification.value = ' '.repeat(40)
    const blank = revision.canSubmit.value

    expect(short).toBe(false)
    expect(blank).toBe(false)
  })

  it('should wait for files that are still being uploaded', async () => {
    const revision = await mountRevision()
    revision.justification.value = VALID_JUSTIFICATION

    queue.value = [makeFile(), makeFile({ id: 2, status: 'uploading', documentId: null })]

    expect(revision.canSubmit.value).toBe(false)
  })

  it('should block a document that already has a revision under review', async () => {
    fetchDocumentDetail.mockResolvedValue(
      makeDocument({ revision: { id: 5, version: 2, status: 'PENDING' } }),
    )
    const revision = await mountRevision()
    queue.value = [makeFile()]
    revision.justification.value = VALID_JUSTIFICATION

    await revision.submit()

    expect(revision.revisionBlocked.value).toBe(true)
    expect(revision.revisionBlockedMessage.value).toContain('revisão em andamento')
    expect(createDocumentRevision).not.toHaveBeenCalled()
  })

  it('should block a document the user has no permission to see', async () => {
    fetchDocumentDetail.mockResolvedValue(
      makeDocument({ access_status: 'PENDING', responsible: { id: 3, name: 'Caio Bertoni' } }),
    )
    const revision = await mountRevision()
    queue.value = [makeFile()]
    revision.justification.value = VALID_JUSTIFICATION

    await revision.submit()

    expect(revision.revisionBlocked.value).toBe(true)
    expect(revision.revisionBlockedMessage.value).toContain('não tem permissão')
    expect(revision.canSubmit.value).toBe(false)
    expect(createDocumentRevision).not.toHaveBeenCalled()
  })

  it('should allow the responsible even without an explicit access grant', async () => {
    fetchDocumentDetail.mockResolvedValue(makeDocument({ access_status: 'PENDING' }))

    const revision = await mountRevision()

    expect(revision.revisionBlocked.value).toBe(false)
  })

  it('should allow a user with granted access who is not the responsible', async () => {
    fetchDocumentDetail.mockResolvedValue(
      makeDocument({ responsible: { id: 3, name: 'Caio Bertoni' } }),
    )

    const revision = await mountRevision()

    expect(revision.revisionBlocked.value).toBe(false)
  })

  it('should send the uploaded files with the justification and return to the list', async () => {
    const revision = await mountRevision()
    queue.value = [makeFile(), makeFile({ id: 2, status: 'invalid', documentId: null })]
    revision.justification.value = `  ${VALID_JUSTIFICATION}  `

    await revision.submit()

    expect(createDocumentRevision).toHaveBeenCalledWith('23', ['temp-a'], {
      changeDescription: VALID_JUSTIFICATION,
    })
    expect(notifications.success).toHaveBeenCalledWith('Revisão REV02 enviada para análise.')
    expect(router.push).toHaveBeenCalledWith({ name: 'document-list' })
  })

  it('should stay on the screen and warn when the submission fails', async () => {
    createDocumentRevision.mockRejectedValue(Object.assign(new Error('conflict'), { status: 409 }))
    const revision = await mountRevision()
    queue.value = [makeFile()]
    revision.justification.value = VALID_JUSTIFICATION

    await revision.submit()

    expect(notifications.error).toHaveBeenCalledWith(
      'Um dos arquivos já existe no sistema e não pode ser usado nesta revisão.',
    )
    expect(router.push).not.toHaveBeenCalled()
    expect(revision.submitting.value).toBe(false)
  })

  it('should return to the documents list on cancel', async () => {
    const revision = await mountRevision()

    revision.goToDocumentList()

    expect(router.push).toHaveBeenCalledWith({ name: 'document-list' })
  })
})
