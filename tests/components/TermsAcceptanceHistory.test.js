import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/users.js', () => ({
  fetchLegalAcceptances: vi.fn(),
  revokeLegalAcceptance: vi.fn(),
  acceptLegalTerms: vi.fn(),
}))

import { acceptLegalTerms, fetchLegalAcceptances, revokeLegalAcceptance } from '@/api/users.js'
import TermsAcceptanceHistory from '@/views/user-management/components/TermsAcceptanceHistory.vue'

const ACCEPTANCES = [
  {
    id: 1,
    accepted_at: '2026-03-12T09:15:00',
    revoked_at: null,
    document: { slug: 'consentimento', title: 'Termo de Consentimento para Uso de Dados Pessoais' },
    version: { id: 3, version: 1 },
    consents: [{ clause_id: 5, is_required: false, accepted: true }],
  },
  {
    id: 2,
    accepted_at: '2026-09-24T14:32:00',
    revoked_at: null,
    document: { slug: 'termos-de-uso', title: 'Termos de Uso e Política de Privacidade' },
    version: { id: 7, version: 2 },
    consents: [{ clause_id: 1, is_required: true, accepted: true }],
  },
]

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function mountHistory() {
  const wrapper = mount(TermsAcceptanceHistory)
  await flushPromises()
  return wrapper
}

describe('TermsAcceptanceHistory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    fetchLegalAcceptances.mockResolvedValue({ count: 2, results: ACCEPTANCES })
  })

  it('should show the columns of the history', async () => {
    const wrapper = await mountHistory()

    const headers = wrapper.findAll('th').map((header) => header.text())

    expect(headers).toEqual([
      'Documento / Termo',
      'Versão',
      'Tipo de Condição',
      'Data do Aceite',
      'Status',
      'Ações',
    ])
  })

  it('should list every accepted term from the most recent to the oldest', async () => {
    const wrapper = await mountHistory()

    const rows = wrapper
      .findAll('tbody tr')
      .map((row) => row.findAll('td').map((cell) => cell.text()))

    expect(rows).toEqual([
      [
        'Termos de Uso e Política de Privacidade',
        'v2',
        'Obrigatório',
        '24/09/2026 às 14:32',
        'Aceito',
        'Revogar aceite',
      ],
      [
        'Termo de Consentimento para Uso de Dados Pessoais',
        'v1',
        'Opcional',
        '12/03/2026 às 09:15',
        'Aceito',
        'Revogar aceite',
      ],
    ])
  })

  it('should count the records', async () => {
    const wrapper = await mountHistory()

    expect(wrapper.find('.count-pill').text()).toBe('2 registros')
  })

  it('should count a single record in the singular', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [ACCEPTANCES[0]] })

    const wrapper = await mountHistory()

    expect(wrapper.find('.count-pill').text()).toBe('1 registro')
  })

  it('should show a revoked acceptance with its own status', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [{ ...ACCEPTANCES[1], revoked_at: '2026-10-01T10:00:00' }],
    })

    const wrapper = await mountHistory()

    const status = wrapper.find('.status-pill')
    expect(status.text()).toBe('Revogado')
    expect(status.classes()).toContain('revoked')
    expect(wrapper.find('.revoked-at').text()).toBe('em 01/10/2026 às 10:00')
    expect(wrapper.find('.revoke-button').exists()).toBe(false)
  })

  it('should say it is loading while the history is requested', async () => {
    fetchLegalAcceptances.mockReturnValue(deferred().promise)

    const wrapper = await mountHistory()

    expect(wrapper.find('[role="status"]').text()).toBe('Carregando histórico...')
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.find('.count-pill').exists()).toBe(false)
  })

  it('should say when the user has not accepted any term yet', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 0, results: [] })

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain('Nenhum aceite de termos registrado até o momento.')
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.find('.count-pill').text()).toBe('0 registros')
  })

  it('should explain a failure and load again on retry', async () => {
    fetchLegalAcceptances.mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountHistory()
    const alert = wrapper.find('[role="alert"]').text()

    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(alert).toContain('Não foi possível carregar o histórico de termos.')
    expect(fetchLegalAcceptances).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('should keep the audit note visible', async () => {
    const wrapper = await mountHistory()

    expect(wrapper.find('.audit-note').text()).toContain(
      'Registros de aceite são mantidos para fins de auditoria',
    )
  })

  it('should ask for confirmation before revoking and do nothing on cancel', async () => {
    const wrapper = await mountHistory()

    await wrapper.findAll('.revoke-button')[0].trigger('click')
    const dialog = wrapper.find('[role="alertdialog"]')
    const message = dialog.text()
    await dialog.findAll('button')[0].trigger('click')

    expect(message).toContain('Termos de Uso e Política de Privacidade')
    expect(message).toContain('poderá aceitar o termo novamente')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(revokeLegalAcceptance).not.toHaveBeenCalled()
  })

  it('should revoke the confirmed acceptance and show it as revoked', async () => {
    revokeLegalAcceptance.mockResolvedValue({
      ...ACCEPTANCES[1],
      revoked_at: '2026-10-15T10:00:00',
    })
    const wrapper = await mountHistory()

    await wrapper.findAll('.revoke-button')[0].trigger('click')
    await wrapper.find('[role="alertdialog"]').findAll('button')[1].trigger('click')
    await flushPromises()

    const firstRow = wrapper.findAll('tbody tr')[0]
    expect(revokeLegalAcceptance).toHaveBeenCalledWith(2)
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(firstRow.find('.status-pill').text()).toBe('Revogado')
    expect(firstRow.find('.revoke-button').exists()).toBe(false)
    expect(wrapper.findAll('.revoke-button')).toHaveLength(1)
  })

  it('should accept a revoked term again after confirmation', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [{ ...ACCEPTANCES[1], revoked_at: '2026-10-01T10:00:00' }],
    })
    acceptLegalTerms.mockResolvedValue({
      ...ACCEPTANCES[1],
      id: 9,
      accepted_at: '2026-10-15T11:00:00',
    })
    const wrapper = await mountHistory()

    await wrapper.find('.reaccept-button').trigger('click')
    const dialog = wrapper.find('[role="alertdialog"]')
    const message = dialog.text()
    await dialog.findAll('button')[1].trigger('click')
    await flushPromises()

    const statuses = wrapper.findAll('tbody .status-pill').map((pill) => pill.text())
    expect(message).toContain('mesmas escolhas de cláusulas')
    expect(acceptLegalTerms).toHaveBeenCalledWith({
      versionId: 7,
      consents: [{ clause_id: 1, accepted: true }],
    })
    expect(statuses).toEqual(['Aceito', 'Revogado'])
    expect(wrapper.find('.reaccept-button').exists()).toBe(false)
    expect(wrapper.findAll('.revoke-button')).toHaveLength(1)
  })
})
