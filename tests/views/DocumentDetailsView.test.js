import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import DocumentDetailsView from '@/views/document/DocumentDetailsView.vue'
import { useAuthStore } from '@/stores/authStore.js'
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

describe('DocumentDetailsView', () => {
  let authStore

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    vi.clearAllMocks()
  })

  it('should render the document title and metadata after loading', async () => {
    authStore.user = { id: OTHER_USER_ID, name: 'Visitante' }
    fetchDocumentDetail.mockResolvedValue(makeDocument())

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(fetchDocumentDetail).toHaveBeenCalledWith('23', OTHER_USER_ID)
    expect(wrapper.text()).toContain('teste 2 docs')
    expect(wrapper.text()).toContain('AK-3400-EST-NOR-0001')
    expect(wrapper.text()).toContain('Norma Interna')
  })

  it('should show "not found" when the API returns a 404', async () => {
    authStore.user = { id: OTHER_USER_ID }
    const err = new Error('not found')
    err.status = 404
    fetchDocumentDetail.mockRejectedValue(err)

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Documento não encontrado.')
  })

  it('should show a generic error when the API fails for another reason', async () => {
    authStore.user = { id: OTHER_USER_ID }
    fetchDocumentDetail.mockRejectedValue(new Error('boom'))

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar o documento.')
  })

  it('should render a PDF iframe when the first file is a PDF', async () => {
    authStore.user = { id: OTHER_USER_ID }
    fetchDocumentDetail.mockResolvedValue(makeDocument())

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    const iframe = wrapper.find('iframe.preview-frame')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toContain('/api/files/51/view')
    expect(iframe.attributes('src')).toContain(`user_id=${OTHER_USER_ID}`)
  })

  it('should render an img when the current file is an image', async () => {
    authStore.user = { id: OTHER_USER_ID }
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
    authStore.user = { id: OTHER_USER_ID }
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
    authStore.user = { id: OTHER_USER_ID }
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
    authStore.user = { id: OTHER_USER_ID }
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
    authStore.user = { id: OTHER_USER_ID }
    fetchDocumentDetail.mockResolvedValue(makeDocument())

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    const buttons = wrapper.findAll('.preview-footer button')
    expect(buttons).toHaveLength(2)
    buttons.forEach((b) => expect(b.attributes('disabled')).toBeDefined())
  })

  it('should show the access placeholder when the user has no access and is not the responsible', async () => {
    authStore.user = { id: OTHER_USER_ID }
    fetchDocumentDetail.mockResolvedValue(makeDocument({ access_status: 'PENDING' }))

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('iframe.preview-frame').exists()).toBe(false)
    expect(wrapper.text()).toContain('Solicite acesso para visualizar o documento.')
    expect(wrapper.text()).toContain('Solicitar Acesso')
  })

  it('should allow the responsible user to preview even when access is PENDING', async () => {
    authStore.user = { id: RESPONSIBLE_ID }
    fetchDocumentDetail.mockResolvedValue(makeDocument({ access_status: 'PENDING' }))

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('iframe.preview-frame').exists()).toBe(true)
  })

  it('should request access and reload the document when clicking "Solicitar Acesso"', async () => {
    authStore.user = { id: OTHER_USER_ID }
    fetchDocumentDetail.mockResolvedValue(makeDocument({ access_status: 'PENDING' }))
    requestDocumentAccess.mockResolvedValue({})

    const wrapper = mount(DocumentDetailsView, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(fetchDocumentDetail).toHaveBeenCalledTimes(1)

    const requestBtn = wrapper.findAll('button').find((b) => b.text() === 'Solicitar Acesso')
    await requestBtn.trigger('click')
    await flushPromises()

    expect(requestDocumentAccess).toHaveBeenCalledWith('23', OTHER_USER_ID)
    expect(fetchDocumentDetail).toHaveBeenCalledTimes(2)
  })

  it('should show "Nenhum arquivo disponível" when the revision has no files', async () => {
    authStore.user = { id: OTHER_USER_ID }
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
