import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PendingRevisionsTable from '../../src/views/manager/components/PendingRevisionsTable.vue'

const REVISIONS = [
  {
    id: 91,
    code: 'AK-3100-EST-ESP-0001',
    title: 'Relatório de verificação estrutural do pilone sob carga limite',
    discipline: 'Estruturas',
    fromRevision: 'REV01',
    toRevision: 'REV02',
    authorName: 'Marina Duarte',
    createdAt: '2026-09-26T14:32:00',
    status: 'PENDING',
  },
  {
    id: 92,
    code: 'AK-3100-ELE-DET-0042',
    title: 'Detalhamento da malha de aterramento',
    discipline: 'Elétrica',
    fromRevision: 'REV00',
    toRevision: 'REV01',
    authorName: 'Camila Freire',
    createdAt: '2026-09-25T17:46:00',
    status: 'PENDING',
  },
]

describe('PendingRevisionsTable', () => {
  it('should show the columns of the pending revisions', () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })

    const headers = wrapper.findAll('th').map((header) => header.text())

    expect(headers).toEqual([
      'Código do documento',
      'Título do documento',
      'Disciplina',
      'Transição',
      'Autor & Data',
      'Status',
      'Ações',
    ])
  })

  it('should show the data of each pending revision', () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })

    const cells = wrapper
      .findAll('tbody tr')[0]
      .findAll('td')
      .map((cell) => cell.text().replace(/\s+/g, ' '))

    expect(cells).toEqual([
      'AK-3100-EST-ESP-0001',
      'Relatório de verificação estrutural do pilone sob carga limite',
      'Estruturas',
      'REV01 → REV02',
      'Marina Duarte26/09/2026 • 14:32',
      'Pendente',
      'Avaliar Revisão',
    ])
  })

  it('should offer the evaluation button on every row', () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })

    const buttons = wrapper.findAll('tbody button')

    expect(buttons).toHaveLength(2)
    expect(buttons.every((button) => button.text() === 'Avaliar Revisão')).toBe(true)
  })

  it('should ask to evaluate the revision of the clicked row', async () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })

    await wrapper.findAll('tbody button')[1].trigger('click')

    expect(wrapper.emitted('evaluate')).toEqual([[REVISIONS[1]]])
  })

  it('should ask to evaluate the revision when its row is clicked', async () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })

    await wrapper.findAll('tbody tr')[0].trigger('click')

    expect(wrapper.emitted('evaluate')).toEqual([[REVISIONS[0]]])
  })

  it('should ask to evaluate the focused row on Enter', async () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })
    const row = wrapper.findAll('tbody tr')[1]

    await row.trigger('keydown', { key: 'Enter' })

    expect(row.attributes('tabindex')).toBe('0')
    expect(wrapper.emitted('evaluate')).toEqual([[REVISIONS[1]]])
  })

  it('should ask only once when the button inside the row is used', async () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })
    const button = wrapper.findAll('tbody button')[0]

    await button.trigger('click')
    await button.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('evaluate')).toHaveLength(1)
  })
})
