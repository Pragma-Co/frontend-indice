import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsFilterPanel from '@/views/document/components/ResultsFilterPanel.vue'
import { emptyFilters } from '@/utils/resultFilters.js'

const OPTIONS = {
  types: [
    { code: 'DWG', name: 'Desenho Técnico' },
    { code: 'MEM', name: 'Memorial' },
  ],
  areas: [{ acronym: 'EST', name: 'Engenharia Estrutural' }],
  disciplines: [
    { code: 'EST', name: 'Estruturas' },
    { code: 'MAT', name: 'Materiais e Processos' },
  ],
  statuses: [
    { value: 'PENDING', label: 'Em revisão' },
    { value: 'APPROVED', label: 'Vigente' },
  ],
  dates: [{ value: 'last_month', label: 'Último mês' }],
}

function mountPanel(filters = emptyFilters()) {
  return mount(ResultsFilterPanel, { props: { filters, options: OPTIONS } })
}

function checkbox(wrapper, name, value) {
  return wrapper.find(`input[name="${name}"][value="${value}"]`)
}

describe('ResultsFilterPanel', () => {
  it('should render one group of options for type, area, discipline and status', () => {
    const wrapper = mountPanel()

    const legends = wrapper.findAll('legend').map((legend) => legend.text())
    expect(legends).toEqual([
      'Tipo de documento',
      'Área',
      'Disciplina',
      'Status',
      'Data de emissão',
    ])
    expect(wrapper.text()).toContain('Desenho Técnico')
    expect(wrapper.text()).toContain('Engenharia Estrutural')
    expect(wrapper.text()).toContain('Materiais e Processos')
    expect(wrapper.text()).toContain('Em revisão')
  })

  it('should start with the filters that came from the URL already checked', () => {
    const wrapper = mountPanel({
      ...emptyFilters(),
      tipo: ['DWG'],
      status: ['PENDING'],
      data: 'last_month',
    })

    expect(checkbox(wrapper, 'tipo', 'DWG').element.checked).toBe(true)
    expect(checkbox(wrapper, 'tipo', 'MEM').element.checked).toBe(false)
    expect(checkbox(wrapper, 'status', 'PENDING').element.checked).toBe(true)
    expect(wrapper.find('select[name="data"]').element.value).toBe('last_month')
  })

  it('should emit the chosen filters only when the user applies them', async () => {
    const wrapper = mountPanel({ ...emptyFilters(), q: 'tubulação' })

    await checkbox(wrapper, 'tipo', 'DWG').setValue(true)
    await checkbox(wrapper, 'discipline', 'MAT').setValue(true)
    await checkbox(wrapper, 'status', 'APPROVED').setValue(true)
    expect(wrapper.emitted('apply')).toBeUndefined()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('apply')).toHaveLength(1)
    expect(wrapper.emitted('apply')[0][0]).toMatchObject({
      q: 'tubulação',
      tipo: ['DWG'],
      discipline: ['MAT'],
      status: ['APPROVED'],
    })
  })

  it('should drop the date range when a preset is chosen and the preset when a date is typed', async () => {
    const wrapper = mountPanel({ ...emptyFilters(), dateFrom: '2026-01-01', dateTo: '2026-02-01' })

    await wrapper.find('select[name="data"]').setValue('last_month')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('apply')[0][0]).toMatchObject({
      data: 'last_month',
      dateFrom: '',
      dateTo: '',
    })

    await wrapper.find('input[name="date_from"]').setValue('2026-03-01')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('apply')[1][0]).toMatchObject({ data: '', dateFrom: '2026-03-01' })
  })

  it('should uncheck everything and ask for a clean search when cleared', async () => {
    const wrapper = mountPanel({ ...emptyFilters(), tipo: ['DWG'], status: ['PENDING'] })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Limpar')
      .trigger('click')

    expect(wrapper.emitted('clear')).toHaveLength(1)
    expect(checkbox(wrapper, 'tipo', 'DWG').element.checked).toBe(false)
    expect(checkbox(wrapper, 'status', 'PENDING').element.checked).toBe(false)
  })

  it('should follow the URL when the applied filters change from outside', async () => {
    const wrapper = mountPanel({ ...emptyFilters(), tipo: ['DWG'] })

    await wrapper.setProps({ filters: { ...emptyFilters(), tipo: ['MEM'] } })

    expect(checkbox(wrapper, 'tipo', 'DWG').element.checked).toBe(false)
    expect(checkbox(wrapper, 'tipo', 'MEM').element.checked).toBe(true)
  })

  it('should show how many refinements are about to be applied', async () => {
    const wrapper = mountPanel()

    await checkbox(wrapper, 'tipo', 'DWG').setValue(true)
    await checkbox(wrapper, 'area', 'EST').setValue(true)

    expect(wrapper.text()).toContain('Aplicar Filtros (2)')
  })
})
