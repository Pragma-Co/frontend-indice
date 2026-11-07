import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import NotificationsDropdown from '../../src/components/layout/NotificationsDropdown.vue'
import * as notificationsAPI from '../../src/api/notifications'

const mounted = []

const mockNotifications = [
  {
    title: 'Documento 1 atualizado',
    document: { id: 1, name: 'AK-0001' },
    date: new Date(Date.now() - 5 * 60000).toISOString(),
    is_new: true,
    type: 1,
  },
  {
    title: 'Acesso aprovado',
    document: { id: 2, name: 'AK-0002' },
    date: new Date(Date.now() - 65 * 60000).toISOString(),
    is_new: true,
    type: 2,
  },
  {
    title: 'Acesso recusado',
    document: { id: 3, name: 'AK-0003' },
    date: new Date(Date.now() - 125 * 60000).toISOString(),
    is_new: false,
    type: 3,
  },
]

function mountNotificationsDropdown() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/documents/:documentId', component: { template: '<div />' } },
    ],
  })

  const wrapper = mount(NotificationsDropdown, {
    global: {
      plugins: [router],
      stubs: {
        Dropdown: false,
      },
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

describe('NotificationsDropdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(notificationsAPI, 'fetchNotifications').mockResolvedValue(
      structuredClone(mockNotifications),
    )
    vi.spyOn(notificationsAPI, 'markAllNotificationsAsRead').mockResolvedValue(null)
    vi.spyOn(notificationsAPI, 'markNotificationAsRead').mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('should load notifications on mount', async () => {
    mountNotificationsDropdown()
    await flushPromises()

    expect(notificationsAPI.fetchNotifications).toHaveBeenCalled()
  })

  it('should display the unread count badge', async () => {
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    const badge = wrapper.find('.notifications-count')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('2')
  })

  it('should not show badge when no unread notifications', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue([
      { ...mockNotifications[0], is_new: false },
      { ...mockNotifications[1], is_new: false },
    ])

    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    expect(wrapper.find('.notifications-count').exists()).toBe(false)
  })

  it('should open the dropdown when trigger is clicked', async () => {
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    const trigger = wrapper.find('.notifications-trigger')
    await trigger.trigger('click')

    expect(wrapper.find('.notifications-header').exists()).toBe(true)
    expect(wrapper.find('.notifications-list').exists()).toBe(true)
  })

  it('should display 5 notifications initially', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue(
      Array(12)
        .fill(null)
        .map((_, i) => ({
          ...mockNotifications[0],
          document: { id: i + 1, name: `AK-${String(i + 1).padStart(4, '0')}` },
        })),
    )

    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    const items = wrapper.findAll('.notification-item')
    expect(items).toHaveLength(5)
  })

  it('should load more items on scroll', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue(
      Array(12)
        .fill(null)
        .map((_, i) => ({
          ...mockNotifications[0],
          document: { id: i + 1, name: `AK-${String(i + 1).padStart(4, '0')}` },
        })),
    )

    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    let items = wrapper.findAll('.notification-item')
    expect(items).toHaveLength(5)

    const list = wrapper.find('.notifications-list')
    list.element.scrollTop = list.element.scrollHeight - list.element.clientHeight
    await list.trigger('scroll')

    items = wrapper.findAll('.notification-item')
    expect(items).toHaveLength(10)
  })

  it('should mark all as read when button is clicked', async () => {
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    const button = wrapper.find('.notifications-mark-all')
    expect(button.attributes('disabled')).toBeUndefined()

    await button.trigger('click')
    await flushPromises()

    expect(notificationsAPI.markAllNotificationsAsRead).toHaveBeenCalled()
  })

  it('should disable mark all button when no unread', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue(
      mockNotifications.map((item) => ({ ...item, is_new: false })),
    )

    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    const button = wrapper.find('.notifications-mark-all')
    expect(button.attributes('disabled')).toBe('')
  })

  it('should navigate to document when notification is clicked', async () => {
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    const item = wrapper.find('.notification-item')
    await item.trigger('click')
    await flushPromises()

    expect(notificationsAPI.markNotificationAsRead).toHaveBeenCalledWith(1)
  })

  it('should show relative time correctly', async () => {
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    const dates = wrapper.findAll('.notification-date')
    expect(dates[0].text()).toBe('há 5 min')
  })

  it('should display correct badge for different notification types', async () => {
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    const badges = wrapper.findAll('.notification-badge')
    expect(badges[0].classes()).toContain('badge-info')
    expect(badges[1].classes()).toContain('badge-success')
    expect(badges[2].classes()).toContain('badge-danger')
  })

  it('should highlight unread notifications with blue dot', async () => {
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    const items = wrapper.findAll('.notification-item')
    expect(items[0].classes()).toContain('new')
    expect(items[1].classes()).toContain('new')
    expect(items[2].classes()).not.toContain('new')
  })

  it('should show empty state when no notifications', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue([])

    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    expect(wrapper.find('.notifications-empty').exists()).toBe(true)
    expect(wrapper.find('.notifications-empty').text()).toBe('Nenhuma notificação.')
  })

  it('should poll notifications every minute', async () => {
    mountNotificationsDropdown()
    await flushPromises()

    expect(notificationsAPI.fetchNotifications).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(60 * 1000)
    await flushPromises()

    expect(notificationsAPI.fetchNotifications).toHaveBeenCalledTimes(2)
  })

  it('should close dropdown after clicking a notification', async () => {
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')
    expect(wrapper.find('.notifications-header').exists()).toBe(true)

    await wrapper.find('.notification-item').trigger('click')
    await flushPromises()

    expect(wrapper.find('.notifications-header').exists()).toBe(false)
  })

  it('should reset visible count when reopening', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue(
      Array(12)
        .fill(null)
        .map((_, i) => ({
          ...mockNotifications[0],
          document: { id: i + 1, name: `AK-${String(i + 1).padStart(4, '0')}` },
        })),
    )

    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')
    let items = wrapper.findAll('.notification-item')
    expect(items).toHaveLength(5)

    const list = wrapper.find('.notifications-list')
    list.element.scrollTop = list.element.scrollHeight - list.element.clientHeight
    await list.trigger('scroll')

    items = wrapper.findAll('.notification-item')
    expect(items).toHaveLength(10)

    await wrapper.find('.notifications-trigger').trigger('click')
    await wrapper.find('.notifications-trigger').trigger('click')

    items = wrapper.findAll('.notification-item')
    expect(items).toHaveLength(5)
  })
})
