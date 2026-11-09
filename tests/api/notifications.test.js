import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NOTIFICATION_TYPES,
} from '../../src/api/notifications'

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }
}

const notification = {
  id: 42,
  type: 'DOCUMENT_UPDATED',
  title: 'Nova revisão (REV02) publicada para o documento Memorial de cargas.',
  document: { id: 7, code: 'AK-2200-AER-MEM-0002', title: 'Memorial de cargas' },
  is_new: true,
  created_at: '2026-11-08T14:05:12+00:00',
  read_at: null,
}

describe('notifications API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    document.cookie = 'csrftoken=token-123; path=/'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'csrftoken=; path=/; max-age=0'
  })

  it('should expose the notification types sent by the backend', () => {
    expect(Object.values(NOTIFICATION_TYPES)).toEqual([
      'DOCUMENT_UPDATED',
      'ACCESS_APPROVED',
      'ACCESS_REJECTED',
    ])
  })

  it('should fetch the latest notifications and return the results', async () => {
    globalThis.fetch.mockResolvedValue(
      jsonResponse(200, { count: 1, unread_count: 1, results: [notification] }),
    )

    const result = await fetchNotifications()

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/notifications?page_size=100')
    expect(init.method).toBe('GET')
    expect(result).toEqual([notification])
  })

  it('should return an empty list when the backend sends no results', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, {}))

    const result = await fetchNotifications()

    expect(result).toEqual([])
  })

  it('should mark one notification as read by its id with the CSRF token', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { ...notification, is_new: false }))

    await markNotificationAsRead(42)

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/notifications/42/read')
    expect(init.method).toBe('PATCH')
    expect(init.headers['X-CSRFToken']).toBe('token-123')
  })

  it('should mark every notification as read', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { updated: 3, unread_count: 0 }))

    const result = await markAllNotificationsAsRead()

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/notifications/read-all')
    expect(init.method).toBe('PATCH')
    expect(result).toEqual({ updated: 3, unread_count: 0 })
  })

  it('should reject when the backend answers with an error', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(404, { error: 'NotificationNotFound' }))

    await expect(markNotificationAsRead(99)).rejects.toMatchObject({ status: 404 })
  })
})
