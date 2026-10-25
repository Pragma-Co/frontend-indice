import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/api/manager.js', () => ({
  REVISION_DECISIONS: { APPROVED: 'APPROVED', REJECTED: 'REJECTED' },
  submitRevisionDecision: vi.fn(),
}))
vi.mock('@/stores/authStore.js', () => ({
  useAuthStore: () => ({ currentUser: { id: 10, name: 'Thiago Serpa' } }),
}))
vi.mock('docx-preview', () => ({ renderAsync: vi.fn().mockResolvedValue(undefined) }))

import { submitRevisionDecision } from '@/api/manager.js'
import RevisionReviewModal from '@/views/manager/components/RevisionReviewModal.vue'

const VALID_OPINION = 'Furação diverge do ensaio de tração aprovado.'

function makeRevision(overrides = {}) {
  return {
    id: 91,
    code: 'AK-3100-EST-ESP-0001',
    title: 'Relatório de verificação estrutural do pilone',
    discipline: 'Estruturas',
    program: 'AK-3100',
    confidentiality: 'Confidencial',
    changeDescription:
      'Atualização das combinações de carga após revisão das condições de contorno.',
    fromRevision: 'REV01',
    toRevision: 'REV02',
    authorName: 'Marina Duarte',
    createdAt: '2026-09-26T14:32:00',
    files: [
      {
        id: 58,
        original_name: 'memorial_pilone_rev02.pdf',
        mime_type: 'application/pdf',
        size_bytes: 4404019,
      },
    ],
    ...overrides,
  }
}

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const mounted = []

