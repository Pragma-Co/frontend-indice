import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
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
    ...overrides,
  }
}

describe('DocumentsTable', () => {
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
})
