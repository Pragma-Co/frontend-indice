import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProtectedContent from '@/components/common/ProtectedContent.vue'

describe('ProtectedContent', () => {
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
  })
})
