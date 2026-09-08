import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentUploadView from '../../src/views/DocumentUploadView.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

vi.mock('../../src/api/projetos', () => ({ listProjetos: vi.fn() }))
vi.mock('../../src/api/disciplinas', () => ({ listDisciplinas: vi.fn() }))

import { listProjetos } from '../../src/api/projetos'
import { listDisciplinas } from '../../src/api/disciplinas'

describe('DocumentUploadView', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    vi.clearAllMocks()
    listProjetos.mockResolvedValue([{ id: 1, codigo: 'PJT001', nome: 'Projeto Alfa' }])
    listDisciplinas.mockResolvedValue([{ id: 2, sigla: 'TUB', nome: 'Tubulação' }])
  })

  it('deve carregar as listas da API e preencher o responsável ao abrir', async () => {
    // When
    mount(DocumentUploadView)
    await flushPromises()
    // Then
    expect(listProjetos).toHaveBeenCalled()
    expect(listDisciplinas).toHaveBeenCalled()
    expect(store.form.responsavel).toBe('João Silva')
  })

  it('deve exibir a etapa de Metadados como a etapa atual', async () => {
    // When
    const wrapper = mount(DocumentUploadView)
    await flushPromises()
    // Then
    const current = wrapper.find('[aria-current="step"]')
    expect(current.text()).toContain('Metadados')
    expect(wrapper.text()).toContain('Informações do Documento')
    expect(wrapper.find('#projeto').text()).toContain('PJT001 - Projeto Alfa')
  })

  it('não deve recarregar as listas quando já estiverem em memória', async () => {
    // Given
    store.projetos = [{ id: 1, codigo: 'PJT001', nome: 'Projeto Alfa' }]
    store.disciplinas = [{ id: 2, sigla: 'TUB', nome: 'Tubulação' }]
    // When
    mount(DocumentUploadView)
    await flushPromises()
    // Then
    expect(listProjetos).not.toHaveBeenCalled()
  })
})
