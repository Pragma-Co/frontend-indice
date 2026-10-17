import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ResultsSummary from '@/views/document/components/ResultsSummary.vue'

vi.mock('@/api/documents.js', () => ({
  fetchResultsSummary: vi.fn(),
}))

import { fetchResultsSummary } from '@/api/documents.js'

async function mountSummary(query = { q: 'tubulação' }) {
  const wrapper = mount(ResultsSummary, { props: { query } })
  await flushPromises()
  return wrapper
}

describe('ResultsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchResultsSummary.mockResolvedValue({ summary: 'Resumo de teste' })
  })

  it('should show the loading indicator while the summary is requested', async () => {
    fetchResultsSummary.mockReturnValue(new Promise(() => {}))

    const wrapper = mount(ResultsSummary, { props: { query: { q: 'a' } } })
    await flushPromises()

    expect(wrapper.text()).toContain('Resumo gerado por IA')
    expect(wrapper.find('[role="status"]').text()).toContain('Gerando resumo')
    expect(wrapper.find('.summary-toggle').exists()).toBe(false)
  })

  it('should request the summary with the query and an abort signal', async () => {
    await mountSummary({ q: 'tubulação', tipo: 'DWG' })

    expect(fetchResultsSummary).toHaveBeenCalledWith(
      { q: 'tubulação', tipo: 'DWG' },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('should render the summary text and hide the loading indicator', async () => {
    const wrapper = await mountSummary()

    expect(wrapper.find('.summary-body').text()).toBe('Resumo de teste')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('should accept the "resumo" key as an alternative', async () => {
    fetchResultsSummary.mockResolvedValue({ resumo: 'Texto alternativo' })

    const wrapper = await mountSummary()

    expect(wrapper.find('.summary-body').text()).toBe('Texto alternativo')
  })

  it('should render paragraphs, bold text and lists as safe elements', async () => {
    fetchResultsSummary.mockResolvedValue({
      summary: 'Primeiro **destaque** aqui.\n\nSegundo parágrafo.\n\n- item um\n- item **dois**',
    })

    const wrapper = await mountSummary()

    expect(wrapper.findAll('.summary-body p')).toHaveLength(2)
    expect(wrapper.find('.summary-body p strong').text()).toBe('destaque')
    const items = wrapper.findAll('.summary-body li')
    expect(items.map((item) => item.text())).toEqual(['item um', 'item dois'])
    expect(items[1].find('strong').text()).toBe('dois')
  })

  it('should not render HTML coming from the summary', async () => {
    fetchResultsSummary.mockResolvedValue({ summary: '<img src=x onerror="alert(1)"> texto' })

    const wrapper = await mountSummary()

    expect(wrapper.find('.summary-body img').exists()).toBe(false)
    expect(wrapper.find('.summary-body').text()).toContain('<img src=x')
  })

  it('should toggle between collapsed and expanded with "Ver mais" and "Ver menos"', async () => {
    const wrapper = await mountSummary()
    const toggle = wrapper.find('.summary-toggle')

    expect(toggle.text()).toBe('Ver mais')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.summary-body').classes()).toContain('clamped')

    await toggle.trigger('click')

    expect(toggle.text()).toBe('Ver menos')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.summary-body').classes()).not.toContain('clamped')

    await toggle.trigger('click')

    expect(toggle.text()).toBe('Ver mais')
    expect(wrapper.find('.summary-body').classes()).toContain('clamped')
  })

  it('should show an error message when the request fails', async () => {
    fetchResultsSummary.mockRejectedValue(new Error('boom'))

    const wrapper = await mountSummary()

    expect(wrapper.find('.summary-error').text()).toBe('Não foi possível gerar o resumo no momento.')
    expect(wrapper.find('.summary-body').exists()).toBe(false)
    expect(wrapper.find('.summary-toggle').exists()).toBe(false)
  })

  it('should request again and collapse when the filters change', async () => {
    const wrapper = await mountSummary({ q: 'a' })
    await wrapper.find('.summary-toggle').trigger('click')
    fetchResultsSummary.mockResolvedValue({ summary: 'Novo resumo' })

    await wrapper.setProps({ query: { q: 'b' } })
    await flushPromises()

    expect(fetchResultsSummary).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.summary-body').text()).toBe('Novo resumo')
    expect(wrapper.find('.summary-body').classes()).toContain('clamped')
  })

  it('should not request again when only the pagination changes', async () => {
    const wrapper = await mountSummary({ q: 'a', page: 1, page_size: 20 })

    await wrapper.setProps({ query: { q: 'a', page: 2, page_size: 50 } })
    await flushPromises()

    expect(fetchResultsSummary).toHaveBeenCalledTimes(1)
  })

  it('should abort the previous request and ignore its result when the query changes', async () => {
    let firstSignal
    let resolveFirst
    fetchResultsSummary.mockImplementationOnce((_query, { signal }) => {
      firstSignal = signal
      return new Promise((resolve) => {
        resolveFirst = resolve
      })
    })

    const wrapper = mount(ResultsSummary, { props: { query: { q: 'a' } } })
    await flushPromises()
    fetchResultsSummary.mockResolvedValue({ summary: 'Resumo B' })

    await wrapper.setProps({ query: { q: 'b' } })
    await flushPromises()
    resolveFirst({ summary: 'Resumo A' })
    await flushPromises()

    expect(firstSignal.aborted).toBe(true)
    expect(wrapper.find('.summary-body').text()).toBe('Resumo B')
  })
})
