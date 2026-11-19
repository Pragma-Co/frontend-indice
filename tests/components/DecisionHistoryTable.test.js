import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DecisionHistoryTable from '../../src/views/manager/components/DecisionHistoryTable.vue'

const REVISION_DECISION = {
  id: 1,
  code: 'AK-2100-PES-MEM-0005',
  title: 'Memorial de pesos',
  revision: 'REV01',
  requestType: 'REVISION',
  decision: 'REJECTED',
  requesterName: 'Caio Bertoni',
  userName: 'Marina Duarte',
  decidedAt: '2026-09-26T14:32:00',
}

const ACCESS_DECISION = {
  ...REVISION_DECISION,
  id: 2,
  title: '',
  revision: null,
  requestType: 'ACCESS',
  decision: 'APPROVED',
}

function rows(decisions) {
  const wrapper = mount(DecisionHistoryTable, { props: { decisions } })
  return { wrapper, rows: wrapper.findAll('tbody tr') }
}

describe('DecisionHistoryTable', () => {
  it('should label every column of the record', () => {
    const { wrapper } = rows([REVISION_DECISION])

    expect(wrapper.findAll('th').map((header) => header.text())).toEqual([
      'Código do documento',
      'Título do documento',
      'Revisão',
      'Tipo de solicitação',
      'Solicitante',
      'Decisão',
      'Responsável & Data',
    ])
  })

  it('should show the document, revision, type, decision, user and moment', () => {
    const [row] = rows([REVISION_DECISION]).rows

    expect(row.findAll('td').map((cell) => cell.text())).toEqual([
      'AK-2100-PES-MEM-0005',
      'Memorial de pesos',
      'REV01',
      'Revisão técnica',
      'Caio Bertoni',
      'Reprovada',
      'Marina Duarte26/09/2026 • 14:32',
    ])
  })

  it('should tell approved from rejected decisions visually and by text', () => {
    const [revision, access] = rows([REVISION_DECISION, ACCESS_DECISION]).rows

    expect(revision.find('.decision-badge').classes()).toContain('is-rejected')
    expect(access.find('.decision-badge').classes()).toContain('is-approved')
    expect(access.find('.decision-badge').text()).toBe('Deferido')
  })

  it('should show a dash for the revision of an access request', () => {
    const [row] = rows([ACCESS_DECISION]).rows

    expect(row.findAll('td')[2].text()).toBe('—')
    expect(row.text()).toContain('Acesso restrito')
  })

  it('should open the details of a record from its document code', async () => {
    const { wrapper, rows: lines } = rows([REVISION_DECISION, ACCESS_DECISION])

    await lines[1].find('button.code-link').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[ACCESS_DECISION]])
    expect(lines[0].find('button').attributes('aria-label')).toBe(
      'Ver motivo da decisão sobre AK-2100-PES-MEM-0005',
    )
  })

  it('should be read only, with the code as the only control', () => {
    const { wrapper } = rows([REVISION_DECISION, ACCESS_DECISION])

    expect(wrapper.findAll('button, a, input')).toHaveLength(2)
    expect(wrapper.findAll('button.code-link')).toHaveLength(2)
  })

  it('should scroll sideways inside its own area on narrow screens', () => {
    const { wrapper } = rows([REVISION_DECISION])

    expect(wrapper.element.classList.contains('table-scroll')).toBe(true)
    expect(wrapper.find('.table-scroll > table.panel-table').exists()).toBe(true)
  })
})
