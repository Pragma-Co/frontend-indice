import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ToastContainer from '../../src/components/common/ToastContainer.vue'
import { useNotificationStore } from '../../src/stores/notificationStore'

describe('ToastContainer', () => {
  let notifications

  beforeEach(() => {
    setActivePinia(createPinia())
    notifications = useNotificationStore()
  })

  it('should render nothing while there are no notifications', () => {
    const wrapper = mount(ToastContainer)

    expect(wrapper.findAll('.toast')).toHaveLength(0)
  })

  it('should announce a success notification as a status message', async () => {
    const wrapper = mount(ToastContainer)

    notifications.success('Documento publicado com sucesso.', { timeout: 0 })
    await wrapper.vm.$nextTick()

    const toast = wrapper.find('.toast')
    expect(toast.text()).toContain('Documento publicado com sucesso.')
    expect(toast.classes()).toContain('toast-success')
    expect(toast.attributes('role')).toBe('status')
  })

  it('should announce an error notification as an alert', async () => {
    const wrapper = mount(ToastContainer)

    notifications.error('Não foi possível conectar ao servidor.', { timeout: 0 })
    await wrapper.vm.$nextTick()

    const toast = wrapper.find('.toast')
    expect(toast.classes()).toContain('toast-error')
    expect(toast.attributes('role')).toBe('alert')
  })

  it('should dismiss the notification when the close button is clicked', async () => {
    const wrapper = mount(ToastContainer)
    notifications.success('Fechar', { timeout: 0 })
    await wrapper.vm.$nextTick()

    await wrapper.find('button[aria-label="Fechar notificação"]').trigger('click')

    expect(notifications.items).toHaveLength(0)
  })
})
