import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccessRequestsTable from '../../src/views/manager/components/AccessRequestsTable.vue'

const REQUESTS = [
  {
    id: 7,
    code: 'AK-3100-HID-MEM-0018',
    title: 'Memorial de dimensionamento do sistema de drenagem principal',
    discipline: 'Hidráulica',
    requesterName: 'Caio Bertoni',
    requesterArea: 'EST',
    requestedAt: '2026-09-25T17:46:00',
    status: 'PENDING',
  },
]

describe('AccessRequestsTable', () => {
  it('should show the columns of the access requests', () => {
    const wrapper = mount(AccessRequestsTable, { props: { requests: REQUESTS } })

    const headers = wrapper.findAll('th').map((header) => header.text())

    expect(headers).toEqual([
      'Código do documento',
      'Título do documento',
      'Disciplina',
      'Solicitante',
      'Data do pedido',
      'Status',
    ])
  })

  it('should show who asked for access to which document and when', () => {
    const wrapper = mount(AccessRequestsTable, { props: { requests: REQUESTS } })

    const cells = wrapper.findAll('tbody td').map((cell) => cell.text().replace(/\s+/g, ' '))

    expect(cells).toEqual([
      'AK-3100-HID-MEM-0018',
      'Memorial de dimensionamento do sistema de drenagem principal',
      'Hidráulica',
      'Caio BertoniEST',
      '25/09/2026 • 17:46',
      'Pendente',
    ])
  })
})
