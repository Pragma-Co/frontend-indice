import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/api/recommendations.js', () => ({ fetchDocumentRecommendations: vi.fn() }))

import { fetchDocumentRecommendations } from '@/api/recommendations.js'
import {
  normalizeCollection,
  normalizeRecommendedDocument,
  useDocumentRecommendations,
} from '@/views/document/composables/useDocumentRecommendations.js'

function makeItem(overrides = {}) {
  return {
    id: 15,
    code: 'AK-2100-EST-MEM-0002',
    title: 'Memorial de cálculo da caverna 14',
    type: { code: 'MEM', name: 'Memorial de Cálculo' },
    discipline: { code: 'EST', name: 'Estruturas' },
    revision: { version: 1, label: 'REV01' },
    status: 'APPROVED',
    score: 8,
    matches: {
      project: true,
      discipline: true,
      type: false,
      tags: ['fadiga'],
      areas: ['EST'],
      themes: ['titânio'],
    },
    ...overrides,
  }
}

function makeCollection(key, title, items) {
  return { key, title, count: items.length, items }
}

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function mountRecommendations(documentId) {
  let recommendations
  mount(
    defineComponent({
      setup() {
        recommendations = useDocumentRecommendations(documentId)
        return () => h('div')
      },
    }),
  )
  await flushPromises()
  return recommendations
}

describe('normalizeRecommendedDocument', () => {
  it('should keep what the card shows and explain why it was recommended', () => {
    expect(normalizeRecommendedDocument(makeItem())).toEqual({
      id: 15,
      code: 'AK-2100-EST-MEM-0002',
      title: 'Memorial de cálculo da caverna 14',
      type: 'Memorial de Cálculo',
      discipline: 'Estruturas',
      revision: 'REV01',
      status: 'APPROVED',
      reasons: ['Mesmo projeto', 'Mesma disciplina', '#fadiga', '#titânio', 'Área EST'],
    })
  })

  it('should tolerate an item without metadata or matches', () => {
    expect(normalizeRecommendedDocument({ id: 3 })).toEqual({
      id: 3,
      code: '-',
      title: '-',
      type: null,
      discipline: null,
      revision: null,
      status: null,
      reasons: [],
    })
  })
})

describe('normalizeCollection', () => {
  it('should keep the total of related documents even when the items are capped', () => {
    const collection = normalizeCollection({
      ...makeCollection('theme', 'Temas', [makeItem()]),
      count: 9,
    })

    expect(collection).toMatchObject({ key: 'theme', title: 'Temas', count: 9 })
    expect(collection.items).toHaveLength(1)
  })
})

describe('useDocumentRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load the recommendations of the document and open the first collection', async () => {
    fetchDocumentRecommendations.mockResolvedValue({
      collections: [
        makeCollection('theme', 'Temas relacionados', [makeItem()]),
        makeCollection('project', 'Mesmo projeto', [makeItem({ id: 16 })]),
      ],
    })

    const recommendations = await mountRecommendations(ref('37'))

    expect(fetchDocumentRecommendations).toHaveBeenCalledWith('37')
    expect(recommendations.collections.value.map((collection) => collection.key)).toEqual([
      'theme',
      'project',
    ])
    expect(recommendations.activeKey.value).toBe('theme')
    expect(recommendations.activeCollection.value.items[0].id).toBe(15)
    expect(recommendations.loading.value).toBe(false)
  })

  it('should leave out the empty collections', async () => {
    fetchDocumentRecommendations.mockResolvedValue({
      collections: [
        makeCollection('theme', 'Temas relacionados', []),
        makeCollection('area', 'Mesma área', [makeItem()]),
      ],
    })

    const recommendations = await mountRecommendations(ref('37'))

    expect(recommendations.collections.value.map((collection) => collection.key)).toEqual(['area'])
    expect(recommendations.activeKey.value).toBe('area')
  })

  it('should have nothing to show when every collection is empty', async () => {
    fetchDocumentRecommendations.mockResolvedValue({
      collections: [makeCollection('theme', 'Temas relacionados', [])],
    })

    const recommendations = await mountRecommendations(ref('37'))

    expect(recommendations.collections.value).toEqual([])
    expect(recommendations.activeCollection.value).toBeNull()
  })

  it('should switch to another collection and ignore an unknown one', async () => {
    fetchDocumentRecommendations.mockResolvedValue({
      collections: [
        makeCollection('theme', 'Temas relacionados', [makeItem()]),
        makeCollection('project', 'Mesmo projeto', [makeItem({ id: 16 })]),
      ],
    })
    const recommendations = await mountRecommendations(ref('37'))

    recommendations.selectCollection('project')
    recommendations.selectCollection('unknown')

    expect(recommendations.activeKey.value).toBe('project')
  })

  it('should stay loading until the backend answers', async () => {
    const pending = deferred()
    fetchDocumentRecommendations.mockReturnValue(pending.promise)

    const recommendations = await mountRecommendations(ref('37'))
    const loadingBefore = recommendations.loading.value
    pending.resolve({ collections: [] })
    await flushPromises()

    expect(loadingBefore).toBe(true)
    expect(recommendations.loading.value).toBe(false)
  })

  it('should report a failure and recover on retry', async () => {
    fetchDocumentRecommendations.mockRejectedValueOnce(new Error('offline'))
    fetchDocumentRecommendations.mockResolvedValueOnce({
      collections: [makeCollection('theme', 'Temas relacionados', [makeItem()])],
    })
    const recommendations = await mountRecommendations(ref('37'))
    const failure = recommendations.error.value

    await recommendations.load()

    expect(failure).toBe('Não foi possível carregar os documentos recomendados.')
    expect(recommendations.error.value).toBe('')
    expect(recommendations.collections.value).toHaveLength(1)
  })

  it('should load again when another document is opened and ignore the older answer', async () => {
    const first = deferred()
    fetchDocumentRecommendations.mockReturnValueOnce(first.promise).mockResolvedValueOnce({
      collections: [makeCollection('project', 'Mesmo projeto', [makeItem({ id: 50 })])],
    })
    const documentId = ref('37')
    const recommendations = await mountRecommendations(documentId)

    documentId.value = '40'
    await flushPromises()
    first.resolve({ collections: [makeCollection('theme', 'Temas', [makeItem({ id: 99 })])] })
    await flushPromises()

    expect(fetchDocumentRecommendations).toHaveBeenLastCalledWith('40')
    expect(recommendations.activeCollection.value.items.map((item) => item.id)).toEqual([50])
  })
})
