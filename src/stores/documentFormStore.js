import { defineStore } from 'pinia'
import { listProjects } from '../api/projects'
import { listDisciplines } from '../api/disciplines'
import { buildDocumentCode, INITIAL_REVISION } from '../utils/documentCode'
import { findDocumentType } from '../utils/documentCatalog'
import { validateDocumentForm } from '../utils/validators'

export function emptyForm(author = '') {
  return {
    title: '',
    projectId: '',
    disciplineId: '',
    documentType: '',
    description: '',
    author,
    areas: [],
    confidentiality: 'public',
    revision: INITIAL_REVISION,
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
    projects: [],
    disciplines: [],
    catalogsLoading: false,
    catalogsError: null,
  }),

  getters: {
    selectedProject: (state) =>
      state.projects.find((p) => String(p.id) === String(state.form.projectId)) ?? null,
    selectedDiscipline: (state) =>
      state.disciplines.find((d) => String(d.id) === String(state.form.disciplineId)) ?? null,
    selectedDocumentType: (state) => findDocumentType(state.form.documentType),
    codePreview() {
      return buildDocumentCode({
        project: this.selectedProject?.code,
        discipline: this.selectedDiscipline?.acronym,
        type: this.selectedDocumentType?.acronym,
        revision: this.form.revision,
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
        const [projects, disciplines] = await Promise.all([listProjects(), listDisciplines()])
        this.projects = Array.isArray(projects) ? projects : []
        this.disciplines = Array.isArray(disciplines) ? disciplines : []
      } catch (error) {
        this.catalogsError = error.message || 'Não foi possível carregar as listas do formulário.'
      } finally {
        this.catalogsLoading = false
      }
    },

    /** Pre-fill "Responsável/Autor" with the logged-in user (required, still editable). */
    setDefaultAuthor(name) {
      if (!this.form.author && name) this.form.author = name
    },

    reset(author = '') {
      this.form = emptyForm(author)
    },
  },
})
