import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AccessReviewModal from '@/views/manager/components/AccessReviewModal.vue'

const request = {
  id: 7,
  code: 'DOC-001',
  title: 'Documento',
  requesterName: 'Solicitante',
  discipline: 'Estruturas',
  justification: 'Preciso consultar o documento.',
  source: { access_type: 'TEMPORARY', expires_on: '2026-12-30' },
}

function mountModal(pendingDecision = null) {
  return mount(AccessReviewModal, {
    props: { request, pendingDecision },
    global: { stubs: { teleport: true } },
  })
}

describe('AccessReviewModal', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
  })
  afterEach(() => {
    delete HTMLDialogElement.prototype.showModal
    delete HTMLDialogElement.prototype.close
  })
  it.each(['APPROVED', 'REJECTED'])('requires an opinion before %s', async (decision) => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain(request.justification)
    expect(wrapper.text()).toContain('30/12/2026')
    const buttons = wrapper.findAll('.actions button')
    expect(buttons.every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    await wrapper.get('textarea').setValue('Parecer detalhado para análise.')
    expect(wrapper.get('#access-opinion-hint').text()).toContain('31/20')
    const updatedButtons = wrapper.findAll('.actions button')
    expect(updatedButtons[0].attributes('disabled')).toBeUndefined()
    await updatedButtons[decision === 'APPROVED' ? 1 : 0].trigger('click')
    expect(wrapper.emitted('decide')).toEqual([
      [{ request, decision, opinion: 'Parecer detalhado para análise.' }],
    ])
    wrapper.unmount()
  })

  it('prevents closing and submitting again while a decision is pending', async () => {
    const wrapper = mountModal('APPROVED')
    await wrapper.get('dialog').trigger('cancel')
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(
      wrapper.findAll('.actions button').every((b) => b.attributes('disabled') !== undefined),
    ).toBe(true)
    wrapper.unmount()
  })

  it('closes on escape when not submitting', async () => {
    const wrapper = mountModal()
    await wrapper.get('dialog').trigger('cancel')
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})
