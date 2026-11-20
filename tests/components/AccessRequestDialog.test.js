import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccessRequestDialog from '@/views/document/components/AccessRequestDialog.vue'

const VALID_TEXT = 'Preciso consultar este documento para o projeto.'

function submitButton(wrapper) {
  return wrapper.findAll('.dialog-actions button')[1]
}

describe('AccessRequestDialog', () => {
  it('should render the fields with permanent access selected', () => {
    const wrapper = mount(AccessRequestDialog)

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.find('input[value="PERMANENT"]').element.checked).toBe(true)
    expect(wrapper.find('#access-expires-on').exists()).toBe(false)
    expect(wrapper.find('textarea').attributes('maxlength')).toBe('1000')
  })

  it('should require the justification', async () => {
    const wrapper = mount(AccessRequestDialog)

    await submitButton(wrapper).trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').text()).toContain('Informe a justificativa')
  })

  it('should reject whitespace-only and too short justifications', async () => {
    const wrapper = mount(AccessRequestDialog)

    await wrapper.find('textarea').setValue(' '.repeat(30))
    await submitButton(wrapper).trigger('click')
    expect(wrapper.find('[role="alert"]').text()).toContain('Informe a justificativa')

    await wrapper.find('textarea').setValue('curto demais')
    await submitButton(wrapper).trigger('click')
    expect(wrapper.find('[role="alert"]').text()).toContain('no mínimo 20 caracteres')
    expect(wrapper.find('textarea').attributes('aria-invalid')).toBe('true')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('should emit the trimmed payload for permanent access', async () => {
    const wrapper = mount(AccessRequestDialog)

    await wrapper.find('textarea').setValue(`  ${VALID_TEXT}  `)
    await submitButton(wrapper).trigger('click')

    expect(wrapper.emitted('submit')).toEqual([
      [{ justification: VALID_TEXT, access_type: 'PERMANENT', expires_on: null }],
    ])
  })

  it('should require an expiry date for temporary access and send it when filled', async () => {
    const wrapper = mount(AccessRequestDialog)

    await wrapper.find('input[value="TEMPORARY"]').setValue()
    await wrapper.find('textarea').setValue(VALID_TEXT)
    await submitButton(wrapper).trigger('click')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Informe até quando')

    await wrapper.find('#access-expires-on').setValue('01/01/2999')
    await submitButton(wrapper).trigger('click')
    expect(wrapper.emitted('submit')).toEqual([
      [{ justification: VALID_TEXT, access_type: 'TEMPORARY', expires_on: '2999-01-01' }],
    ])
  })

  it('should refuse an expiry date in the past', async () => {
    const wrapper = mount(AccessRequestDialog)

    await wrapper.find('input[value="TEMPORARY"]').setValue()
    await wrapper.find('textarea').setValue(VALID_TEXT)
    await wrapper.find('#access-expires-on').setValue('01/01/2000')
    await submitButton(wrapper).trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('não pode estar no passado')
  })

  it('should block resubmission and cancelling while requesting', async () => {
    const wrapper = mount(AccessRequestDialog, { props: { requesting: true } })

    expect(submitButton(wrapper).text()).toContain('Enviando solicitação')
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.find('textarea').attributes('disabled')).toBeDefined()
    await submitButton(wrapper).trigger('click')
    await wrapper.find('.dialog-backdrop').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('should show the error and allow retrying', async () => {
    const wrapper = mount(AccessRequestDialog, { props: { errorMessage: 'Sem conexão.' } })

    expect(wrapper.find('[role="alert"]').text()).toContain('Sem conexão.')
    await wrapper.find('textarea').setValue(VALID_TEXT)
    await submitButton(wrapper).trigger('click')

    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('should emit cancel from the button, the backdrop and Escape', async () => {
    const wrapper = mount(AccessRequestDialog, { attachTo: document.body })

    await wrapper.findAll('.dialog-actions button')[0].trigger('click')
    await wrapper.find('.dialog-backdrop').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('cancel')).toHaveLength(3)
    wrapper.unmount()
  })
})
