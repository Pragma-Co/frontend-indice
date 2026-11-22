import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/authStore.js'
import DocumentsTable from '@/views/document/components/DocumentsTable.vue'

function makeDocument(overrides = {}) {
  return {
    id: 33,
    code: 'AK-2100-MAT-ESP-0004',
    title: 'Card 31 live',
    type: 'Especificação Técnica',
    discipline: { code: 'MAT', name: 'Materiais e Processos' },
    revision: 'REV01',
    status: 'PENDING',
    updatedAt: '2026-09-18T21:30:04+00:00',
    updatedBy: 'sistema',
    action: 'view-details',
    areas: [{ acronym: 'EST', name: 'Engenharia Estrutural' }],
    ...overrides,
  }
}

describe('DocumentsTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().currentUser = { id: 12, name: 'Beatriz Canuto', areaAcronym: 'EST' }
  })

  it('should render the essential columns of a result', () => {
    const wrapper = mount(DocumentsTable, { props: { documents: [makeDocument()] } })

    const headers = wrapper.findAll('th').map((header) => header.text())
    expect(headers).toEqual(
      expect.arrayContaining([
        'Código do documento',
        'Título',
        'Tipo / Disciplina',
        'Revisão atual',
        'Status',
        'Última atualização',
      ]),
    )
    const row = wrapper.find('tbody tr').text()
    expect(row).toContain('AK-2100-MAT-ESP-0004')
    expect(row).toContain('Card 31 live')
    expect(row).toContain('REV01')
    expect(row).toContain('Em revisão')
  })

  it('should show the discipline under the document type', () => {
    const wrapper = mount(DocumentsTable, { props: { documents: [makeDocument()] } })

    const cell = wrapper.find('.cell-type')
    expect(cell.text()).toContain('Especificação Técnica')
    expect(cell.find('.cell-discipline').text()).toBe('Materiais e Processos')
  })

  it('should show only the type when the document has no discipline', () => {
    const wrapper = mount(DocumentsTable, {
      props: { documents: [makeDocument({ discipline: null })] },
    })

    expect(wrapper.find('.cell-discipline').exists()).toBe(false)
  })

  it('should open the details when the title is clicked', async () => {
    const wrapper = mount(DocumentsTable, { props: { documents: [makeDocument()] } })

    await wrapper.find('.cell-title-text').trigger('click')

    expect(wrapper.emitted('action')).toEqual([
      [{ document: expect.objectContaining({ id: 33 }), action: 'view-details' }],
    ])
  })

  it('should not offer the more-actions menu', () => {
    const wrapper = mount(DocumentsTable, { props: { documents: [makeDocument()] } })

    expect(wrapper.find('.menu-trigger').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Mais ações"]').exists()).toBe(false)
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('should start a new revision without opening the details when the document is in force', async () => {
    const wrapper = mount(DocumentsTable, {
      props: { documents: [makeDocument({ status: 'APPROVED' })] },
    })
    const button = wrapper.find('.action-button')

    await button.trigger('click')

    expect(button.text()).toBe('Nova Revisão')
    expect(button.attributes('aria-disabled')).toBeUndefined()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
    expect(wrapper.emitted('action')).toEqual([
      [{ document: expect.objectContaining({ id: 33 }), action: 'new-revision' }],
    ])
  })

  it('should disable the new revision button and explain why when the document is under review', async () => {
    const wrapper = mount(DocumentsTable, {
      props: { documents: [makeDocument({ status: 'PENDING' })] },
    })
    const button = wrapper.find('.action-button')
    const tooltip = wrapper.find('[role="tooltip"]')

    await button.trigger('click')

    expect(button.text()).toBe('Nova Revisão')
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(button.classes()).toContain('action-button-disabled')
    expect(tooltip.text()).toContain('revisão em andamento')
    expect(button.attributes('aria-describedby')).toBe(tooltip.attributes('id'))
    expect(wrapper.emitted('action')).toBeUndefined()
  })

  it('should disable the new revision button for a document of another area', async () => {
    useAuthStore().currentUser = { id: 12, name: 'Beatriz Canuto', areaAcronym: 'QUA' }
    const wrapper = mount(DocumentsTable, {
      props: { documents: [makeDocument({ status: 'APPROVED' })] },
    })

    const button = wrapper.find('.action-button')
    await button.trigger('click')

    expect(button.attributes('aria-disabled')).toBe('true')
    expect(wrapper.find('.action-tooltip').text()).toBe(
      'Somente colaboradores das áreas deste documento podem criar uma revisão.',
    )
    expect(wrapper.emitted('action')).toBeUndefined()
  })
})
