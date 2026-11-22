import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RecentSearchesPopover from '@/components/common/RecentSearchesPopover.vue'

const TERMS = [
  'Normas de estruturas metálicas',
  'MIL-C-5541',
  'Relatório de cargas',
  'Empenagem vertical',
]

function mockViewport({ compact }) {
  const listeners = new Set()
  const mediaQueryList = {
    matches: compact,
    addEventListener: vi.fn((_, listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_, listener) => listeners.delete(listener)),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQueryList),
  )
  return {
    mediaQueryList,
    resize(nextCompact) {
      mediaQueryList.matches = nextCompact
      listeners.forEach((listener) => listener({ matches: nextCompact }))
    },
  }
}

function mountPopover(props = {}) {
  return mount(RecentSearchesPopover, {
    props: { id: 'recent', terms: TERMS, ...props },
  })
}

describe('RecentSearchesPopover', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should show the title, the clear action and every term in order', () => {
    const wrapper = mountPopover()

    expect(wrapper.find('.recent-searches-title').text()).toBe('Buscas recentes')
    expect(wrapper.find('.recent-searches-clear').text()).toBe('Limpar histórico')
    expect(wrapper.findAll('.recent-search-text').map((item) => item.text())).toEqual(TERMS)
  })

  it('should expose the terms as an accessible listbox', () => {
    const wrapper = mountPopover({ activeIndex: 1 })

    const listbox = wrapper.find('[role="listbox"]')
    expect(listbox.attributes('id')).toBe('recent')
    expect(listbox.attributes('aria-labelledby')).toBe('recent-title')
    const options = wrapper.findAll('[role="option"]')
    expect(options[1].attributes('id')).toBe('recent-option-1')
    expect(options[1].attributes('aria-selected')).toBe('true')
    expect(options[0].attributes('aria-selected')).toBe('false')
  })

  it('should highlight the active term', () => {
    const wrapper = mountPopover({ activeIndex: 1 })

    const items = wrapper.findAll('.recent-search')
    expect(items[1].classes()).toContain('active')
    expect(items[0].classes()).not.toContain('active')
  })

  it('should emit the term when it is clicked', async () => {
    const wrapper = mountPopover()

    await wrapper.findAll('.recent-search-term')[1].trigger('click')

    expect(wrapper.emitted('select')).toEqual([['MIL-C-5541']])
  })

  it('should emit the term to remove with an accessible label', async () => {
    const wrapper = mountPopover()

    const remove = wrapper.findAll('.recent-search-remove')[1]
    expect(remove.attributes('aria-label')).toBe('Remover MIL-C-5541 do histórico')
    await remove.trigger('click')

    expect(wrapper.emitted('remove')).toEqual([['MIL-C-5541']])
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('should emit clear when the history is cleared', async () => {
    const wrapper = mountPopover()

    await wrapper.find('.recent-searches-clear').trigger('click')

    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('should emit the hovered index', async () => {
    const wrapper = mountPopover()

    await wrapper.findAll('.recent-search')[2].trigger('mouseenter')

    expect(wrapper.emitted('activate')).toEqual([[2]])
  })

  it('should keep the input focused when the popover is pressed', async () => {
    const wrapper = mountPopover()

    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    wrapper.find('.recent-search-term').element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('should use the regular layout on wide screens', () => {
    mockViewport({ compact: false })

    const wrapper = mountPopover()

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 640px)')
    expect(wrapper.find('.recent-searches').classes()).not.toContain('is-compact')
  })

  it('should switch to the touch friendly layout on small screens', () => {
    mockViewport({ compact: true })

    const wrapper = mountPopover()

    expect(wrapper.find('.recent-searches').classes()).toContain('is-compact')
  })

  it('should follow the viewport when it is resized', async () => {
    const viewport = mockViewport({ compact: false })
    const wrapper = mountPopover()

    viewport.resize(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.recent-searches').classes()).toContain('is-compact')

    viewport.resize(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.recent-searches').classes()).not.toContain('is-compact')
  })

  it('should stop listening to the viewport when unmounted', () => {
    const viewport = mockViewport({ compact: false })
    const wrapper = mountPopover()

    wrapper.unmount()

    expect(viewport.mediaQueryList.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })
})
