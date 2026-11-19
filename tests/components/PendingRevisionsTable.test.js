import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function selectTextOf(element) {
  const range = document.createRange()
  range.selectNodeContents(element)
  window.getSelection().removeAllRanges()
  window.getSelection().addRange(range)
}

function clickTimes(element, detail) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
}

describe('PendingRevisionsTable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    window.getSelection().removeAllRanges()
    document.body.innerHTML = ''
  })

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

  it('should ask to evaluate the revision when its title is clicked', async () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })

    await wrapper.findAll('.cell-title-text')[0].trigger('click')
    vi.runAllTimers()

    expect(wrapper.emitted('evaluate')).toEqual([[REVISIONS[0]]])
  })

  it('should not open the evaluation when another cell of the row is clicked', async () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })
    const row = wrapper.findAll('tbody tr')[0]

    await row.trigger('click')
    await row.find('.cell-code').trigger('click')
    vi.runAllTimers()

    expect(wrapper.emitted('evaluate')).toBeUndefined()
  })

  it('should show the title as the clickable part of the row', () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })
    const row = wrapper.findAll('tbody tr')[0]
    const title = row.find('.cell-title-text')

    expect(title.attributes('role')).toBe('button')
    expect(title.attributes('tabindex')).toBe('0')
    expect(row.attributes('tabindex')).toBeUndefined()
  })

  it('should ask to evaluate the revision on Enter over the focused title', async () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })

    await wrapper.findAll('.cell-title-text')[1].trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('evaluate')).toEqual([[REVISIONS[1]]])
  })

  it('should not open the evaluation when the title is double clicked to be selected', async () => {
    const wrapper = mount(PendingRevisionsTable, {
      props: { revisions: REVISIONS },
      attachTo: document.body,
    })
    const title = wrapper.find('.cell-title-text')

    clickTimes(title.element, 1)
    vi.advanceTimersByTime(100)
    clickTimes(title.element, 2)
    selectTextOf(title.element)
    vi.runAllTimers()

    expect(wrapper.emitted('evaluate')).toBeUndefined()
    wrapper.unmount()
  })

  it('should let the title be selected to copy without opening the evaluation', async () => {
    const wrapper = mount(PendingRevisionsTable, {
      props: { revisions: REVISIONS },
      attachTo: document.body,
    })
    const title = wrapper.find('.cell-title-text')

    selectTextOf(title.element)
    await title.trigger('click')
    vi.runAllTimers()

    expect(window.getSelection().toString().trim()).toBe(REVISIONS[0].title)
    expect(wrapper.emitted('evaluate')).toBeUndefined()
    wrapper.unmount()
  })

  it('should open the evaluation when the selected text is in another row', async () => {
    const wrapper = mount(PendingRevisionsTable, {
      props: { revisions: REVISIONS },
      attachTo: document.body,
    })
    const titles = wrapper.findAll('.cell-title-text')

    selectTextOf(titles[1].element)
    await titles[0].trigger('click')
    vi.runAllTimers()

    expect(wrapper.emitted('evaluate')).toEqual([[REVISIONS[0]]])
    wrapper.unmount()
  })

  it('should not open the evaluation after the table is closed', async () => {
    const wrapper = mount(PendingRevisionsTable, { props: { revisions: REVISIONS } })

    await wrapper.find('.cell-title-text').trigger('click')
    wrapper.unmount()
    vi.runAllTimers()

    expect(wrapper.emitted('evaluate')).toBeUndefined()
  })

  it('should still evaluate with the button while a title is selected', async () => {
    const wrapper = mount(PendingRevisionsTable, {
      props: { revisions: REVISIONS },
      attachTo: document.body,
    })
    const row = wrapper.findAll('tbody tr')[0]

    selectTextOf(row.find('.cell-title-text').element)
    await row.find('button').trigger('click')

    expect(wrapper.emitted('evaluate')).toEqual([[REVISIONS[0]]])
    wrapper.unmount()
  })
})
