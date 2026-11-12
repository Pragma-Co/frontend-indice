import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterLinkStub, flushPromises, mount } from '@vue/test-utils'

vi.mock('@/api/recommendations.js', () => ({ fetchDocumentRecommendations: vi.fn() }))

import { fetchDocumentRecommendations } from '@/api/recommendations.js'
import RecommendedDocuments from '@/views/document/components/RecommendedDocuments.vue'

function makeItem(id, title) {
  return {
    id,
    code: `AK-2100-EST-MEM-00${id}`,
    title,
    type: { name: 'Memorial de Cálculo' },
    discipline: { name: 'Estruturas' },
    revision: { label: 'REV01' },
    status: 'APPROVED',
    matches: { project: true, discipline: false, type: false, tags: [], areas: [], themes: [] },
  }
}

const COLLECTIONS = [
  { key: 'theme', title: 'Temas relacionados', count: 3, items: [makeItem(15, 'Memorial A')] },
  { key: 'project', title: 'Mesmo projeto', count: 1, items: [makeItem(16, 'Desenho B')] },
  { key: 'area', title: 'Mesma área', count: 0, items: [] },
]

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function mountSection() {
  const wrapper = mount(RecommendedDocuments, {
    props: { documentId: '37' },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
  await flushPromises()
  return wrapper
}

function cardTitles(wrapper) {
  return wrapper.findAll('.recommended-title').map((title) => title.text())
}

describe('RecommendedDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchDocumentRecommendations.mockResolvedValue({ collections: COLLECTIONS })
  })

  it('should show a skeleton while the recommendations load', async () => {
    fetchDocumentRecommendations.mockReturnValue(deferred().promise)

    const wrapper = await mountSection()

    expect(wrapper.find('[role="status"]').attributes('aria-label')).toBe('Carregando recomendados')
    expect(wrapper.findAll('.skeleton-card')).toHaveLength(4)
    expect(wrapper.find('.carousel').exists()).toBe(false)
  })

  it('should offer one tab per collection with documents and open the first', async () => {
    const wrapper = await mountSection()

    const tabs = wrapper.findAll('[role="tab"]')

    expect(fetchDocumentRecommendations).toHaveBeenCalledWith('37')
    expect(tabs.map((tab) => tab.text())).toEqual(['Temas relacionados (3)', 'Mesmo projeto (1)'])
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(cardTitles(wrapper)).toEqual(['Memorial A'])
  })

  it('should show the documents of the chosen collection', async () => {
    const wrapper = await mountSection()

    await wrapper.findAll('[role="tab"]')[1].trigger('click')

    expect(cardTitles(wrapper)).toEqual(['Desenho B'])
    expect(wrapper.find('.carousel-track').attributes('aria-label')).toBe(
      'Documentos recomendados: Mesmo projeto',
    )
  })

  it('should name the only collection instead of showing tabs', async () => {
    fetchDocumentRecommendations.mockResolvedValue({ collections: [COLLECTIONS[1]] })

    const wrapper = await mountSection()

    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.find('.recommended-single').text()).toBe('Mesmo projeto (1)')
  })

  it('should say when nothing is related to the document', async () => {
    fetchDocumentRecommendations.mockResolvedValue({ collections: [COLLECTIONS[2]] })

    const wrapper = await mountSection()

    expect(wrapper.text()).toContain('Nenhum documento relacionado a este por enquanto.')
    expect(wrapper.find('.carousel').exists()).toBe(false)
  })

  it('should explain a failure and load again on retry', async () => {
    fetchDocumentRecommendations.mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountSection()
    const alert = wrapper.find('[role="alert"]').text()

    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(alert).toContain('Não foi possível carregar os documentos recomendados.')
    expect(cardTitles(wrapper)).toEqual(['Memorial A'])
  })

  it('should link each card to the details of its document', async () => {
    const wrapper = await mountSection()

    expect(wrapper.findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'document-details',
      params: { documentId: 15 },
    })
  })
})
