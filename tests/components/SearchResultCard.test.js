import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/authStore.js'
import SearchResultCard from '@/views/document/components/SearchResultCard.vue'

function makeDocument(overrides = {}) {
  return {
    id: 7,
    code: 'AK-3100-EST-ESP-0001',
    title: 'Relatório de verificação estrutural',
    type: 'Especificação Técnica',
    discipline: { code: 'EST', name: 'Estruturas' },
    areas: [{ acronym: 'EST', name: 'Engenharia Estrutural' }],
    revision: 'REV02',
    status: 'APPROVED',
    createdAt: '2026-09-10T10:00:00+00:00',
    createdBy: 'Caio Bertoni',
    updatedAt: '2026-09-18T21:30:04+00:00',
    updatedBy: 'Marina Duarte',
    tags: [],
    matchedTags: [],
    highlights: null,
    ...overrides,
  }
}

function mountCard(document = makeDocument()) {
  return mount(SearchResultCard, { props: { document } })
}

describe('SearchResultCard new revision', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().currentUser = { id: 12, name: 'Caio Bertoni', areaAcronym: 'EST' }
  })

  it('should start a new revision of a document of the user area', async () => {
    const wrapper = mountCard()

    await wrapper.find('.result-action').trigger('click')

    expect(wrapper.find('.result-action').attributes('aria-disabled')).toBeUndefined()
    expect(wrapper.emitted('action')).toEqual([
      [{ document: makeDocument(), action: 'new-revision' }],
    ])
  })

  it('should block a new revision of a document of another area and explain why', async () => {
    useAuthStore().currentUser = { id: 12, name: 'Caio Bertoni', areaAcronym: 'QUA' }
    const wrapper = mountCard()
    const button = wrapper.find('.result-action')

    await button.trigger('click')

    expect(button.attributes('aria-disabled')).toBe('true')
    expect(button.attributes('title')).toBe(
      'Somente colaboradores das áreas deste documento podem criar uma revisão.',
    )
    expect(wrapper.emitted('action')).toBeUndefined()
  })

  it('should keep explaining a revision under review for a document of the user area', () => {
    const button = mountCard(makeDocument({ status: 'PENDING' })).find('.result-action')

    expect(button.attributes('title')).toContain('revisão em andamento')
  })
})
