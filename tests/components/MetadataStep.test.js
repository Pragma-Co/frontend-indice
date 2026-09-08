import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MetadataStep from '../../src/components/document-upload/MetadataStep.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

vi.mock('../../src/api/projetos', () => ({ listProjetos: vi.fn() }))
vi.mock('../../src/api/disciplinas', () => ({ listDisciplinas: vi.fn() }))

import { listProjetos } from '../../src/api/projetos'
import { listDisciplinas } from '../../src/api/disciplinas'

const PROJETOS = [{ id: 1, codigo: 'PJT001', nome: 'Projeto Alfa' }]
const DISCIPLINAS = [{ id: 2, sigla: 'TUB', nome: 'Tubulação' }]

function nextButton(wrapper) {
  return wrapper.findAll('button').find((b) => b.text() === 'Próximo Passo')
}

describe('MetadataStep', () => {
  let store

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    listProjetos.mockResolvedValue(PROJETOS)
    listDisciplinas.mockResolvedValue(DISCIPLINAS)
    await store.loadCatalogs()
  })

  it('deve popular os selects de projeto e disciplina com os dados da API', () => {
    // When
    const wrapper = mount(MetadataStep)
    // Then
    expect(wrapper.find('#projeto').text()).toContain('PJT001 - Projeto Alfa')
    expect(wrapper.find('#disciplina').text()).toContain('TUB - Tubulação')
  })

  it('deve exibir código e revisão como somente leitura', () => {
    // When
    const wrapper = mount(MetadataStep)
    // Then
    expect(wrapper.find('#codigo').attributes('readonly')).toBeDefined()
    expect(wrapper.find('#revisao').attributes('readonly')).toBeDefined()
    expect(wrapper.find('#revisao').element.value).toBe('REV01')
  })

  it('deve manter "Próximo Passo" bloqueado enquanto campos obrigatórios estiverem vazios', () => {
    // When
    const wrapper = mount(MetadataStep)
    // Then
    expect(nextButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('deve gerar o código e liberar o avanço quando o usuário preencher os campos obrigatórios', async () => {
    // Given
    const wrapper = mount(MetadataStep)
    // When
    await wrapper.find('#projeto').setValue(1)
    await wrapper.find('#disciplina').setValue(2)
    await wrapper.find('#tipo').setValue('REV')
    await wrapper.find('#titulo').setValue('Relatório de ensaio')
    await wrapper.find('#areas').setValue('Petroquímica')
    // Then
    expect(wrapper.find('#codigo').element.value).toBe('PJT001-TUB-REV-REV01')
    expect(wrapper.text()).toContain('PETROQUÍMICA')
    expect(nextButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('deve emitir next ao submeter o formulário válido', async () => {
    // Given
    const wrapper = mount(MetadataStep)
    await wrapper.find('#projeto').setValue(1)
    await wrapper.find('#disciplina').setValue(2)
    await wrapper.find('#tipo').setValue('REV')
    await wrapper.find('#titulo').setValue('Relatório de ensaio')
    await wrapper.find('#areas').setValue('Petroquímica')
    // When
    await wrapper.find('form').trigger('submit')
    // Then
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('não deve emitir next ao submeter o formulário incompleto', async () => {
    // Given
    const wrapper = mount(MetadataStep)
    // When
    await wrapper.find('form').trigger('submit')
    // Then
    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it('deve remover uma área ao clicar no × da tag', async () => {
    // Given
    store.form.areas = ['Petroquímica', 'Naval']
    const wrapper = mount(MetadataStep)
    // When
    await wrapper.find('button[aria-label="Remover Naval"]').trigger('click')
    // Then
    expect(store.form.areas).toEqual(['Petroquímica'])
  })

  it('deve pré-preencher o responsável com o usuário logado e permitir edição', async () => {
    // Given
    store.setDefaultResponsavel('João Silva')
    const wrapper = mount(MetadataStep)
    expect(wrapper.find('#responsavel').element.value).toBe('João Silva')
    // When
    await wrapper.find('#responsavel').setValue('Maria Souza')
    // Then
    expect(store.form.responsavel).toBe('Maria Souza')
  })

  it('deve exibir mensagem de erro quando as listas não carregarem', async () => {
    // Given
    store.catalogsError = 'Não foi possível conectar ao servidor.'
    // When
    const wrapper = mount(MetadataStep)
    // Then
    expect(wrapper.find('[role="alert"]').text()).toContain('Não foi possível conectar ao servidor.')
  })
})
