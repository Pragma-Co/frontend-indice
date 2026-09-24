import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import DocumentDetailsView from '@/views/document/DocumentDetailsView.vue'
import { ApiError } from '@/api/client.js'
import { useAuthStore } from '@/stores/authStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { fetchDocumentDetail, requestDocumentAccess } from '@/api/documents.js'

const routeParams = { documentId: '23' }
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: routeParams }),
}))

vi.mock('docx-preview', () => ({
  renderAsync: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/api/documents.js', () => ({
  fetchDocumentDetail: vi.fn(),
  requestDocumentAccess: vi.fn(),
}))

const globalStubs = {
  Breadcrumbs: { template: '<nav />' },
  Button: { template: '<button><slot /></button>' },
  StatusBadge: { template: '<span />' },
}

const RESPONSIBLE_ID = 12
const OTHER_USER_ID = 99

function makeDocument(overrides = {}) {
  return {
    id: 23,
    code: 'AK-3400-EST-NOR-0001',
    title: 'teste 2 docs',
    description: '',
    project: { id: 4, code: 'AK-3400', name: 'Carenagem do Trem de Pouso Principal' },
    discipline: { id: 1, code: 'EST', name: 'Estruturas' },
    type: { code: 'NOR', name: 'Norma Interna' },
    confidentiality_level: 'PUBLIC',
    areas: [{ acronym: 'MFG', name: 'Manufatura e Montagem' }],
    responsible: { id: RESPONSIBLE_ID, name: 'Beatriz Canuto' },
    revision: {
      id: 36,
      version: 2,
      status: 'PENDING',
      issue_date: null,
      author: { id: RESPONSIBLE_ID, name: 'Beatriz Canuto' },
      files: [
        {
          id: 51,
          original_name: 'teste2.pdf',
          extension: 'pdf',
          mime_type: 'application/pdf',
          size_bytes: 6514,
          view_url: '/api/files/51/view',
        },
      ],
    },
    versions: [],
    access_status: 'APPROVED',
    ...overrides,
  }
}

const accessStubs = {
  Breadcrumbs: { template: '<nav />' },
  StatusBadge: { template: '<span />' },
}

const mountedViews = []

async function mountAsStranger(document, stubs = accessStubs) {
  fetchDocumentDetail.mockResolvedValue(document)
  const wrapper = mount(DocumentDetailsView, { global: { stubs } })
  mountedViews.push(wrapper)
  await flushPromises()
  return wrapper
}

function requestButton(wrapper) {
  return wrapper.find('.access-overlay button')
}

