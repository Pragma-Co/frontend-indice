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
    areas: [], // area codes
    confidentiality: DEFAULT_CONFIDENTIALITY,
    version: INITIAL_VERSION, // shown as REV01; sent as an integer on submission
  }
}

// Fields the AI suggestion flow is allowed to pre-fill.
const SUGGESTIBLE_FIELDS = ['title', 'description', 'disciplineId', 'documentType', 'areas']

/**
 * State of the metadata form (step 2), also read by the confirmation (step 3).
 * Keeping it in a store lets the user move between the steps without losing
 * what was filled in. The submission fired by "Publicar" is a separate task.
 */
export const useDocumentFormStore = defineStore('documentForm', {
  state: () => ({
    form: emptyForm(),
    projects: [],
    disciplines: [],
    catalogsLoading: false,
    catalogsError: null,
    publishing: false, // drives the loading state of "Publicar"; set by the submission task
    // Fields currently holding a value proposed by the AI and not yet edited by the user.
    suggestedFields: {},
  }),

  getters: {
    selectedProject: (state) =>
      state.projects.find((p) => String(p.id) === String(state.form.projectId)) ?? null,
    selectedDiscipline: (state) =>
      state.disciplines.find((d) => String(d.id) === String(state.form.disciplineId)) ?? null,
    selectedDocumentType: (state) => findDocumentType(state.form.documentType),
    revision: (state) => revisionLabel(state.form.version),
    isFieldSuggested: (state) => (field) => Boolean(state.suggestedFields[field]),
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

    /** Pre-fill "Responsável/Autor" with the logged-in user (required, still editable). */
    setDefaultAuthor(name) {
      if (!this.form.author && name) this.form.author = name
    },

    /** Pre-fills the given fields from an AI suggestion and flags them as such until edited. */
    applySuggestions(suggestions = {}) {
      for (const [field, value] of Object.entries(suggestions)) {
        if (!SUGGESTIBLE_FIELDS.includes(field)) continue
        this.form[field] = value
        this.suggestedFields[field] = true
      }
    },

    /** Drops the "suggested" flag for a field once the user edits it. */
    clearSuggestion(field) {
      if (field in this.suggestedFields) delete this.suggestedFields[field]
    },

    reset(author = '') {
      this.form = emptyForm(author)
      this.publishing = false
      this.suggestedFields = {}
    },
  },
})
