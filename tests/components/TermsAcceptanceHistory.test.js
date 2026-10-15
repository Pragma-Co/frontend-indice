import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/users.js', () => ({
  fetchLegalAcceptances: vi.fn(),
  revokeLegalAcceptance: vi.fn(),
  acceptLegalTerms: vi.fn(),
}))
vi.mock('@/api/legal.js', () => ({ fetchLegalDocuments: vi.fn(), fetchLegalVersion: vi.fn() }))

import { fetchLegalDocuments, fetchLegalVersion } from '@/api/legal.js'
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

const NEW_POLICY = {
  slug: 'politica-de-cookies',
  title: 'Política de Cookies',
  current_version: {
    id: 12,
    version: 1,
    clauses: [{ id: 30, code: 'cookies', position: 1, title: 'Cookies', is_required: true }],
  },
}

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const mounted = []

async function mountHistory() {
  const wrapper = mount(TermsAcceptanceHistory, {
    attachTo: document.body,
    global: { stubs: { teleport: true } },
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

function rowOf(wrapper, title) {
  return wrapper.findAll('tbody tr').find((row) => row.text().includes(title))
}

async function chooseAction(wrapper, title, label) {
  await rowOf(wrapper, title).find('.action-menu-trigger').trigger('click')
  const item = wrapper.findAll('[role="menuitem"]').find((option) => option.text() === label)
  await item.trigger('click')
}

function menuLabels(wrapper) {
  return wrapper.findAll('[role="menuitem"]').map((item) => item.text())
}

describe('TermsAcceptanceHistory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    fetchLegalAcceptances.mockResolvedValue({ count: 2, results: ACCEPTANCES })
    fetchLegalDocuments.mockResolvedValue({ count: 0, results: [] })
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
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

    const rows = wrapper.findAll('tbody tr').map((row) =>
      row
        .findAll('td')
        .slice(0, 5)
        .map((cell) => cell.text()),
    )

    expect(rows).toEqual([
      [
        'Termos de Uso e Política de Privacidade',
        'v2',
        'Obrigatório',
        '24/09/2026 às 14:32',
        'Aceito',
      ],
      [
        'Termo de Consentimento para Uso de Dados Pessoais',
        'v1',
        'Opcional',
        '12/03/2026 às 09:15',
        'Aceito',
      ],
    ])
  })

  it('should list a published term that was never accepted on top', async () => {
    fetchLegalDocuments.mockResolvedValue({ count: 1, results: [NEW_POLICY] })

    const wrapper = await mountHistory()

    const firstRow = wrapper.findAll('tbody tr')[0]
    expect(
      firstRow
        .findAll('td')
        .slice(0, 5)
        .map((cell) => cell.text()),
    ).toEqual(['Política de Cookies', 'v1', 'Obrigatório', '—', 'Não aceito'])
    expect(firstRow.find('.status-pill').classes()).toContain('pending')
    expect(wrapper.find('.count-pill').text()).toBe('2 registros')
  })

  it('should count a single record in the singular', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 1, results: [ACCEPTANCES[0]] })

    const wrapper = await mountHistory()

    expect(wrapper.find('.count-pill').text()).toBe('1 registro')
  })

  it('should show a revoked acceptance with its own status and date', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [{ ...ACCEPTANCES[1], revoked_at: '2026-10-01T10:00:00' }],
    })

    const wrapper = await mountHistory()

    const status = wrapper.find('.status-pill')
    expect(status.text()).toBe('Revogado')
    expect(status.classes()).toContain('revoked')
    expect(wrapper.find('.revoked-at').text()).toBe('em 01/10/2026 às 10:00')
  })

  it('should offer reading and changing the acceptance in the row menu', async () => {
    const wrapper = await mountHistory()

    await wrapper.findAll('.action-menu-trigger')[0].trigger('click')

    expect(menuLabels(wrapper)).toEqual(['Ler termo', 'Alterar aceite'])
  })

  it('should only offer reading on a revoked acceptance', async () => {
    fetchLegalAcceptances.mockResolvedValue({
      count: 1,
      results: [{ ...ACCEPTANCES[1], revoked_at: '2026-10-01T10:00:00' }],
    })
    const wrapper = await mountHistory()

    await wrapper.find('.action-menu-trigger').trigger('click')

    expect(menuLabels(wrapper)).toEqual(['Ler termo'])
  })

  it('should open the text of the accepted version with the decisions of the user', async () => {
    fetchLegalVersion.mockResolvedValue({
      id: 3,
      version: 1,
      summary: 'Declaração do titular.',
      clauses: [{ id: 5, position: 1, title: 'Comunicados', body: 'Texto.', is_required: false }],
    })
    const wrapper = await mountHistory()

    await chooseAction(wrapper, 'Termo de Consentimento', 'Ler termo')
    await flushPromises()

    const dialog = wrapper.find('[role="dialog"]')
    expect(fetchLegalVersion).toHaveBeenCalledWith(3)
    expect(dialog.find('h2').text()).toBe('Termo de Consentimento para Uso de Dados Pessoais')
    expect(dialog.text()).toContain('Comunicados')
    expect(dialog.text()).toContain('Aceita')
  })

  it('should revoke an acceptance in force from "Alterar aceite"', async () => {
    revokeLegalAcceptance.mockResolvedValue({
      ...ACCEPTANCES[1],
      revoked_at: '2026-10-15T10:00:00',
    })
    const wrapper = await mountHistory()

    await chooseAction(wrapper, 'Termos de Uso', 'Alterar aceite')
    const dialog = wrapper.find('[role="alertdialog"]')
    const message = dialog.text()
    await dialog.findAll('button')[1].trigger('click')
    await flushPromises()

    expect(message).toContain('Revogar aceite')
    expect(message).toContain('pode aceitar o termo de novo')
    expect(revokeLegalAcceptance).toHaveBeenCalledWith(2)
    expect(rowOf(wrapper, 'Termos de Uso').find('.status-pill').text()).toBe('Revogado')
  })

  it('should accept a term that was not accepted from "Alterar aceite"', async () => {
    fetchLegalDocuments.mockResolvedValue({ count: 1, results: [NEW_POLICY] })
    acceptLegalTerms.mockResolvedValue({
      id: 9,
      accepted_at: '2026-10-15T11:00:00',
      revoked_at: null,
      document: { slug: NEW_POLICY.slug, title: NEW_POLICY.title },
      version: { id: 12, version: 1 },
      consents: [{ clause_id: 30, is_required: true, accepted: true }],
    })
    const wrapper = await mountHistory()

    await chooseAction(wrapper, 'Política de Cookies', 'Alterar aceite')
    const dialog = wrapper.find('[role="alertdialog"]')
    const message = dialog.text()
    await dialog.findAll('button')[1].trigger('click')
    await flushPromises()

    expect(message).toContain('todas as cláusulas desta versão')
    expect(acceptLegalTerms).toHaveBeenCalledWith({
      versionId: 12,
      consents: [{ clause_id: 30, accepted: true }],
    })
    expect(rowOf(wrapper, 'Política de Cookies').find('.status-pill').text()).toBe('Aceito')
    expect(wrapper.find('.count-pill').text()).toBe('3 registros')
  })

  it('should do nothing when the change is cancelled', async () => {
    const wrapper = await mountHistory()

    await chooseAction(wrapper, 'Termos de Uso', 'Alterar aceite')
    await wrapper.find('[role="alertdialog"]').findAll('button')[0].trigger('click')

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(revokeLegalAcceptance).not.toHaveBeenCalled()
  })

  it('should say it is loading while the history is requested', async () => {
    fetchLegalAcceptances.mockReturnValue(deferred().promise)

    const wrapper = await mountHistory()

    expect(wrapper.find('[role="status"]').text()).toBe('Carregando histórico...')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('should say when there is nothing to show', async () => {
    fetchLegalAcceptances.mockResolvedValue({ count: 0, results: [] })

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain('Nenhum termo disponível nem aceite registrado')
    expect(wrapper.find('.count-pill').text()).toBe('0 registros')
  })

  it('should explain a failure and load again on retry', async () => {
    fetchLegalAcceptances.mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountHistory()
    const alert = wrapper.find('[role="alert"]').text()

    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(alert).toContain('Não foi possível carregar o histórico de termos.')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('should keep the audit note visible', async () => {
    const wrapper = await mountHistory()

    expect(wrapper.find('.audit-note').text()).toContain(
      'Registros de aceite são mantidos para fins de auditoria',
    )
  })
})
