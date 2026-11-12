import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { RouterLinkStub, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import DocumentDetailsView from '@/views/document/DocumentDetailsView.vue'
import { ApiError } from '@/api/client.js'
import { useAuthStore } from '@/stores/authStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { fetchDocumentDetail, requestDocumentAccess } from '@/api/documents.js'
import { fetchDocumentRecommendations } from '@/api/recommendations.js'

const route = reactive({ params: { documentId: '23' }, query: {} })
const routeParams = route.params
vi.mock('vue-router', () => ({
  useRoute: () => route,
}))

vi.mock('@/api/recommendations.js', () => ({
  fetchDocumentRecommendations: vi.fn().mockResolvedValue({ collections: [] }),
}))

vi.mock('docx-preview', () => ({
  renderAsync: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/api/documents.js', () => ({
  fetchDocumentDetail: vi.fn(),
  requestDocumentAccess: vi.fn(),
}))

const globalStubs = {
  RouterLink: RouterLinkStub,
  Breadcrumbs: { template: '<nav />' },
  Button: { template: '<button><slot /></button>' },
  StatusBadge: { template: '<span />' },
  ProtectedPdf: { props: ['url'], template: '<div class="test-pdf">{{ url }}</div>' },
  ProtectedImage: { props: ['url'], template: '<div class="test-image">{{ url }}</div>' },
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
    responsible: { id: RESPONSIBLE_ID, name: 'Beatriz Canuto', email: 'beatriz@example.com' },
    revision: {
      id: 36,
      version: 2,
      status: 'PENDING',
      issue_date: null,
      author: { id: RESPONSIBLE_ID, name: 'Beatriz Canuto', email: 'beatriz@example.com' },
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
  RouterLink: RouterLinkStub,
  Breadcrumbs: { template: '<nav />' },
  StatusBadge: { template: '<span />' },
  ProtectedPdf: { props: ['url'], template: '<div class="test-pdf">{{ url }}</div>' },
  ProtectedImage: { props: ['url'], template: '<div class="test-image">{{ url }}</div>' },
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

const VALID_JUSTIFICATION = 'Preciso consultar este documento para o projeto.'

async function fillAndSubmit(wrapper) {
  await requestButton(wrapper).trigger('click')
  await wrapper.find('.access-overlay textarea').setValue(VALID_JUSTIFICATION)
  await submitButton(wrapper).trigger('click')
}

function submitButton(wrapper) {
  return wrapper.find('.dialog-actions button:last-child')
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
    vi.unstubAllGlobals()
  })

  it('should render the document title and metadata after loading', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    fetchDocumentDetail.mockResolvedValue(makeDocument())

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(fetchDocumentDetail).toHaveBeenCalledWith('23', OTHER_USER_ID)
    expect(wrapper.text()).toContain('teste 2 docs')
    expect(wrapper.text()).toContain('AK-3400-EST-NOR-0001')
    expect(wrapper.text()).toContain('Norma Interna')
  })

  it('should show "not found" when the API returns a 404', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    const err = new Error('not found')
    err.status = 404
    fetchDocumentDetail.mockRejectedValue(err)

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Documento não encontrado.')
  })

  it('should show a generic error when the API fails for another reason', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    fetchDocumentDetail.mockRejectedValue(new Error('boom'))

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar o documento.')
  })

  it('should render the protected PDF viewer when the first file is a PDF', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    fetchDocumentDetail.mockResolvedValue(makeDocument())

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    const pdf = wrapper.find('.test-pdf')
    expect(pdf.exists()).toBe(true)
    expect(pdf.text()).toContain('/api/files/51/view')
    expect(pdf.text()).toContain(`user_id=${OTHER_USER_ID}`)
    expect(wrapper.find('.protected-watermark').exists()).toBe(true)
  })

  it.each([
    ['CONFIDENTIAL', 'teste.pdf', 'application/pdf', '.test-pdf'],
    ['SECRET', 'teste.pdf', 'application/pdf', '.test-pdf'],
    ['SECRET', 'foto.png', 'image/png', '.test-image'],
    ['CONFIDENTIAL', 'contrato.docx', 'application/octet-stream', '.preview-docx'],
  ])('protects %s %s previews', async (level, name, mimeType, selector) => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => new Blob(['docx']),
        text: async () => '',
      }),
    )
    const base = makeDocument()
    const wrapper = await mountAsStranger(
      makeDocument({
        confidentiality_level: level,
        revision: {
          ...base.revision,
          files: [{ ...base.revision.files[0], original_name: name, mime_type: mimeType }],
        },
      }),
      {
        ...globalStubs,
        ProtectedPdf: { props: ['url'], template: '<div class="test-pdf">{{ url }}</div>' },
      },
    )

    expect(wrapper.find(`.protected-content ${selector}`).exists()).toBe(true)
    expect(wrapper.find('.protected-watermark').text()).toContain(
      'Visitante · visitante@example.com',
    )
    if (selector === '.test-pdf') {
      expect(wrapper.find(selector).text()).toContain(`/api/files/51/view?user_id=${OTHER_USER_ID}`)
    }
    if (selector === '.preview-docx') {
      const { renderAsync } = await import('docx-preview')
      expect(renderAsync).toHaveBeenCalled()
    }
    const copy = new Event('copy', { bubbles: true, cancelable: true })
    wrapper.find(selector).element.dispatchEvent(copy)
    expect(copy.defaultPrevented).toBe(true)
    const outsideCopy = new Event('copy', { bubbles: true, cancelable: true })
    wrapper.find('.document-card').element.dispatchEvent(outsideCopy)
    expect(outsideCopy.defaultPrevented).toBe(false)
  })

  it.each([
    { name: '', email: 'visitante@example.com' },
    { name: 'Visitante', email: '' },
  ])('does not display a protected preview without a name and email', async (identity) => {
    authStore.currentUser = { id: OTHER_USER_ID, ...identity }
    fetchDocumentDetail.mockResolvedValue(makeDocument({ confidentiality_level: 'SECRET' }))
    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    mountedViews.push(wrapper)
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível identificar o usuário')
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.find('.protected-watermark').exists()).toBe(false)
  })

  it('should render an img when the current file is an image', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
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

    const img = wrapper.find('.test-image')
    expect(img.exists()).toBe(true)
    expect(img.text()).toContain('/api/files/60/view')
  })

  it('should render the docx container and call renderAsync when the file is a .docx', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
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

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob(['fake-docx'])),
        text: async () => '',
      }),
    )

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('.preview-docx-wrapper').exists()).toBe(true)
    expect(renderAsync).toHaveBeenCalled()
  })

  it('should highlight rejected versions and hide the preview for that revision', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    const doc = makeDocument({
      revision: {
        ...makeDocument().revision,
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
      versions: [
        {
          id: 99,
          version: 1,
          status: 'REJECTED',
          issue_date: '2026-09-10',
          author: { id: RESPONSIBLE_ID, name: 'Beatriz Canuto', email: 'beatriz@example.com' },
          files: [
            {
              id: 88,
              original_name: 'rejeitada.pdf',
              extension: 'pdf',
              mime_type: 'application/pdf',
              size_bytes: 6514,
              view_url: '/api/files/88/view',
            },
          ],
          change_description: 'Versão rejeitada',
        },
      ],
    })
    fetchDocumentDetail.mockResolvedValue(doc)

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    const rejectedCard = wrapper
      .findAll('.revision-list li')
      .find((item) => item.text().includes('REV1'))
    expect(rejectedCard.exists()).toBe(true)
    expect(rejectedCard.classes()).toContain('is-rejected')

    await rejectedCard.trigger('click')
    await flushPromises()

    expect(wrapper.find('.test-pdf').exists()).toBe(false)
    expect(wrapper.text()).toContain('Documento indisponível para esta revisão')
  })

  it('should navigate to the next file when clicking "Próximo arquivo"', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
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
    expect(wrapper.find('.test-pdf').text()).toContain('/api/files/51/view')

    const nextBtn = wrapper
      .findAll('.preview-footer button')
      .find((b) => b.text() === 'Próximo arquivo')
    await nextBtn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Arquivo 2 de 2')
    expect(wrapper.find('.test-pdf').text()).toContain('/api/files/52/view')
  })

  it('should navigate to the previous file when clicking "Arquivo anterior"', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
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

  it('should show the files belonging to the selected revision', async () => {
    authStore.currentUser = {
      id: RESPONSIBLE_ID,
      name: 'Beatriz Canuto',
      email: 'beatriz@example.com',
    }
    const current = makeDocument().revision
    const document = makeDocument({
      revision: current,
      versions: [
        current,
        {
          ...current,
          id: 35,
          version: 1,
          files: [
            {
              id: 40,
              original_name: 'rev01-original.pdf',
              extension: 'pdf',
              mime_type: 'application/pdf',
              view_url: '/api/files/40/view',
            },
          ],
        },
      ],
    })
    fetchDocumentDetail.mockResolvedValue(document)

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper
      .findAll('.revision-list li')
      .find((revision) => revision.text().includes('REV1'))
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Arquivo 1 de 1')
    expect(wrapper.text()).toContain('rev01-original.pdf')
    expect(wrapper.find('.test-pdf').text()).toContain('/api/files/40/view')
  })

  it('should link to the dedicated new revision screen instead of uploading files in place', async () => {
    authStore.currentUser = {
      id: RESPONSIBLE_ID,
      name: 'Beatriz Canuto',
      email: 'beatriz@example.com',
    }
    const current = makeDocument().revision
    fetchDocumentDetail.mockResolvedValue(
      makeDocument({ revision: { ...current, status: 'APPROVED' } }),
    )
    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    const link = wrapper.findComponent(RouterLinkStub)

    expect(link.text()).toBe('Nova Revisão')
    expect(link.props('to')).toEqual({
      name: 'document-new-revision',
      params: { documentId: '23' },
    })
    expect(wrapper.find('.revision-action button').exists()).toBe(false)
  })

  it('should not offer the new revision shortcut to a user without access', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    const current = makeDocument().revision
    const wrapper = await mountAsStranger(
      makeDocument({ access_status: 'PENDING', revision: { ...current, status: 'APPROVED' } }),
    )

    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
    expect(wrapper.find('.revision-action').exists()).toBe(false)
  })

  it('should keep the details screen read only without upload controls', async () => {
    authStore.currentUser = {
      id: RESPONSIBLE_ID,
      name: 'Beatriz Canuto',
      email: 'beatriz@example.com',
    }
    const current = makeDocument().revision
    fetchDocumentDetail.mockResolvedValue(
      makeDocument({ revision: { ...current, status: 'APPROVED' } }),
    )
    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('.dropzone').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/arraste|enviar arquivos|selecionar arquivos/i)
  })

  it('should block a new revision while the current one is under review', async () => {
    authStore.currentUser = {
      id: RESPONSIBLE_ID,
      name: 'Beatriz Canuto',
      email: 'beatriz@example.com',
    }
    fetchDocumentDetail.mockResolvedValue(makeDocument())
    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    const blocked = wrapper.find('.revision-action-link')

    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
    expect(blocked.attributes('aria-disabled')).toBe('true')
    expect(blocked.text()).toBe('Nova Revisão')
    expect(wrapper.find('.revision-action-hint').text()).toContain('revisão em andamento')
  })

  it('should disable the navigation buttons when there is only one file', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    fetchDocumentDetail.mockResolvedValue(makeDocument())

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    const buttons = wrapper.findAll('.preview-footer button')
    expect(buttons).toHaveLength(2)
    buttons.forEach((b) => expect(b.attributes('disabled')).toBeDefined())
  })

  it('should hide the file behind the blurred mask when the user has no access and is not the responsible', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }

    const wrapper = await mountAsStranger(makeDocument({ access_status: 'PENDING' }))

    expect(wrapper.find('.test-pdf').exists()).toBe(false)
    expect(wrapper.find('.preview-panel').classes()).toContain('is-restricted')
    expect(wrapper.find('.preview-masked').exists()).toBe(true)
    expect(wrapper.find('.access-overlay').text()).toContain('Conteúdo restrito')
    expect(requestButton(wrapper).text()).toBe('Solicitar Acesso')
    expect(wrapper.find('.preview-footer').exists()).toBe(false)
  })

  it('should also restrict a document whose revision is still in review', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }

    const wrapper = await mountAsStranger(makeDocument({ access_status: 'IN_REVIEW' }))

    expect(wrapper.find('.access-overlay').exists()).toBe(true)
    expect(wrapper.find('.test-pdf').exists()).toBe(false)
  })

  it('should keep the metadata visible while the content is restricted', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }

    const wrapper = await mountAsStranger(makeDocument({ access_status: 'PENDING' }))

    expect(wrapper.text()).toContain('teste 2 docs')
    expect(wrapper.text()).toContain('Beatriz Canuto')
  })

  it('should render the reduced payload the backend sends to a user without access', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    const { description, ...reduced } = makeDocument({ access_status: 'PENDING' })
    delete reduced.revision.files

    const wrapper = await mountAsStranger(reduced)

    expect(wrapper.find('.description-block').exists()).toBe(false)
    expect(wrapper.find('.access-overlay').exists()).toBe(true)
    expect(description).toBeDefined()
  })

  it('should allow the responsible user to preview even when access is PENDING', async () => {
    authStore.currentUser = {
      id: RESPONSIBLE_ID,
      name: 'Beatriz Canuto',
      email: 'beatriz@example.com',
    }
    fetchDocumentDetail.mockResolvedValue(makeDocument({ access_status: 'PENDING' }))

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('.test-pdf').exists()).toBe(true)
  })

  it('should send the request with the logged-in user, confirm it and disable the button', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    let finishRequest
    requestDocumentAccess.mockReturnValue(new Promise((resolve) => (finishRequest = resolve)))
    const wrapper = await mountAsStranger(makeDocument({ access_status: 'PENDING' }))

    await fillAndSubmit(wrapper)
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
    expect(submitButton(wrapper).text()).toContain('Enviando solicitação')
    finishRequest({ id: 9, status: 'PENDING', created: true })
    await flushPromises()

    expect(requestDocumentAccess).toHaveBeenCalledWith('23', OTHER_USER_ID, {
      justification: VALID_JUSTIFICATION,
      access_type: 'PERMANENT',
      expires_on: null,
    })
    expect(fetchDocumentDetail).toHaveBeenCalledTimes(1)
    expect(requestButton(wrapper).text()).toBe('Solicitação enviada')
    expect(requestButton(wrapper).attributes('disabled')).toBeDefined()
    expect(notifications.items[0]).toMatchObject({
      type: 'success',
      message: 'Solicitação enviada para análise de um gestor.',
    })
  })

  it('should show the error and let the user try again when the request fails', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    requestDocumentAccess.mockRejectedValue(new ApiError('Erro interno.', { status: 500 }))
    const wrapper = await mountAsStranger(makeDocument({ access_status: 'PENDING' }))

    await fillAndSubmit(wrapper)
    await flushPromises()

    expect(wrapper.find('.dialog [role="alert"]').text()).toContain(
      'Não foi possível enviar a solicitação',
    )
    expect(submitButton(wrapper).text()).toBe('Enviar solicitação')
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(notifications.items[0].type).toBe('error')
  })

  it('should explain a network failure and keep the typed justification', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    requestDocumentAccess.mockRejectedValue(
      new ApiError('Não foi possível conectar ao servidor.', { status: 0 }),
    )
    const wrapper = await mountAsStranger(makeDocument({ access_status: 'PENDING' }))

    await fillAndSubmit(wrapper)
    await flushPromises()

    expect(wrapper.find('.dialog [role="alert"]').text()).toContain('Sem conexão')
    expect(wrapper.find('textarea').element.value).toBe(VALID_JUSTIFICATION)
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('should not call the API when the justification is invalid', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    const wrapper = await mountAsStranger(makeDocument({ access_status: 'PENDING' }))

    await requestButton(wrapper).trigger('click')
    await submitButton(wrapper).trigger('click')

    expect(requestDocumentAccess).not.toHaveBeenCalled()
  })

  it('should lock the form when the backend reports a duplicate pending request', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    requestDocumentAccess.mockRejectedValue(new ApiError('Duplicada.', { status: 409 }))
    fetchDocumentDetail
      .mockResolvedValueOnce(makeDocument({ access_status: 'PENDING' }))
      .mockResolvedValueOnce(
        makeDocument({
          access_status: 'PENDING',
          access_request: { id: 9, status: 'PENDING', created_at: '2026-09-22' },
        }),
      )
    const wrapper = mount(DocumentDetailsView, { global: { stubs: accessStubs } })
    mountedViews.push(wrapper)
    await flushPromises()

    await fillAndSubmit(wrapper)
    await flushPromises()

    expect(requestButton(wrapper).text()).toBe('Solicitação enviada')
    expect(requestButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should start as sent when the backend already has a pending request', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }

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
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }

    const wrapper = await mountAsStranger(
      makeDocument({
        access_status: 'PENDING',
        access_request: { id: 9, status: 'REJECTED', created_at: '2026-09-22' },
      }),
    )

    expect(wrapper.find('.access-overlay').text()).toContain('recusada pelo gestor')
    expect(wrapper.find('.access-overlay button').exists()).toBe(false)
  })

  it('should reload the document when the backend says the user already has access', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    requestDocumentAccess.mockRejectedValue(new ApiError('Já tem acesso.', { status: 409 }))
    fetchDocumentDetail
      .mockResolvedValueOnce(makeDocument({ access_status: 'PENDING' }))
      .mockResolvedValueOnce(makeDocument({ access_status: 'APPROVED' }))
    const wrapper = mount(DocumentDetailsView, { global: { stubs: accessStubs } })
    mountedViews.push(wrapper)
    await flushPromises()

    await fillAndSubmit(wrapper)
    await flushPromises()

    expect(fetchDocumentDetail).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.access-overlay').exists()).toBe(false)
    expect(wrapper.find('.test-pdf').exists()).toBe(true)
    expect(notifications.items).toHaveLength(0)
  })

  it('should show "Nenhum arquivo disponível" when the revision has no files', async () => {
    authStore.currentUser = { id: OTHER_USER_ID, name: 'Visitante', email: 'visitante@example.com' }
    const doc = makeDocument({
      revision: { ...makeDocument().revision, files: [] },
    })
    fetchDocumentDetail.mockResolvedValue(doc)

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Nenhum arquivo disponível para esta revisão.')
    expect(wrapper.find('.preview-footer').exists()).toBe(false)
  })

  describe('recommended documents', () => {
    afterEach(() => {
      routeParams.documentId = '23'
    })

    it('should show the recommendations of the document being viewed', async () => {
      authStore.currentUser = {
        id: RESPONSIBLE_ID,
        name: 'Beatriz Canuto',
        email: 'beatriz@example.com',
      }
      fetchDocumentDetail.mockResolvedValue(makeDocument())

      const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
      mountedViews.push(wrapper)
      await flushPromises()

      expect(wrapper.find('#recommended-title').text()).toBe('Recomendados')
      expect(fetchDocumentRecommendations).toHaveBeenCalledWith('23')
    })

    it('should load the new document and its recommendations when a recommendation is opened', async () => {
      authStore.currentUser = {
        id: RESPONSIBLE_ID,
        name: 'Beatriz Canuto',
        email: 'beatriz@example.com',
      }
      fetchDocumentDetail.mockResolvedValue(makeDocument())
      const scrollTo = vi.fn()
      vi.stubGlobal('scrollTo', scrollTo)
      const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
      mountedViews.push(wrapper)
      await flushPromises()
      fetchDocumentDetail.mockResolvedValue(
        makeDocument({ id: 40, title: 'Documento recomendado' }),
      )

      routeParams.documentId = '40'
      await flushPromises()

      expect(fetchDocumentDetail).toHaveBeenLastCalledWith('40', RESPONSIBLE_ID)
      expect(fetchDocumentRecommendations).toHaveBeenLastCalledWith('40')
      expect(scrollTo).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Documento recomendado')
    })

    it('should not show recommendations for a document that does not exist', async () => {
      fetchDocumentDetail.mockRejectedValue(
        new ApiError('Recurso não encontrado.', { status: 404 }),
      )

      const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
      mountedViews.push(wrapper)
      await flushPromises()

      expect(wrapper.find('#recommended-title').exists()).toBe(false)
    })
  })
})