function mountModal(revision = makeRevision()) {
  const wrapper = mount(RevisionReviewModal, {
    props: { revision },
    global: { stubs: { teleport: true } },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

function approveButton(wrapper) {
  return wrapper.find('button[data-decision="approve"]')
}

function rejectButton(wrapper) {
  return wrapper.find('button[data-decision="reject"]')
}

describe('RevisionReviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    submitRevisionDecision.mockResolvedValue({ id: 91, status: 'APPROVED' })
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('should open as a modal dialog identifying the revision under evaluation', () => {
    const wrapper = mountModal()

    const dialog = wrapper.find('[role="dialog"]')

    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.find('#revision-review-title').text()).toBe('Avaliar Solicitação de Revisão')
    expect(wrapper.find('.review-code').text()).toBe('AK-3100-EST-ESP-0001 (REV02)')
    expect(wrapper.find('.review-document-title').text()).toBe(
      'Relatório de verificação estrutural do pilone',
    )
    expect(wrapper.find('.review-submitted').text()).toBe(
      'Submetido por Marina Duarte em 26/09/2026 às 14:32',
    )
  })

  it('should show the submitted file in the viewer on the left column', () => {
    const wrapper = mountModal()

    const fileColumn = wrapper.find('.review-file')

    expect(fileColumn.find('.review-file-name').text()).toContain('memorial_pilone_rev02.pdf')
    expect(fileColumn.find('.review-file-name').text()).toContain('4.2 MB')
    expect(fileColumn.find('iframe').attributes('src')).toContain('/api/files/58/view?user_id=10')
    expect(fileColumn.find('button[aria-label="Aumentar zoom"]').exists()).toBe(true)
    expect(fileColumn.text()).toContain('Arquivo 1 de 1')
  })

  it('should show the metadata of the revision on the right column', () => {
    const wrapper = mountModal()

    const metadata = wrapper
      .findAll('.review-details .review-metadata div')
      .map((row) => [row.find('dt').text(), row.find('dd').text()])

    expect(metadata).toEqual([
      ['Disciplina', 'Estruturas'],
      ['Programa', 'AK-3100'],
      ['Nível', 'Confidencial'],
    ])
  })

  it('should show the justification of the author as static text', () => {
    const wrapper = mountModal()

    const justification = wrapper.find('.review-justification')

    expect(justification.element.tagName).toBe('P')
    expect(justification.text()).toBe(
      'Atualização das combinações de carga após revisão das condições de contorno.',
    )
  })

  it('should say when the author sent no justification', () => {
    const wrapper = mountModal(makeRevision({ changeDescription: '' }))

    expect(wrapper.find('.review-justification').text()).toBe(
      'O autor não informou uma justificativa.',
    )
  })

  it('should let the reviewer move between the files of the revision', async () => {
    const wrapper = mountModal(
      makeRevision({
        files: [
          { id: 58, original_name: 'memorial.pdf', mime_type: 'application/pdf', size_bytes: 10 },
          { id: 59, original_name: 'detalhe.png', mime_type: 'image/png', size_bytes: 20 },
        ],
      }),
    )
    const previousDisabled = wrapper.find('button[aria-label="Arquivo anterior"]').attributes()

    await wrapper.find('button[aria-label="Próximo arquivo"]').trigger('click')

    expect(previousDisabled.disabled).toBeDefined()
    expect(wrapper.text()).toContain('Arquivo 2 de 2')
    expect(wrapper.find('.review-file-name').text()).toContain('detalhe.png')
    expect(wrapper.find('img').attributes('src')).toBe('/api/files/59/view?user_id=10')
  })

  it('should approve the revision and report the decision', async () => {
    const revision = makeRevision()
    const wrapper = mountModal(revision)

    await wrapper.find('#revision-review-opinion').setValue(VALID_OPINION)
    await approveButton(wrapper).trigger('click')
    await flushPromises()

    expect(submitRevisionDecision).toHaveBeenCalledWith(91, {
      decision: 'APPROVED',
      justification: VALID_OPINION,
    })
    expect(wrapper.emitted('decided')).toEqual([
      [{ revision, decision: 'APPROVED', result: { id: 91, status: 'APPROVED' } }],
    ])
  })

  it('should refuse the revision with the technical opinion', async () => {
    submitRevisionDecision.mockResolvedValue({ id: 91, status: 'REJECTED' })
    const wrapper = mountModal()
    await wrapper.find('#revision-review-opinion').setValue(VALID_OPINION)

    await rejectButton(wrapper).trigger('click')
    await flushPromises()

    expect(submitRevisionDecision).toHaveBeenCalledWith(91, {
      decision: 'REJECTED',
      justification: VALID_OPINION,
    })
    expect(wrapper.emitted('decided')[0][0].decision).toBe('REJECTED')
  })

  it('should clear the opinion error while the reviewer types', async () => {
    const wrapper = mountModal()
    await rejectButton(wrapper).trigger('click')

    await wrapper.find('#revision-review-opinion').setValue('F')

    expect(wrapper.find('#revision-review-opinion-hint').text()).toBe(
      'Mínimo de 20 caracteres (1/20)',
    )
    expect(wrapper.find('.review-opinion-counter').text()).toBe('1/1000')
  })

  it('should confirm when the opinion reaches the minimum length', async () => {
    const wrapper = mountModal()
    await rejectButton(wrapper).trigger('click')

    await wrapper.find('#revision-review-opinion').setValue(VALID_OPINION)

    const hint = wrapper.find('#revision-review-opinion-hint')
    expect(hint.text()).toBe('✓ Requisito mínimo de 20 caracteres atendido')
    expect(hint.classes()).toContain('met')
  })

  it('should block both action buttons until the opinion reaches the minimum length', async () => {
    const wrapper = mountModal()

    expect(approveButton(wrapper).attributes('disabled')).toBeDefined()
    expect(rejectButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.find('#revision-review-opinion').setValue('F')

    expect(approveButton(wrapper).attributes('disabled')).toBeDefined()
    expect(rejectButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.find('#revision-review-opinion').setValue(VALID_OPINION)

    expect(approveButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(rejectButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('should block the actions while the decision is being sent', async () => {
    const pending = deferred()
    submitRevisionDecision.mockReturnValue(pending.promise)
    const wrapper = mountModal()

    await wrapper.find('#revision-review-opinion').setValue(VALID_OPINION)
    await approveButton(wrapper).trigger('click')
    await wrapper.find('button[aria-label="Fechar"]').trigger('click')

    expect(approveButton(wrapper).attributes('aria-busy')).toBe('true')
    expect(rejectButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.find('#revision-review-opinion').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('close')).toBeUndefined()
    pending.resolve({ id: 91 })
    await flushPromises()
  })

  it('should stay open and explain when the decision cannot be recorded', async () => {
    submitRevisionDecision.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }))
    const wrapper = mountModal()

    await wrapper.find('#revision-review-opinion').setValue(VALID_OPINION)
    await approveButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.find('.review-footer [role="alert"]').text()).toContain(
      'Não foi possível registrar a decisão',
    )
    expect(wrapper.emitted('decided')).toBeUndefined()
    expect(approveButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('should report a revision that was already decided by someone else', async () => {
    submitRevisionDecision.mockRejectedValue(
      Object.assign(new Error('conflict'), {
        status: 409,
        details: { error: 'RevisionAlreadyDecided' },
      }),
    )
    const wrapper = mountModal()

    await wrapper.find('#revision-review-opinion').setValue(VALID_OPINION)
    await approveButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('unavailable')).toEqual([
      ['Esta revisão já foi avaliada por outro gestor.'],
    ])
  })

  it('should explain what the approval does', () => {
    const wrapper = mountModal()

    expect(wrapper.find('.review-footer-note').text()).toBe(
      'A aprovação tornará esta revisão a versão vigente oficial do acervo.',
    )
  })

  it('should close on the close button, on Escape and on the backdrop', async () => {
    const wrapper = mountModal()

    await wrapper.find('button[aria-label="Fechar"]').trigger('click')
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await wrapper.find('.review-overlay').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(3)
  })

  it('should not close when the click happens inside the dialog', async () => {
    const wrapper = mountModal()

    await wrapper.find('.review-body').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('should take the focus and lock the page scroll while open', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const wrapper = mountModal()
    const whileOpen = {
      focused: document.activeElement === wrapper.find('[role="dialog"]').element,
      overflow: document.body.style.overflow,
    }
    wrapper.unmount()
    mounted.length = 0

    expect(whileOpen).toEqual({ focused: true, overflow: 'hidden' })
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })
})
