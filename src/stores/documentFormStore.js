import { defineStore } from 'pinia'
import { listProjects } from '../api/projects'
import { listDisciplines } from '../api/disciplines'
import { createDocument, toDocumentPayload, listDocumentTypes } from '../api/documents'
import { useAuthStore } from './authStore'
import { buildDocumentCode, INITIAL_VERSION, revisionLabel } from '../utils/documentCode'
import { DEFAULT_CONFIDENTIALITY } from '../utils/documentCatalog'
import { mapServerErrors, publishErrorMessage } from '../utils/publishErrors'
import { validateDocumentForm } from '../utils/validators'

const catalogRequests = new WeakMap()

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

const SUGGESTIBLE_FIELDS = [
  'title',
  'description',
  'projectId',
  'disciplineId',
  'documentType',
  'areas',
]

function isEmptySuggestion(value) {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  return String(value).trim() === ''
}

export const useDocumentFormStore = defineStore('documentForm', {
  state: () => ({
    form: emptyForm(),
    projects: [],
    disciplines: [],
    documentTypes: [],
    catalogsLoading: false,
    catalogsError: null,
    publishing: false,
    publishError: null,
    serverErrors: {},
    suggestedFields: {},
  }),

  getters: {
    selectedProject: (state) =>
      state.projects.find((p) => String(p.id) === String(state.form.projectId)) ?? null,
    selectedDiscipline: (state) =>
      state.disciplines.find((d) => String(d.id) === String(state.form.disciplineId)) ?? null,
    projectsCarryDisciplines: (state) =>
      state.projects.some((project) => Array.isArray(project.discipline_ids)),
    availableDisciplines() {
      if (!this.projectsCarryDisciplines) return this.disciplines
      const ids = this.selectedProject?.discipline_ids ?? []
      return this.disciplines.filter((d) => ids.includes(d.id))
    },
    selectedDocumentType: (state) =>
      state.documentTypes.find((t) => t.id === state.form.documentType) ?? null,
    revision: (state) => revisionLabel(state.form.version),
    isFieldSuggested: (state) => (field) => Boolean(state.suggestedFields[field]),
    codePreview() {
      return buildDocumentCode({
        project: this.selectedProject?.code,
        discipline: this.selectedDiscipline?.code,
        type: this.selectedDocumentType?.code,
      })
    },
    errors: (state) => validateDocumentForm(state.form),
    isValid() {
      return Object.keys(this.errors).length === 0
    },
  },

  actions: {
    async loadCatalogs() {
      const pendingRequest = catalogRequests.get(this)
      if (pendingRequest) return pendingRequest

      this.catalogsLoading = true
      this.catalogsError = null
      const request = Promise.all([listProjects(), listDisciplines(), listDocumentTypes()])
        .then(([projects, disciplines, document_types]) => {
          this.projects = Array.isArray(projects) ? projects : []
          this.disciplines = Array.isArray(disciplines) ? disciplines : []
          this.documentTypes = Array.isArray(document_types) ? document_types : []
        })
        .catch((error) => {
          this.catalogsError = error.message || 'Não foi possível carregar as listas do formulário.'
        })
        .finally(() => {
          this.catalogsLoading = false
          catalogRequests.delete(this)
        })
      catalogRequests.set(this, request)
      return request
    },

    selectProject(projectId) {
      this.form.projectId = projectId
      this.clearSuggestion('projectId')
      const stillValid = this.availableDisciplines.some(
        (d) => String(d.id) === String(this.form.disciplineId),
      )
      if (!stillValid) {
        this.form.disciplineId = ''
        this.clearSuggestion('disciplineId')
      }
    },

    setDefaultAuthor(name) {
      if (!this.form.author && name) this.form.author = name
    },

    clearServerError(field) {
      if (!(field in this.serverErrors)) return
      const rest = { ...this.serverErrors }
      delete rest[field]
      this.serverErrors = rest
    },

    applySuggestions(suggestions = {}) {
      for (const [field, value] of Object.entries(suggestions)) {
        if (!SUGGESTIBLE_FIELDS.includes(field)) continue
        if (isEmptySuggestion(value)) continue
        if (
          field === 'projectId' &&
          !this.projects.some((project) => String(project.id) === String(value))
        ) {
          continue
        }
        if (
          field === 'disciplineId' &&
          !this.availableDisciplines.some((d) => String(d.id) === String(value))
        ) {
          continue
        }
        if (field === 'projectId') this.selectProject(value)
        else this.form[field] = value
        this.suggestedFields[field] = true
      }
    },

    clearSuggestion(field) {
      if (field in this.suggestedFields) delete this.suggestedFields[field]
    },

    async publish(tempFileId) {
      const auth = useAuthStore()
      this.publishing = true
      this.publishError = null
      this.serverErrors = {}
      try {
        const payload = toDocumentPayload(this.form, {
          tempFileId,
          responsibleId: auth.currentUser?.id ?? null,
          userId: auth.currentUser?.id ?? null,
        })
        const document = await createDocument(payload)
        this.form = emptyForm(this.form.author)
        return document
      } catch (error) {
        this.publishError = publishErrorMessage(error)
        if (error?.status === 400) this.serverErrors = mapServerErrors(error.details?.errors)
        throw error
      } finally {
        this.publishing = false
      }
    },

    reset(author = '') {
      this.form = emptyForm(author)
      this.publishing = false
      this.publishError = null
      this.serverErrors = {}
      this.suggestedFields = {}
    },
  },
})
