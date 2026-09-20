import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DocumentListView from '../../src/views/DocumentListView.vue'

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push }),
}))
vi.mock('../../src/api/documents', () => ({ fetchDocuments: vi.fn() }))

import { fetchDocuments } from '../../src/api/documents'

const NEWEST = {
  id: 9,
  code: 'AK-2100-EST-DWG-0006',
  title: 'Desenho de conjunto da caverna 14',
  description: '',
  type: { code: 'DWG', name: 'Desenho Técnico' },
  areas: [{ acronym: 'EST', name: 'Engenharia Estrutural' }],
  status: 'PENDING',
  updated_at: '2026-09-17T12:00:00+00:00',
}
const OLDER = {
  id: 3,
  code: 'AK-2100-EST-MEM-0001',
  title: 'Memorial de cálculo da longarina',
  description: '',
  type: { code: 'MEM', name: 'Memorial' },
  areas: [],
  status: 'APPROVED',
  updated_at: '2026-09-10T12:00:00+00:00',
}

describe('DocumentListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should keep the order of the API so the newest document stays on top', async () => {
    fetchDocuments.mockResolvedValue({ documents: [NEWEST, OLDER] })

    const wrapper = mount(DocumentListView)
    await flushPromises()

    const titles = wrapper.findAll('.document-card h2').map((title) => title.text())
    expect(titles).toEqual([
      'Desenho de conjunto da caverna 14',
      'Memorial de cálculo da longarina',
    ])
  })

  it('should show a freshly published document as under review', async () => {
    fetchDocuments.mockResolvedValue({ documents: [NEWEST, OLDER] })

    const wrapper = mount(DocumentListView)
    await flushPromises()

    const [first, second] = wrapper.findAll('.document-card')
    expect(first.find('.status-badge').text()).toBe('Em revisão')
    expect(second.find('.status-badge').text()).toBe('Vigente')
  })

  it('should render the card without a badge while the API does not send the status', async () => {
    const withoutStatus = { ...NEWEST, status: undefined }
    fetchDocuments.mockResolvedValue({ documents: [withoutStatus] })

    const wrapper = mount(DocumentListView)
    await flushPromises()

    expect(wrapper.findAll('.document-card')).toHaveLength(1)
    expect(wrapper.find('.status-badge').exists()).toBe(false)
  })

  it('should show a friendly message when the list cannot be loaded', async () => {
    fetchDocuments.mockRejectedValue(new Error('Documents failed with status 500'))

    const wrapper = mount(DocumentListView)
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar os documentos.')
    expect(wrapper.text()).not.toContain('500')
  })
})
