import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'

const parentDocument = ref(null)
const loading = ref(false)
const loadError = ref('')
const justification = ref('')
const submitting = ref(false)
const queue = ref([])
const revisionBlocked = ref(false)
const revisionBlockedMessage = ref('')
const canSubmit = ref(false)
const formValid = ref(false)
const hasFile = ref(false)
const justificationValid = ref(false)

const addFiles = vi.fn()
const removeFile = vi.fn()
const resolveDuplicate = vi.fn()
const goToDocumentList = vi.fn()
const submit = vi.fn()

vi.mock('@/views/document/composables/useNewRevision.js', () => ({
  JUSTIFICATION_MIN_LENGTH: 20,
  JUSTIFICATION_MAX_LENGTH: 255,
  useNewRevision: () => ({
    parentDocument,
    loading,
    loadError,
    justification,
    submitting,
    queue,
    acceptedExtensions: ['pdf', 'docx'],
    currentRevisionLabel: ref('REV01'),
    nextRevisionLabel: ref('REV02'),
    revisionBlocked,
    revisionBlockedMessage,
    activeDuplicate: computed(() => queue.value.find((item) => item.status === 'duplicate')),
    totalSize: computed(() => queue.value.reduce((total, item) => total + item.size, 0)),
    hasFile,
    justificationLength: computed(() => justification.value.trim().length),
    justificationValid,
    formValid,
    canSubmit,
    addFiles,
    removeFile,
    resolveDuplicate,
    goToDocumentList,
    submit,
  }),
}))

import NewRevisionView from '@/views/document/NewRevisionView.vue'

function makeDocument() {
  return {
    id: 23,
    code: 'AK-3100-EST-ESP-0001',
    title: 'Relatório de verificação estrutural do pilone',
    confidentiality_level: 'CONFIDENTIAL',
    project: { id: 1, code: 'A0R-2100', name: 'Programa A0R' },
    discipline: { id: 2, code: 'EST', name: 'Estruturas' },
    revision: { id: 5, version: 1, status: 'APPROVED' },
  }
}

function findButton(wrapper, label) {
  return wrapper.findAll('button').find((button) => button.text().includes(label))
}

describe('NewRevisionView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    parentDocument.value = makeDocument()
    loading.value = false
    loadError.value = ''
    justification.value = ''
    submitting.value = false
    queue.value = []
    revisionBlocked.value = false
    revisionBlockedMessage.value = ''
    canSubmit.value = false
    formValid.value = false
    hasFile.value = false
    justificationValid.value = false
  })

  it('should show the parent document identifier as read-only information', () => {
    const wrapper = mount(NewRevisionView)

    const header = wrapper.find('.document-header')
    expect(header.text()).toContain('AK-3100-EST-ESP-0001')
    expect(header.text()).toContain('Relatório de verificação estrutural do pilone')
    expect(header.text()).toContain('Confidencial')
    expect(header.text()).toContain('Programa A0R-2100 • EST - Estruturas')
    expect(header.find('input, select, textarea').exists()).toBe(false)
  })

  it('should indicate the next revision number', () => {
    const wrapper = mount(NewRevisionView)

    const notice = wrapper.find('.availability-notice').text()
    expect(notice).toContain('REV01')
    expect(notice).toContain('REV02')
  })

  it('should keep the submit button blocked until the file and the justification are filled', async () => {
    const wrapper = mount(NewRevisionView)
    const blockedBefore = findButton(wrapper, 'Submeter análise').attributes('disabled')

    canSubmit.value = true
    formValid.value = true
    await wrapper.vm.$nextTick()

    expect(blockedBefore).toBeDefined()
    expect(findButton(wrapper, 'Submeter análise').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('Arquivo e justificativa válidos')
  })

  it('should tell which requirement is still missing', async () => {
    const wrapper = mount(NewRevisionView)
    const withoutFile = wrapper.find('.submit-status').text()

    hasFile.value = true
    await wrapper.vm.$nextTick()

    expect(withoutFile).toBe('Anexe ao menos um arquivo')
    expect(wrapper.find('.submit-status').text()).toBe('Preencha a justificativa')
  })

  it('should submit the revision from the submit button', async () => {
    canSubmit.value = true
    const wrapper = mount(NewRevisionView)

    await findButton(wrapper, 'Submeter análise').trigger('click')

    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('should return to the list from the cancel button', async () => {
    const wrapper = mount(NewRevisionView)

    await findButton(wrapper, 'Cancelar e Voltar').trigger('click')

    expect(goToDocumentList).toHaveBeenCalledTimes(1)
  })

  it('should write the justification and count its characters', async () => {
    const wrapper = mount(NewRevisionView)

    await wrapper.find('#revision-justification').setValue('Nova memória de cálculo')

    expect(justification.value).toBe('Nova memória de cálculo')
    expect(wrapper.find('.justification-counter').text()).toBe('23/255')
    expect(wrapper.find('#revision-justification').attributes('maxlength')).toBe('255')
  })

  it('should list the attached files and remove one on request', async () => {
    queue.value = [{ id: 7, name: 'relatorio_rev02.pdf', size: 2048, status: 'success' }]
    const wrapper = mount(NewRevisionView)

    await wrapper.find('[aria-label="Remover relatorio_rev02.pdf"]').trigger('click')

    expect(wrapper.find('.file-row').text()).toContain('relatorio_rev02.pdf')
    expect(wrapper.find('.file-row').text()).toContain('Pronto para envio')
    expect(wrapper.find('.section-summary').text()).toContain('1 arquivo')
    expect(removeFile).toHaveBeenCalledWith(7)
  })

  it('should add the files selected in the dropzone', async () => {
    const wrapper = mount(NewRevisionView)
    const files = [{ name: 'relatorio_rev02.pdf', size: 2048 }]

    await wrapper.findComponent({ name: 'FileDropzone' }).vm.$emit('files-selected', files)

    expect(addFiles).toHaveBeenCalledWith(files)
  })

  it('should replace the form with the reason when the document cannot be loaded', () => {
    loadError.value = 'Documento não encontrado.'
    parentDocument.value = null

    const wrapper = mount(NewRevisionView)

    expect(wrapper.find('[role="alert"]').text()).toBe('Documento não encontrado.')
    expect(wrapper.find('#revision-justification').exists()).toBe(false)
    expect(findButton(wrapper, 'Voltar para a listagem')).toBeDefined()
  })

  it('should not offer the form when the document already has a revision under review', () => {
    revisionBlocked.value = true
    revisionBlockedMessage.value = 'Este documento já possui uma revisão em andamento.'

    const wrapper = mount(NewRevisionView)

    expect(wrapper.find('[role="alert"]').text()).toContain('revisão em andamento')
    expect(wrapper.find('#revision-justification').exists()).toBe(false)
  })

  it('should not offer the form when the user has no permission to see the document', () => {
    revisionBlocked.value = true
    revisionBlockedMessage.value = 'Você não tem permissão para criar uma revisão deste documento.'

    const wrapper = mount(NewRevisionView)

    expect(wrapper.find('[role="alert"]').text()).toContain('não tem permissão')
    expect(wrapper.find('#revision-justification').exists()).toBe(false)
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    expect(findButton(wrapper, 'Voltar para a listagem')).toBeDefined()
  })
})
