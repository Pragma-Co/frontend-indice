import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DecisionDetailModal from '../../src/views/manager/components/DecisionDetailModal.vue'

const DECISION = {
  id: 1,
  code: 'AK-2100-PES-MEM-0005',
  title: 'Memorial de pesos',
  revision: 'REV01',
  requestType: 'REVISION',
  decision: 'REJECTED',
  requesterName: 'Caio Bertoni',
  userName: 'Marina Duarte',
  decidedAt: '2026-09-26T14:32:00',
  reason: 'A memória de cálculo não cobre a condição de pouso.',
}

function mountModal(decision = {}) {
  return mount(DecisionDetailModal, {
    props: { decision: { ...DECISION, ...decision } },
    global: { stubs: { teleport: true } },
  })
}

describe('DecisionDetailModal', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
  })

  afterEach(() => {
    delete HTMLDialogElement.prototype.showModal
    delete HTMLDialogElement.prototype.close
  })

  it('should open as a modal naming the document', () => {
    const wrapper = mountModal()

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
    expect(wrapper.get('dialog').attributes('aria-labelledby')).toBe('decision-detail-title')
    expect(wrapper.get('.document-title').text()).toBe('AK-2100-PES-MEM-0005 · Memorial de pesos')
  })

  it('should show the reason of a refusal', () => {
    const wrapper = mountModal()

    expect(wrapper.get('h3').text()).toBe('Motivo da recusa')
    expect(wrapper.get('.reason').text()).toBe(DECISION.reason)
  })

  it('should title the reason of an approval as acceptance', () => {
    const wrapper = mountModal({ decision: 'APPROVED' })

    expect(wrapper.get('h3').text()).toBe('Motivo do aceite')
  })

  it('should say so when no reason was recorded', () => {
    const wrapper = mountModal({ reason: '' })

    expect(wrapper.get('.reason').text()).toBe('Nenhum motivo foi registrado para esta decisão.')
    expect(wrapper.get('.reason').classes()).toContain('is-empty')
  })

  it('should show who asked, who decided, the moment and the decision', () => {
    const text = mountModal().get('dl').text()

    expect(text).toContain('Reprovada')
    expect(text).toContain('Revisão técnica')
    expect(text).toContain('REV01')
    expect(text).toContain('Caio Bertoni')
    expect(text).toContain('Marina Duarte')
    expect(text).toContain('26/09/2026 • 14:32')
  })

  it('should not list a revision for an access request', () => {
    const wrapper = mountModal({ requestType: 'ACCESS', revision: null, decision: 'APPROVED' })

    expect(wrapper.get('dl').text()).not.toContain('Revisão')
    expect(wrapper.get('dl').text()).toContain('Deferido')
  })

  it('should ask to close from the buttons, Escape and the backdrop', async () => {
    const wrapper = mountModal()

    await wrapper.get('button[aria-label="Fechar"]').trigger('click')
    await wrapper.get('.decision-footer button').trigger('click')
    await wrapper.get('dialog').trigger('cancel')
    await wrapper.get('dialog').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(4)
  })
})
