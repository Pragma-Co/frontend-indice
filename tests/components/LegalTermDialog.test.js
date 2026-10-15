import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/api/legal.js', () => ({ fetchLegalVersion: vi.fn() }))

import { fetchLegalVersion } from '@/api/legal.js'
import LegalTermDialog from '@/views/user-management/components/LegalTermDialog.vue'

const VERSION = {
  id: 7,
  version: 2,
  summary: 'Declaração do titular sobre o tratamento de dados.',
  clauses: [
    {
      id: 2,
      position: 2,
      title: 'Art. 2º Comunicados',
      body: 'Envio de comunicados.',
      is_required: false,
    },
    { id: 1, position: 1, title: 'Art. 1º Objeto', body: 'Objeto do termo.', is_required: true },
  ],
}

const mounted = []

async function mountDialog(props = {}) {
  const wrapper = mount(LegalTermDialog, {
    props: { versionId: 7, title: 'Termos de Uso', versionLabel: 'v2', ...props },
    attachTo: document.body,
    global: { stubs: { teleport: true } },
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('LegalTermDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchLegalVersion.mockResolvedValue(VERSION)
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('should load and show the text of the given version in clause order', async () => {
    const wrapper = await mountDialog()

    expect(fetchLegalVersion).toHaveBeenCalledWith(7)
    expect(wrapper.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(wrapper.find('#legal-term-title').text()).toBe('Termos de Uso')
    expect(wrapper.find('.term-dialog-version').text()).toBe('Versão v2')
    expect(wrapper.find('.term-summary').text()).toBe(VERSION.summary)
    expect(wrapper.findAll('.term-clause h3').map((title) => title.text())).toEqual([
      'Art. 1º Objeto',
      'Art. 2º Comunicados',
    ])
    expect(wrapper.text()).toContain('Obrigatória')
    expect(wrapper.text()).toContain('Opcional')
  })

  it('should show what the user decided on each clause', async () => {
    const wrapper = await mountDialog({
      decisions: [
        { clause_id: 1, accepted: true },
        { clause_id: 2, accepted: false },
      ],
    })

    const tags = wrapper.findAll('.term-clause').map((clause) =>
      clause
        .findAll('.term-tag')
        .map((tag) => tag.text())
        .join(' '),
    )
    expect(tags).toEqual(['Obrigatória Aceita', 'Opcional Recusada'])
  })

  it('should not show decisions for a term that was never accepted', async () => {
    const wrapper = await mountDialog()

    expect(wrapper.text()).not.toContain('Aceita')
    expect(wrapper.text()).not.toContain('Recusada')
  })

  it('should explain a failure and load again on retry', async () => {
    fetchLegalVersion.mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountDialog()
    const alert = wrapper.find('[role="alert"]').text()

    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(alert).toContain('Não foi possível carregar o texto do termo.')
    expect(wrapper.findAll('.term-clause')).toHaveLength(2)
  })

  it('should close on the close button, the footer button, Escape and the backdrop', async () => {
    const wrapper = await mountDialog()

    await wrapper.find('button[aria-label="Fechar"]').trigger('click')
    await wrapper.find('.term-dialog-footer button').trigger('click')
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await wrapper.find('.term-overlay').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(4)
  })

  it('should show when the term was accepted and revoked', async () => {
    const wrapper = await mountDialog({
      acceptedAt: '2026-10-14T09:51:00',
      revokedAt: '2026-10-15T10:41:00',
    })

    expect(wrapper.find('.term-dialog-timeline').text()).toBe(
      'Aceito em 14/10/2026 às 09:51 · Revogado em 15/10/2026 às 10:41',
    )
  })

  it('should not show dates for a term that was never accepted', async () => {
    const wrapper = await mountDialog()

    expect(wrapper.find('.term-dialog-timeline').exists()).toBe(false)
  })
})
