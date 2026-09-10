import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentUploadView from '../../src/views/DocumentUploadView.vue'
import { useUploadStore } from '../../src/stores/uploadStore'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../src/api/documents', () => ({ uploadDocument: vi.fn() }))

const SENT = [{ id: 'up-1', name: 'relatorio.pdf', size: 13, typeLabel: 'Memorial' }]

describe('DocumentUploadView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should show the files already sent when coming back from the metadata step', async () => {
    // Given
    useUploadStore().setUploadedDocuments(SENT)
    // When
    const wrapper = mount(DocumentUploadView)
    await flushPromises()
    // Then
    expect(wrapper.text()).toContain('relatorio.pdf')
    expect(wrapper.text()).toContain('Concluído')
    expect(wrapper.findAll('button').find((b) => b.text() === 'Próximo Passo').attributes('disabled')).toBeUndefined()
  })

  it('should start with an empty queue when nothing was sent before', () => {
    // When
    const wrapper = mount(DocumentUploadView)
    // Then
    expect(wrapper.text()).not.toContain('Fila de Carregamento')
    expect(wrapper.findAll('button').find((b) => b.text() === 'Próximo Passo').attributes('disabled')).toBeDefined()
  })

  it('should clear the queue and the store when clicking Limpar', async () => {
    // Given
    const store = useUploadStore()
    store.setUploadedDocuments(SENT)
    const wrapper = mount(DocumentUploadView)
    await flushPromises()
    // When
    await wrapper.findAll('button').find((b) => b.text() === 'Limpar').trigger('click')
    // Then
    expect(wrapper.text()).not.toContain('relatorio.pdf')
    expect(store.uploadedDocuments).toEqual([])
  })

  it('should navigate to the metadata step with the sent files when clicking next', async () => {
    // Given
    useUploadStore().setUploadedDocuments(SENT)
    const wrapper = mount(DocumentUploadView)
    await flushPromises()
    // When
    await wrapper.findAll('button').find((b) => b.text() === 'Próximo Passo').trigger('click')
    // Then
    expect(push).toHaveBeenCalledWith({ name: 'document-metadata' })
    expect(useUploadStore().uploadedDocuments).toEqual(SENT)
  })
})
