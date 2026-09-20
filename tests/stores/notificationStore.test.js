import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationStore } from '../../src/stores/notificationStore'

describe('notificationStore', () => {
  let notifications

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    notifications = useNotificationStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should queue a success notification', () => {
    notifications.success('Documento publicado com sucesso.')

    expect(notifications.items).toHaveLength(1)
    expect(notifications.items[0]).toMatchObject({
      type: 'success',
      message: 'Documento publicado com sucesso.',
    })
  })

  it('should queue an error notification', () => {
    notifications.error('Erro interno do servidor.')

    expect(notifications.items[0].type).toBe('error')
  })

  it('should dismiss a notification by id and keep the others', () => {
    const first = notifications.success('Primeira')
    notifications.success('Segunda')

    notifications.dismiss(first)

    expect(notifications.items.map((item) => item.message)).toEqual(['Segunda'])
  })

  it('should dismiss a success notification automatically after five seconds', () => {
    notifications.success('Some sozinha')

    vi.advanceTimersByTime(4999)
    expect(notifications.items).toHaveLength(1)
    vi.advanceTimersByTime(1)

    expect(notifications.items).toHaveLength(0)
  })

  it('should keep error notifications on screen longer than success ones', () => {
    notifications.error('Falha')

    vi.advanceTimersByTime(5000)
    expect(notifications.items).toHaveLength(1)
    vi.advanceTimersByTime(3000)

    expect(notifications.items).toHaveLength(0)
  })

  it('should keep a notification until dismissed when the timeout is zero', () => {
    notifications.notify({ type: 'info', message: 'Fixa', timeout: 0 })

    vi.advanceTimersByTime(60000)

    expect(notifications.items).toHaveLength(1)
  })

  it('should remove every notification on clear', () => {
    notifications.success('Uma')
    notifications.error('Outra')

    notifications.clear()

    expect(notifications.items).toEqual([])
  })
})
