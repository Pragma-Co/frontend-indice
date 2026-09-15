import { defineStore } from 'pinia'
import { listProjects } from '../api/projects'
import { listDisciplines } from '../api/disciplines'
import { buildDocumentCode, INITIAL_VERSION, revisionLabel } from '../utils/documentCode'
import { DEFAULT_CONFIDENTIALITY, findDocumentType } from '../utils/documentCatalog'
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
    confidentiality: DEFAULT_CONFIDENTIALITY,
    version: INITIAL_VERSION,
  }
}

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
    revision: (state) => revisionLabel(state.form.version),
    codePreview() {
      return buildDocumentCode({
        project: this.selectedProject?.code,
        discipline: this.selectedDiscipline?.code,
        type: this.selectedDocumentType?.code,
        version: this.form.version,
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

    setDefaultAuthor(name) {
      if (!this.form.author && name) this.form.author = name
    },

    reset(author = '') {
      this.form = emptyForm(author)
    },
  },
})
