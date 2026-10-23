import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentUploadView from '../../src/views/document/components/DocumentUpload.vue'
import { useUploadStore } from '../../src/stores/uploadStore'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../src/api/documents', () => ({ uploadDocument: vi.fn() }))

const SENT = [{ id: 'up-1', name: 'relatorio.pdf', size: 13, typeLabel: 'Memorial' }]
const SENT_MANY = [
  { id: 'up-1', name: 'relatorio.pdf', size: 13, typeLabel: 'Memorial' },
  { id: 'up-2', name: 'planta.pdf', size: 20, typeLabel: 'Desenho' },
  { id: 'up-3', name: 'foto.png', size: 30, typeLabel: 'Imagem' },
]

function findButton(wrapper, label) {
  return wrapper.findAll('button').find((button) => button.text().includes(label))
}

function listedNames(wrapper) {
  return wrapper.findAll('tbody tr').map((row) => row.find('.cell-name').text())
}

async function mountWithSentFiles(documents = SENT_MANY) {
  useUploadStore().setUploadedDocuments(documents)
  const wrapper = mount(DocumentUploadView)
  await flushPromises()
  return wrapper
}

describe('DocumentUploadView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should show the files already sent when coming back from the metadata step', async () => {
    useUploadStore().setUploadedDocuments(SENT)
    const wrapper = mount(DocumentUploadView)
    await flushPromises()
    expect(wrapper.text()).toContain('relatorio.pdf')
    expect(wrapper.text()).toContain('Concluído')
    expect(
      wrapper
        .findAll('button')
        .find((b) => b.text() === 'Próximo Passo')
        .attributes('disabled'),
    ).toBeUndefined()
  })

  it('should start with an empty queue when nothing was sent before', () => {
    const wrapper = mount(DocumentUploadView)
    expect(wrapper.text()).not.toContain('Fila de Carregamento')
    expect(
      wrapper
        .findAll('button')
        .find((b) => b.text() === 'Próximo Passo')
        .attributes('disabled'),
    ).toBeDefined()
  })

  it('should clear the queue and the store when clicking Limpar', async () => {
    const store = useUploadStore()
    store.setUploadedDocuments(SENT)
    const wrapper = mount(DocumentUploadView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Limpar')
      .trigger('click')
    expect(wrapper.text()).not.toContain('relatorio.pdf')
    expect(store.uploadedDocuments).toEqual([])
  })

  it('should navigate to the metadata step with the sent files when clicking next', async () => {
    useUploadStore().setUploadedDocuments(SENT)
    const wrapper = mount(DocumentUploadView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Próximo Passo')
      .trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'document-metadata' })
    expect(useUploadStore().uploadedDocuments).toEqual(SENT)
  })

  it('should show a checkbox next to each listed file', async () => {
    const wrapper = await mountWithSentFiles()

    expect(wrapper.findAll('tbody input[type="checkbox"]')).toHaveLength(3)
    expect(wrapper.find('[aria-label="Selecionar planta.pdf"]').exists()).toBe(true)
  })

  it('should not allow removing when no file is selected', async () => {
    const wrapper = await mountWithSentFiles()

    const removeButton = findButton(wrapper, 'Excluir selecionados')
    await removeButton.trigger('click')

    expect(removeButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('should remove only the selected file after confirmation', async () => {
    const wrapper = await mountWithSentFiles()

    await wrapper.find('[aria-label="Selecionar planta.pdf"]').setValue(true)
    expect(wrapper.text()).toContain('1 selecionado')
    await findButton(wrapper, 'Excluir selecionados').trigger('click')
    const dialog = wrapper.find('[role="alertdialog"]')
    expect(dialog.text()).toContain('Excluir arquivo?')
    expect(dialog.text()).toContain('planta.pdf')

    await findButton(dialog, 'Excluir').trigger('click')

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(listedNames(wrapper)).toEqual(['relatorio.pdf', 'foto.png'])
    expect(useUploadStore().uploadedDocuments.map((document) => document.id)).toEqual([
      'up-1',
      'up-3',
    ])
  })

  it('should remove several selected files in the same operation', async () => {
    const wrapper = await mountWithSentFiles()

    await wrapper.find('[aria-label="Selecionar relatorio.pdf"]').setValue(true)
    await wrapper.find('[aria-label="Selecionar foto.png"]').setValue(true)
    await findButton(wrapper, 'Excluir selecionados').trigger('click')
    const dialog = wrapper.find('[role="alertdialog"]')
    expect(dialog.text()).toContain('Excluir 2 arquivos?')

    await findButton(dialog, 'Excluir').trigger('click')

    expect(listedNames(wrapper)).toEqual(['planta.pdf'])
    expect(wrapper.text()).toContain('Fila de Carregamento (1 arquivos)')
    expect(wrapper.text()).toContain('0 selecionados')
  })

  it('should select and remove every file at once', async () => {
    const wrapper = await mountWithSentFiles()

    await wrapper.find('.selection-all input').setValue(true)
    await findButton(wrapper, 'Excluir selecionados').trigger('click')
    await findButton(wrapper.find('[role="alertdialog"]'), 'Excluir').trigger('click')

    expect(wrapper.text()).not.toContain('Fila de Carregamento')
    expect(useUploadStore().uploadedDocuments).toEqual([])
    expect(findButton(wrapper, 'Próximo Passo').attributes('disabled')).toBeDefined()
  })

  it('should keep every file and the selection when the removal is cancelled', async () => {
    const wrapper = await mountWithSentFiles()

    await wrapper.find('[aria-label="Selecionar planta.pdf"]').setValue(true)
    await findButton(wrapper, 'Excluir selecionados').trigger('click')
    await findButton(wrapper.find('[role="alertdialog"]'), 'Cancelar').trigger('click')

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(listedNames(wrapper)).toEqual(['relatorio.pdf', 'planta.pdf', 'foto.png'])
    expect(wrapper.find('[aria-label="Selecionar planta.pdf"]').element.checked).toBe(true)
    expect(useUploadStore().uploadedDocuments).toEqual(SENT_MANY)
  })

  it('should send only the remaining files to the metadata step', async () => {
    const wrapper = await mountWithSentFiles()

    await wrapper.find('[aria-label="Selecionar relatorio.pdf"]').setValue(true)
    await findButton(wrapper, 'Excluir selecionados').trigger('click')
    await findButton(wrapper.find('[role="alertdialog"]'), 'Excluir').trigger('click')
    await findButton(wrapper, 'Próximo Passo').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'document-metadata' })
    expect(useUploadStore().uploadedDocuments.map((document) => document.name)).toEqual([
      'planta.pdf',
      'foto.png',
    ])
  })
})
