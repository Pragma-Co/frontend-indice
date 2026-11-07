import { api } from './client'

export const NOTIFICATION_TYPES = {
  DOCUMENT_UPDATED: 1,
  ACCESS_APPROVED: 2,
  ACCESS_DENIED: 3,
}

const USE_MOCK = true

const MINUTE = 60 * 1000
const MOCK_DOCUMENTS = [
  ['Memorial de cargas aerodinâmicas atualizado para REV02.', 'AK-2200-AER-MEM-0002', 1],
  ['Pedido de acesso à verificação do pilone aprovado.', 'AK-3100-EST-ESP-0001', 2],
  ['Pedido de acesso à análise de fadiga recusado.', 'AK-2100-EST-REL-0014', 3],
  ['Memorial de drenagem atualizado para REV03.', 'AK-3100-HID-MEM-0018', 1],
  ['Pedido de acesso ao relatório de ensaios aprovado.', 'AK-4100-ENS-REL-0007', 2],
  ['Especificação do trem de pouso atualizada para REV05.', 'AK-5100-TRP-ESP-0003', 1],
  ['Pedido de acesso ao manual de manutenção recusado.', 'AK-6100-MAN-MAN-0011', 3],
  ['Relatório de ensaios estruturais atualizado para REV01.', 'AK-2100-EST-REL-0020', 1],
  ['Pedido de acesso ao memorial térmico aprovado.', 'AK-7100-TER-MEM-0004', 2],
  ['Memorial de combustível atualizado para REV04.', 'AK-8100-COM-MEM-0009', 1],
  ['Pedido de acesso à especificação elétrica recusado.', 'AK-9100-ELE-ESP-0002', 3],
  ['Memorial de cargas de pouso atualizado para REV02.', 'AK-2200-AER-MEM-0010', 1],
]

let mockNotifications = MOCK_DOCUMENTS.map(([title, name, type], index) => ({
  title,
  document: { id: index + 1, name },
  date: new Date(Date.now() - (5 + index * 20) * MINUTE).toISOString(),
  is_new: index < 4,
  type,
}))

const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 150))

export async function fetchNotifications() {
  if (!USE_MOCK) return api.get('/notifications')
  await mockDelay()
  return mockNotifications.map((item) => ({ ...item, document: { ...item.document } }))
}

export async function markAllNotificationsAsRead() {
  if (!USE_MOCK) return api.post('/notifications/read-all')
  await mockDelay()
  mockNotifications = mockNotifications.map((item) => ({ ...item, is_new: false }))
  return null
}

export async function markNotificationAsRead(documentId) {
  if (!USE_MOCK) return api.post(`/notifications/documents/${documentId}/read`)
  await mockDelay()
  mockNotifications = mockNotifications.map((item) =>
    item.document.id === documentId ? { ...item, is_new: false } : item,
  )
  return null
}
