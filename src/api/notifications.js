import { api } from './client'

export const NOTIFICATION_TYPES = {
  DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
  ACCESS_APPROVED: 'ACCESS_APPROVED',
  ACCESS_REJECTED: 'ACCESS_REJECTED',
  REVISION_APPROVED: 'REVISION_APPROVED',
  REVISION_REJECTED: 'REVISION_REJECTED',
}

const PAGE_SIZE = 10

export async function fetchNotifications() {
  const data = await api.get(`/notifications?unread=true&page_size=${PAGE_SIZE}`)
  const notifications = data?.results ?? []
  return {
    notifications,
    unreadCount: Number.isInteger(data?.unread_count) ? data.unread_count : notifications.length,
  }
}

export function markAllNotificationsAsRead() {
  return api.patch('/notifications/read-all')
}

export function markNotificationAsRead(notificationId) {
  return api.patch(`/notifications/${notificationId}/read`)
}