describe('DocumentDetailsView', () => {
  let authStore
  let notifications

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    notifications = useNotificationStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    mountedViews.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('should render the document title and metadata after loading', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    fetchDocumentDetail.mockResolvedValue(makeDocument())

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(fetchDocumentDetail).toHaveBeenCalledWith('23', OTHER_USER_ID)
    expect(wrapper.text()).toContain('teste 2 docs')
    expect(wrapper.text()).toContain('AK-3400-EST-NOR-0001')
    expect(wrapper.text()).toContain('Norma Interna')
  })

  it('should show "not found" when the API returns a 404', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    const err = new Error('not found')
    err.status = 404
    fetchDocumentDetail.mockRejectedValue(err)

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Documento não encontrado.')
  })

  it('should show a generic error when the API fails for another reason', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    fetchDocumentDetail.mockRejectedValue(new Error('boom'))

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar o documento.')
  })

  it('should render a PDF iframe when the first file is a PDF', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    fetchDocumentDetail.mockResolvedValue(makeDocument())

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    const iframe = wrapper.find('iframe.preview-frame')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toContain('/api/files/51/view')
    expect(iframe.attributes('src')).toContain(`user_id=${OTHER_USER_ID}`)
  })

  it('should render an img when the current file is an image', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    const doc = makeDocument({
      revision: {
        ...makeDocument().revision,
        files: [
          {
            id: 60,
            original_name: 'foto.png',
            extension: 'png',
            mime_type: 'image/png',
            view_url: '/api/files/60/view',
          },
        ],
      },
    })
    fetchDocumentDetail.mockResolvedValue(doc)

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    const img = wrapper.find('img.preview-image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toContain('/api/files/60/view')
  })

  it('should render the docx container and call renderAsync when the file is a .docx', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    const { renderAsync } = await import('docx-preview')

    const doc = makeDocument({
      revision: {
        ...makeDocument().revision,
        files: [
          {
            id: 70,
            original_name: 'contrato.docx',
            extension: 'docx',
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            view_url: '/api/files/70/view',
          },
        ],
      },
    })
    fetchDocumentDetail.mockResolvedValue(doc)

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['fake-docx'])),
    })

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('.preview-docx-wrapper').exists()).toBe(true)
    expect(renderAsync).toHaveBeenCalled()
  })

  it('should navigate to the next file when clicking "Próximo arquivo"', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    const base = makeDocument()
    const doc = makeDocument({
      revision: {
        ...base.revision,
        files: [
          { ...base.revision.files[0] },
          {
            id: 52,
            original_name: 'segundo.pdf',
            extension: 'pdf',
            mime_type: 'application/pdf',
            view_url: '/api/files/52/view',
          },
        ],
      },
    })
    fetchDocumentDetail.mockResolvedValue(doc)

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Arquivo 1 de 2')
    expect(wrapper.find('iframe.preview-frame').attributes('src')).toContain('/api/files/51/view')

    const nextBtn = wrapper
      .findAll('.preview-footer button')
      .find((b) => b.text() === 'Próximo arquivo')
    await nextBtn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Arquivo 2 de 2')
    expect(wrapper.find('iframe.preview-frame').attributes('src')).toContain('/api/files/52/view')
  })

  it('should navigate to the previous file when clicking "Arquivo anterior"', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    const base = makeDocument()
    const doc = makeDocument({
      revision: {
        ...base.revision,
        files: [
          { ...base.revision.files[0] },
          {
            id: 52,
            original_name: 'segundo.pdf',
            extension: 'pdf',
            mime_type: 'application/pdf',
            view_url: '/api/files/52/view',
          },
        ],
      },
    })
    fetchDocumentDetail.mockResolvedValue(doc)

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper
      .findAll('.preview-footer button')
      .find((b) => b.text() === 'Próximo arquivo')
      .trigger('click')
    await wrapper
      .findAll('.preview-footer button')
      .find((b) => b.text() === 'Arquivo anterior')
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Arquivo 1 de 2')
  })

  it('should disable the navigation buttons when there is only one file', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    fetchDocumentDetail.mockResolvedValue(makeDocument())

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    const buttons = wrapper.findAll('.preview-footer button')
    expect(buttons).toHaveLength(2)
    buttons.forEach((b) => expect(b.attributes('disabled')).toBeDefined())
  })

  it('should hide the file behind the blurred mask when the user has no access and is not the responsible', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }

    const wrapper = await mountAsStranger(makeDocument({ access_status: 'PENDING' }))

    expect(wrapper.find('iframe.preview-frame').exists()).toBe(false)
    expect(wrapper.find('.preview-panel').classes()).toContain('is-restricted')
    expect(wrapper.find('.preview-masked').exists()).toBe(true)
    expect(wrapper.find('.access-overlay').text()).toContain('Conteúdo restrito')
    expect(requestButton(wrapper).text()).toBe('Solicitar Acesso')
    expect(wrapper.find('.preview-footer').exists()).toBe(false)
  })

  it('should also restrict a document whose revision is still in review', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }

    const wrapper = await mountAsStranger(makeDocument({ access_status: 'IN_REVIEW' }))

    expect(wrapper.find('.access-overlay').exists()).toBe(true)
    expect(wrapper.find('iframe.preview-frame').exists()).toBe(false)
  })

  it('should keep the metadata visible while the content is restricted', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }

    const wrapper = await mountAsStranger(makeDocument({ access_status: 'PENDING' }))

    expect(wrapper.text()).toContain('teste 2 docs')
    expect(wrapper.text()).toContain('Beatriz Canuto')
  })

  it('should render the reduced payload the backend sends to a user without access', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    const { description, ...reduced } = makeDocument({ access_status: 'PENDING' })
    delete reduced.revision.files

    const wrapper = await mountAsStranger(reduced)

    expect(wrapper.find('.description-block').exists()).toBe(false)
    expect(wrapper.find('.access-overlay').exists()).toBe(true)
    expect(description).toBeDefined()
  })

  it('should allow the responsible user to preview even when access is PENDING', async () => {
    authStore.currentUser = { id: RESPONSIBLE_ID, name: 'Beatriz Canuto' }
    fetchDocumentDetail.mockResolvedValue(makeDocument({ access_status: 'PENDING' }))

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('iframe.preview-frame').exists()).toBe(true)
  })

  it('should send the request with the logged-in user, confirm it and disable the button', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    let finishRequest
    requestDocumentAccess.mockReturnValue(new Promise((resolve) => (finishRequest = resolve)))
    const wrapper = await mountAsStranger(makeDocument({ access_status: 'PENDING' }))

    await requestButton(wrapper).trigger('click')
    expect(requestButton(wrapper).attributes('disabled')).toBeDefined()
    expect(requestButton(wrapper).text()).toContain('Enviando solicitação')
    finishRequest({ id: 9, status: 'PENDING', created: true })
    await flushPromises()

    expect(requestDocumentAccess).toHaveBeenCalledWith('23', OTHER_USER_ID)
    expect(fetchDocumentDetail).toHaveBeenCalledTimes(1)
    expect(requestButton(wrapper).text()).toBe('Solicitação enviada')
    expect(requestButton(wrapper).attributes('disabled')).toBeDefined()
    expect(notifications.items[0]).toMatchObject({
      type: 'success',
      message: 'Solicitação enviada. O responsável pelo documento foi notificado.',
    })
  })

  it('should show the error and let the user try again when the request fails', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    requestDocumentAccess.mockRejectedValue(new ApiError('Erro interno.', { status: 500 }))
    const wrapper = await mountAsStranger(makeDocument({ access_status: 'PENDING' }))

    await requestButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.find('.access-overlay [role="alert"]').text()).toContain(
      'Não foi possível enviar a solicitação',
    )
    expect(requestButton(wrapper).text()).toBe('Solicitar Acesso')
    expect(requestButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(notifications.items[0].type).toBe('error')
  })

  it('should start as sent when the backend already has a pending request', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }

    const wrapper = await mountAsStranger(
      makeDocument({
        access_status: 'PENDING',
        access_request: { id: 9, status: 'PENDING', created_at: '2026-09-22' },
      }),
    )

    expect(requestButton(wrapper).text()).toBe('Solicitação enviada')
    expect(requestButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should show the refusal and no button when the request was rejected', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }

    const wrapper = await mountAsStranger(
      makeDocument({
        access_status: 'PENDING',
        access_request: { id: 9, status: 'REJECTED', created_at: '2026-09-22' },
      }),
    )

    expect(wrapper.find('.access-overlay').text()).toContain('recusada pelo responsável')
    expect(wrapper.find('.access-overlay button').exists()).toBe(false)
  })

  it('should reload the document when the backend says the user already has access', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    requestDocumentAccess.mockRejectedValue(new ApiError('Já tem acesso.', { status: 409 }))
    fetchDocumentDetail
      .mockResolvedValueOnce(makeDocument({ access_status: 'PENDING' }))
      .mockResolvedValueOnce(makeDocument({ access_status: 'APPROVED' }))
    const wrapper = mount(DocumentDetailsView, { global: { stubs: accessStubs } })
    mountedViews.push(wrapper)
    await flushPromises()

    await requestButton(wrapper).trigger('click')
    await flushPromises()

    expect(fetchDocumentDetail).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.access-overlay').exists()).toBe(false)
    expect(wrapper.find('iframe.preview-frame').exists()).toBe(true)
    expect(notifications.items).toHaveLength(0)
  })

  it('should show "Nenhum arquivo disponível" when the revision has no files', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante' }
    const doc = makeDocument({
      revision: { ...makeDocument().revision, files: [] },
    })
    fetchDocumentDetail.mockResolvedValue(doc)

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Nenhum arquivo disponível para esta revisão.')
    expect(wrapper.find('.preview-footer').exists()).toBe(false)
  })
})
