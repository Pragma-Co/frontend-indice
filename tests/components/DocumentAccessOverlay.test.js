import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DocumentAccessOverlay from '@/views/document/components/DocumentAccessOverlay.vue'

function requestButton(wrapper) {
  return wrapper.find('button')
}

describe('DocumentAccessOverlay', () => {
  it('should explain the restriction and offer to request access', () => {
    const wrapper = mount(DocumentAccessOverlay)

    expect(wrapper.text()).toContain('Conteúdo restrito')
    expect(wrapper.text()).toContain('sigiloso')
    expect(requestButton(wrapper).text()).toBe('Solicitar Acesso')
    expect(requestButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('should emit request when the button is clicked', async () => {
    const wrapper = mount(DocumentAccessOverlay)

    await requestButton(wrapper).trigger('click')

    expect(wrapper.emitted('request')).toHaveLength(1)
  })

  it('should show the loading state and block new clicks while requesting', async () => {
    const wrapper = mount(DocumentAccessOverlay, { props: { requesting: true } })

    expect(requestButton(wrapper).text()).toContain('Enviando solicitação')
    expect(requestButton(wrapper).attributes('disabled')).toBeDefined()
    expect(requestButton(wrapper).attributes('aria-busy')).toBe('true')
    await requestButton(wrapper).trigger('click')
    expect(wrapper.emitted('request')).toBeUndefined()
  })

  it('should stay disabled as sent after the request succeeds', () => {
    const wrapper = mount(DocumentAccessOverlay, { props: { requested: true } })

    expect(requestButton(wrapper).text()).toBe('Solicitação enviada')
    expect(requestButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="status"]').text()).toContain('responsável responder')
  })

  it('should show the error and keep the button available to try again', () => {
    const wrapper = mount(DocumentAccessOverlay, {
      props: { errorMessage: 'Não foi possível enviar a solicitação. Tente novamente.' },
    })

    expect(wrapper.find('[role="alert"]').text()).toContain('Não foi possível enviar')
    expect(requestButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('should tell the user a rejected request instead of offering the button', () => {
    const wrapper = mount(DocumentAccessOverlay, { props: { rejected: true } })

    expect(wrapper.text()).toContain('recusada pelo responsável')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
