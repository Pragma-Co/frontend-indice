import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DocumentAccessOverlay from '@/views/document/components/DocumentAccessOverlay.vue'

const PAYLOAD = { justification: 'Preciso consultar este documento.', access_type: 'PERMANENT' }

function openButton(wrapper) {
  return wrapper.find('.access-banner button')
}

describe('DocumentAccessOverlay', () => {
  it('should explain the restriction and offer the request button without the form', () => {
    const wrapper = mount(DocumentAccessOverlay)

    expect(wrapper.text()).toContain('Conteúdo restrito')
    expect(wrapper.text()).toContain('sigiloso')
    expect(openButton(wrapper).text()).toBe('Solicitar Acesso')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('should open the dialog when the button is clicked', async () => {
    const wrapper = mount(DocumentAccessOverlay)

    await openButton(wrapper).trigger('click')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should close the dialog on cancel without emitting', async () => {
    const wrapper = mount(DocumentAccessOverlay)
    await openButton(wrapper).trigger('click')

    await wrapper.findComponent({ name: 'AccessRequestDialog' }).vm.$emit('cancel')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.emitted('request')).toBeUndefined()
  })

  it('should forward the dialog payload as a request event', async () => {
    const wrapper = mount(DocumentAccessOverlay)
    await openButton(wrapper).trigger('click')

    await wrapper.findComponent({ name: 'AccessRequestDialog' }).vm.$emit('submit', PAYLOAD)

    expect(wrapper.emitted('request')).toEqual([[PAYLOAD]])
  })

  it('should keep the dialog open and show the error when the request fails', async () => {
    const wrapper = mount(DocumentAccessOverlay)
    await openButton(wrapper).trigger('click')

    await wrapper.setProps({ errorMessage: 'Não foi possível enviar a solicitação.' })

    expect(wrapper.find('[role="dialog"] [role="alert"]').text()).toContain('Não foi possível')
  })

  it('should close the dialog and block duplicates once the request is pending', async () => {
    const wrapper = mount(DocumentAccessOverlay)
    await openButton(wrapper).trigger('click')

    await wrapper.setProps({ requested: true })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(openButton(wrapper).text()).toBe('Solicitação enviada')
    expect(openButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="status"]').text()).toContain('gestor responder')
  })

  it('should tell the user a rejected request instead of offering the button', () => {
    const wrapper = mount(DocumentAccessOverlay, { props: { rejected: true } })

    expect(wrapper.text()).toContain('recusada pelo gestor')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
