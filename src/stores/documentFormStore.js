import { defineStore } from 'pinia'
import { listProjetos } from '../api/projetos'
import { listDisciplinas } from '../api/disciplinas'
import { buildDocumentCode, INITIAL_REVISION } from '../utils/documentCode'
import { disciplinaSigla, findTipo } from '../utils/documentCatalog'
import { validateDocumentForm } from '../utils/validators'

/** Steps of the "Fazer upload de arquivo" flow. This store covers step 2. */
export const STEPS = [
  { number: 1, title: 'Upload', description: 'Arquivos do projeto' },
  { number: 2, title: 'Metadados', description: 'Definição de atributos' },
  { number: 3, title: 'Confirmação', description: 'Revisão e envio final' },
]

export const METADATA_STEP = 2

export function emptyForm(responsavel = '') {
  return {
    titulo: '',
    projetoId: '',
    disciplinaId: '',
    tipoDocumento: '',
    descricao: '',
    responsavel,
    areas: [],
    confidencialidade: 'publico',
    revisao: INITIAL_REVISION,
  }
}

/**
 * State of the metadata form (step 2). Keeping it in a store lets the other
 * steps of the flow (upload and confirmation, separate tasks) read and keep
 * what the user filled in without losing progress.
 */
export const useDocumentFormStore = defineStore('documentForm', {
  state: () => ({
    form: emptyForm(),
    projetos: [],
    disciplinas: [],
    catalogsLoading: false,
    catalogsError: null,
  }),

  getters: {
    selectedProjeto: (state) =>
      state.projetos.find((p) => String(p.id) === String(state.form.projetoId)) ?? null,
    selectedDisciplina: (state) =>
      state.disciplinas.find((d) => String(d.id) === String(state.form.disciplinaId)) ?? null,
    selectedTipo: (state) => findTipo(state.form.tipoDocumento),
    codigoPreview() {
      return buildDocumentCode({
        projeto: this.selectedProjeto?.codigo,
        disciplina: disciplinaSigla(this.selectedDisciplina),
        tipo: this.selectedTipo?.sigla,
        revisao: this.form.revisao,
      })
    },
    errors: (state) => validateDocumentForm(state.form),
    isValid() {
      return Object.keys(this.errors).length === 0
    },
  },

  actions: {
    async loadCatalogs() {
      this.catalogsLoading = true
      this.catalogsError = null
      try {
        const [projetos, disciplinas] = await Promise.all([listProjetos(), listDisciplinas()])
        this.projetos = Array.isArray(projetos) ? projetos : []
        this.disciplinas = Array.isArray(disciplinas) ? disciplinas : []
      } catch (error) {
        this.catalogsError = error.message || 'Não foi possível carregar as listas do formulário.'
      } finally {
        this.catalogsLoading = false
      }
    },

    /** Pre-fill "Responsável/Autor" with the logged-in user (still editable). */
    setDefaultResponsavel(nome) {
      if (!this.form.responsavel && nome) this.form.responsavel = nome
    },

    reset(responsavel = '') {
      this.form = emptyForm(responsavel)
    },
  },
})
