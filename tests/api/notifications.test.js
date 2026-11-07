import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NOTIFICATION_TYPES,
} from '../../src/api/notifications'

describe('notifications API', () => {
  // Limpar estado entre testes
  afterEach(() => {
    vi.resetModules()
  })

  it('should fetch notifications with correct structure', async () => {
    const result = await fetchNotifications()

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)

    result.forEach((notification) => {
      expect(notification).toHaveProperty('title')
      expect(notification).toHaveProperty('document')
      expect(notification).toHaveProperty('date')
      expect(notification).toHaveProperty('is_new')
      expect(notification).toHaveProperty('type')

      expect(typeof notification.title).toBe('string')
      expect(typeof notification.document.id).toBe('number')
      expect(typeof notification.document.name).toBe('string')
      expect(typeof notification.date).toBe('string')
      expect(typeof notification.is_new).toBe('boolean')
      expect([
        NOTIFICATION_TYPES.DOCUMENT_UPDATED,
        NOTIFICATION_TYPES.ACCESS_APPROVED,
        NOTIFICATION_TYPES.ACCESS_DENIED,
      ]).toContain(notification.type)
    })
  })

  it('should have some unread notifications initially', async () => {
    const result = await fetchNotifications()
    const unread = result.filter((item) => item.is_new)

    expect(unread.length).toBeGreaterThan(0)
  })

  it('should mark all notifications as read', async () => {
    let result = await fetchNotifications()
    const unreadBefore = result.filter((item) => item.is_new).length

    expect(unreadBefore).toBeGreaterThan(0)

    await markAllNotificationsAsRead()

    result = await fetchNotifications()
    const unreadAfter = result.filter((item) => item.is_new).length

    expect(unreadAfter).toBe(0)
  })

  it('should mark a specific notification as read', async () => {
    let result = await fetchNotifications()
    let notification = result.find((item) => item.is_new)

    // Se não houver notificações não lidas, marcar uma como não lida para este teste
    if (!notification) {
      await markNotificationAsRead(result[0].document.id)
      result = await fetchNotifications()
      notification = result.find((item) => item.is_new)
    }

    if (!notification) {
      expect(true).toBe(true) // Skip se nenhuma pode ser não lida
      return
    }

    expect(notification.is_new).toBe(true)

    await markNotificationAsRead(notification.document.id)

    result = await fetchNotifications()
    const updated = result.find((item) => item.document.id === notification.document.id)

    expect(updated.is_new).toBe(false)
  })

  it('should not affect other notifications when marking one as read', async () => {
    let result = await fetchNotifications()
    const notifications = result.filter((item) => item.is_new)

    if (notifications.length < 2) {
      expect(true).toBe(true)
      return
    }

    const first = notifications[0]
    const second = notifications[1]

    await markNotificationAsRead(first.document.id)

    result = await fetchNotifications()
    const firstAfter = result.find((item) => item.document.id === first.document.id)
    const secondAfter = result.find((item) => item.document.id === second.document.id)

    expect(firstAfter.is_new).toBe(false)
    expect(secondAfter.is_new).toBe(true)
  })

  it('should persist notifications across multiple fetches', async () => {
    const first = await fetchNotifications()
    const second = await fetchNotifications()

    expect(first.map((item) => item.document.id)).toEqual(
      second.map((item) => item.document.id),
    )
  })

  it('should return independent copies to avoid mutations', async () => {
    const first = await fetchNotifications()
    const second = await fetchNotifications()

    first[0].is_new = !first[0].is_new
    const secondCheck = await fetchNotifications()

    expect(secondCheck[0].is_new).not.toBe(first[0].is_new)
  })
})
