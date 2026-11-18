import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DecisionHistoryFilters from '../../src/views/manager/components/DecisionHistoryFilters.vue'

const NO_FILTERS = { requestType: '', decision: '', dateFrom: '', dateTo: '' }
let wrapper

function mountFilters(props = {}) {
  wrapper = mount(DecisionHistoryFilters, {
    props: { filters: NO_FILTERS, ...props },
    attachTo: document.body,
  })
  return wrapper
}

function trigger(label) {
  return wrapper.findAll('.filter-trigger').find((button) => button.text().startsWith(label))
}

function options() {
  return wrapper.findAll('[role="option"]').map((option) => option.text())
}

describe('DecisionHistoryFilters', () => {
  afterEach(() => wrapper.unmount())

  it('should offer the period, type and decision as pill buttons', () => {
    mountFilters()

    expect(wrapper.findAll('.filter-trigger').map((button) => button.text())).toEqual([
      'PeríodoQualquer data',
      'Tipo',
      'Decisão',
    ])
  })

  it('should list the request types and report the chosen one', async () => {
    mountFilters()

    await trigger('Tipo').trigger('click')
    expect(options()).toEqual(['Todos os tipos', 'Revisão técnica', 'Acesso restrito'])
    await wrapper.findAll('[role="option"]')[2].trigger('click')

    expect(wrapper.emitted('change')).toEqual([['requestType', 'ACCESS']])
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('should list the decisions and report the chosen one', async () => {
    mountFilters()

    await trigger('Decisão').trigger('click')
    expect(options()).toEqual([
      'Todas as decisões',
      'Aprovada / Deferida',
      'Reprovada / Indeferida',
    ])
    await wrapper.findAll('[role="option"]')[2].trigger('click')

    expect(wrapper.emitted('change')).toEqual([['decision', 'REJECTED']])
  })

  it('should show the chosen values on the buttons and mark the selected option', async () => {
    mountFilters({ filters: { ...NO_FILTERS, requestType: 'REVISION', dateFrom: '2026-09-05' } })

    await trigger('Tipo').trigger('click')

    expect(trigger('Tipo').text()).toBe('TipoRevisão técnica')
    expect(trigger('Período').text()).toBe('PeríodoA partir de 05/09/2026')
    expect(wrapper.find('[role="option"].selected').text()).toBe('Revisão técnica')
  })

  it('should open one menu at a time and close it on Escape or an outside click', async () => {
    mountFilters()

    await trigger('Tipo').trigger('click')
    await trigger('Decisão').trigger('click')
    const onlyDecision = wrapper
      .findAll('[role="listbox"]')
      .map((menu) => menu.attributes('aria-label'))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    const afterEscape = wrapper.find('[role="listbox"]').exists()
    await trigger('Tipo').trigger('click')
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(onlyDecision).toEqual(['Decisões'])
    expect(afterEscape).toBe(false)
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('should report a picked period and bound each date by the other', async () => {
    mountFilters({ filters: { ...NO_FILTERS, dateFrom: '2026-09-05' } })

    await trigger('Período').trigger('click')
    await wrapper.find('input[name="date_to"]').setValue('2026-09-20')

    expect(wrapper.emitted('change')).toEqual([['dateTo', '2026-09-20']])
    expect(wrapper.find('input[name="date_to"]').attributes('min')).toBe('2026-09-05')
    expect(wrapper.find('input[name="date_from"]').attributes('max')).toBeUndefined()
  })

  it('should close the period menu when it is applied', async () => {
    mountFilters()

    await trigger('Período').trigger('click')
    await wrapper.find('.date-apply').trigger('click')

    expect(wrapper.find('.date-menu').exists()).toBe(false)
  })

  it('should only offer to clear the filters while one is active', async () => {
    mountFilters()
    const idle = wrapper.find('.clear-filters').exists()
    wrapper.unmount()
    mountFilters({ hasFilters: true })

    await wrapper.find('.clear-filters').trigger('click')

    expect(idle).toBe(false)
    expect(wrapper.find('.clear-filters').text()).toBe('Limpar filtros')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('should warn when the period ends before it starts', () => {
    mountFilters({ periodInvalid: true })

    expect(wrapper.find('[role="alert"]').text()).toBe(
      'A data final não pode ser anterior à data inicial.',
    )
  })

  it('should not submit the page', () => {
    mountFilters()

    const prevented = !wrapper
      .find('form')
      .element.dispatchEvent(new Event('submit', { cancelable: true }))

    expect(prevented).toBe(true)
  })
})
