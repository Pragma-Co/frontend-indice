import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import NotificationsDropdown from '../../src/components/layout/NotificationsDropdown.vue'
import { useLegalConsentStore } from '../../src/stores/legalConsentStore'
import * as notificationsAPI from '../../src/api/notifications'

const mounted = []

const mockNotifications = [
  {
    id: 11,
    title: 'Documento 1 atualizado',
    document: { id: 1, code: 'AK-0001', title: 'Documento 1' },
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    read_at: null,
    is_new: true,
    type: 'DOCUMENT_UPDATED',
  },
  {
    id: 12,
    title: 'Acesso aprovado',
    document: { id: 2, code: 'AK-0002', title: 'Documento 2' },
    created_at: new Date(Date.now() - 65 * 60000).toISOString(),
    read_at: null,
    is_new: true,
    type: 'ACCESS_APPROVED',
  },
  {
    id: 13,
    title: 'Acesso recusado',
    document: { id: 3, code: 'AK-0003', title: 'Documento 3' },
    created_at: new Date(Date.now() - 125 * 60000).toISOString(),
    read_at: null,
    is_new: true,
    type: 'ACCESS_REJECTED',
  },
]

function manyNotifications(total) {
  return Array(total)
    .fill(null)
    .map((_, i) => ({
      ...mockNotifications[0],
      id: i + 1,
      document: { id: i + 1, code: `AK-${String(i + 1).padStart(4, '0')}`, title: `Doc ${i + 1}` },
    }))
}

function unreadPage(notifications, unreadCount = notifications.length) {
  return { notifications: structuredClone(notifications), unreadCount }
}

function mountNotificationsDropdown() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/documents/:documentId', component: { template: '<div />' } }],
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
    setActivePinia(createPinia())
    useLegalConsentStore().checked = true
    vi.useFakeTimers()
    vi.spyOn(notificationsAPI, 'fetchNotifications').mockResolvedValue(
      unreadPage(mockNotifications),
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
    expect(badge.text()).toBe('3')
  })

  it('should show the total of unread notifications even beyond the 10 listed', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue(
      unreadPage(manyNotifications(10), 30),
    )

    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    expect(wrapper.find('.notifications-count').text()).toBe('30')
    expect(wrapper.find('.notifications-trigger').attributes('aria-label')).toBe(
      'Notificações, 30 não lidas',
    )
  })

  it('should cap the badge at 99+', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue(
      unreadPage(manyNotifications(10), 120),
    )

    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    expect(wrapper.find('.notifications-count').text()).toBe('99+')
  })

  it('should not show badge when no unread notifications', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue(unreadPage([]))

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
      unreadPage(manyNotifications(10)),
    )

    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    const items = wrapper.findAll('.notification-item')
    expect(items).toHaveLength(5)
  })

  it('should load more items on scroll', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue(
      unreadPage(manyNotifications(10)),
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
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue(unreadPage([]))

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

    expect(notificationsAPI.markNotificationAsRead).toHaveBeenCalledWith(11)
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

  it('should highlight the unread notifications with blue dot', async () => {
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    const items = wrapper.findAll('.notification-item')
    expect(items.every((item) => item.classes('new'))).toBe(true)
    expect(wrapper.findAll('.notification-dot')).toHaveLength(3)
  })

  it('should remove an opened notification and bring the next unread one', async () => {
    const next = { ...mockNotifications[0], id: 14, title: 'Próxima não lida' }
    vi.mocked(notificationsAPI.fetchNotifications)
      .mockResolvedValueOnce(unreadPage(mockNotifications, 4))
      .mockResolvedValueOnce(unreadPage([mockNotifications[1], mockNotifications[2], next], 3))
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')
    await wrapper.find('.notification-item').trigger('click')
    await flushPromises()
    await wrapper.find('.notifications-trigger').trigger('click')

    const titles = wrapper.findAll('.notification-text').map((title) => title.text())
    expect(titles).toEqual(['Acesso aprovado', 'Acesso recusado', 'Próxima não lida'])
    expect(wrapper.find('.notifications-count').text()).toBe('3')
  })

  it('should take an opened notification out of the list right away', async () => {
    vi.mocked(notificationsAPI.markNotificationAsRead).mockReturnValue(new Promise(() => {}))
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')
    await wrapper.find('.notification-item').trigger('click')
    await wrapper.find('.notifications-trigger').trigger('click')

    expect(wrapper.findAll('.notification-item')).toHaveLength(2)
    expect(wrapper.find('.notifications-count').text()).toBe('2')
  })

  it('should bring an opened notification back when marking it as read fails', async () => {
    vi.mocked(notificationsAPI.markNotificationAsRead).mockRejectedValue(new Error('offline'))
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')
    await wrapper.find('.notification-item').trigger('click')
    await flushPromises()
    await wrapper.find('.notifications-trigger').trigger('click')

    expect(wrapper.findAll('.notification-item')).toHaveLength(3)
    expect(wrapper.find('.notifications-count').text()).toBe('3')
  })

  it('should empty the list and the badge when every notification is marked as read', async () => {
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')
    await wrapper.find('.notifications-mark-all').trigger('click')
    await flushPromises()

    expect(wrapper.find('.notifications-count').exists()).toBe(false)
    expect(wrapper.find('.notifications-empty').text()).toBe('Nenhuma notificação nova.')
  })

  it('should restore the list and the badge when marking all as read fails', async () => {
    vi.mocked(notificationsAPI.markAllNotificationsAsRead).mockRejectedValue(new Error('offline'))
    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')
    await wrapper.find('.notifications-mark-all').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.notification-item')).toHaveLength(3)
    expect(wrapper.find('.notifications-count').text()).toBe('3')
  })

  it('should show empty state when no notifications', async () => {
    vi.mocked(notificationsAPI.fetchNotifications).mockResolvedValue(unreadPage([]))

    const wrapper = mountNotificationsDropdown()
    await flushPromises()

    await wrapper.find('.notifications-trigger').trigger('click')

    expect(wrapper.find('.notifications-empty').exists()).toBe(true)
    expect(wrapper.find('.notifications-empty').text()).toBe('Nenhuma notificação nova.')
  })

  it('should not load notifications until the legal terms are accepted', async () => {
    const consent = useLegalConsentStore()
    consent.checked = true
    consent.pending = [{ current_version: { id: 1 } }]

    mountNotificationsDropdown()
    await flushPromises()
    expect(notificationsAPI.fetchNotifications).not.toHaveBeenCalled()

    consent.pending = []
    await flushPromises()
    expect(notificationsAPI.fetchNotifications).toHaveBeenCalledTimes(1)
  })

  it('should not load notifications before the pending check finishes', async () => {
    useLegalConsentStore().checked = false

    mountNotificationsDropdown()
    await flushPromises()

    expect(notificationsAPI.fetchNotifications).not.toHaveBeenCalled()
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
      unreadPage(manyNotifications(10)),
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
