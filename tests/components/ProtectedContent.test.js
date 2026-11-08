import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProtectedContent from '@/components/common/ProtectedContent.vue'
import { api } from '@/api/client'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationStore } from '@/stores/notificationStore'

vi.mock('@/api/client', () => ({ api: { post: vi.fn().mockResolvedValue({}) } }))

describe('ProtectedContent', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.useRealTimers())

  it('displays the current viewer on a repeated watermark', async () => {
    const wrapper = mount(ProtectedContent, {
      props: { user: { id: 15, name: 'Ana Silva', email: 'ana@example.com' } },
      slots: { default: '<p>Conteúdo</p>' },
    })

    expect(wrapper.findAll('.protected-watermark span')).toHaveLength(12)
    expect(wrapper.find('.protected-watermark').text()).toContain('Ana Silva · ana@example.com')
    await wrapper.setProps({ user: { id: 16, name: 'João', email: 'joao@example.com' } })
    expect(wrapper.find('.protected-watermark').text()).toContain('João · joao@example.com')
    expect(wrapper.find('.protected-watermark').text()).not.toContain('ID 16')
  })

  it('distributes watermarks at random positions and keeps them stable on user updates', async () => {
    const random = vi.spyOn(Math, 'random')
    random.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.75)
    const wrapper = mount(ProtectedContent, {
      props: { user: { id: 15, name: 'Ana', email: 'ana@example.com' } },
    })
    const positions = wrapper
      .findAll('.protected-watermark span')
      .map((mark) => mark.attributes('style'))

    expect(new Set(positions).size).toBeGreaterThan(1)
    expect(random).toHaveBeenCalledTimes(24)
    await wrapper.setProps({ user: { id: 15, name: 'Ana Silva', email: 'ana@example.com' } })
    expect(
      wrapper.findAll('.protected-watermark span').map((mark) => mark.attributes('style')),
    ).toEqual(positions)
    random.mockRestore()
  })

  it('blocks copying, selection, dragging, context menu and copy shortcuts only inside the content', () => {
    const wrapper = mount(ProtectedContent, {
      props: { user: { id: 15, name: 'Ana', email: 'ana@example.com' } },
      slots: { default: '<p>Conteúdo</p>' },
      attachTo: document.body,
    })
    const content = wrapper.find('p').element

    for (const type of ['copy', 'cut', 'selectstart', 'dragstart', 'contextmenu']) {
      const event = new Event(type, { bubbles: true, cancelable: true })
      content.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }

    for (const key of ['a', 'c', 'x']) {
      const event = new KeyboardEvent('keydown', {
        key,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
      content.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }

    const scrollKey = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    })
    content.dispatchEvent(scrollKey)
    expect(scrollKey.defaultPrevented).toBe(false)
    wrapper.unmount()
  })

  it('logs capture attempts, hides the content on focus loss and blocks printing shortcuts', async () => {
    vi.useFakeTimers()
    api.post.mockClear()
    const wrapper = mount(ProtectedContent, {
      props: { user: { id: 15, name: 'Ana', email: 'ana@example.com' }, documentId: 7, fileId: 3 },
      slots: { default: '<p>Conteúdo</p>' },
      attachTo: document.body,
    })

    const print = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, cancelable: true })
    window.dispatchEvent(print)
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'PrintScreen' }))
    window.dispatchEvent(new Event('blur'))
    await wrapper.vm.$nextTick()

    expect(print.defaultPrevented).toBe(true)
    expect(api.post.mock.calls.map(([, body]) => body.event)).toEqual([
      'PRINT_ATTEMPT',
      'PRINT_SCREEN_KEY',
    ])
    expect(useNotificationStore().items[0].message).toContain('Ação proibida')
    vi.advanceTimersByTime(700)
    expect(api.post.mock.calls.map(([, body]) => body.event)).toContain('FOCUS_LOST')
    expect(api.post).toHaveBeenCalledWith('/documents/7/security-events', {
      event: 'PRINT_ATTEMPT',
      file_id: 3,
      detail: undefined,
    })
    expect(wrapper.classes()).toContain('protected-content--obscured')
    window.dispatchEvent(new Event('focus'))
    await wrapper.vm.$nextTick()
    expect(wrapper.classes()).not.toContain('protected-content--obscured')
    wrapper.unmount()
  })
})
