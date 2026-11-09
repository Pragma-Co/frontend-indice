import { api } from './client'

export const NOTIFICATION_TYPES = {
  DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
  ACCESS_APPROVED: 'ACCESS_APPROVED',
  ACCESS_REJECTED: 'ACCESS_REJECTED',
}

const PAGE_SIZE = 100

export async function fetchNotifications() {
  const data = await api.get(`/notifications?page_size=${PAGE_SIZE}`)
  return data?.results ?? []
}

export function markAllNotificationsAsRead() {
  return api.patch('/notifications/read-all')
}

export function markNotificationAsRead(notificationId) {
  return api.patch(`/notifications/${notificationId}/read`)
}
