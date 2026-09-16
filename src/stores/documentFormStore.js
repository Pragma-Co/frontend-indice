import { defineStore } from 'pinia'
import { listProjects } from '../api/projects'
import { listDisciplines } from '../api/disciplines'
import { createDocument, toDocumentPayload } from '../api/documents'
import { useAuthStore } from './authStore'
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

const FORM_FIELD_BY_PAYLOAD_KEY = {
  temp_file_id: 'tempFileId',
  title: 'title',
  description: 'description',
  project_id: 'projectId',
  discipline_id: 'disciplineId',
  document_type: 'documentType',
  confidentiality: 'confidentiality',
  responsible_id: 'author',
  areas: 'areas',
}

export function mapServerErrors(errors = {}) {
  return Object.fromEntries(
    Object.entries(errors ?? {}).map(([key, message]) => [
      FORM_FIELD_BY_PAYLOAD_KEY[key] ?? key,
      message,
    ]),
  )
}

export function publishErrorMessage(error) {
  const status = error?.status
  const details = error?.details
  if (status === 400) return 'Alguns campos precisam de correção. Revise os metadados.'
  if (status === 404) return 'O arquivo enviado expirou. Faça o upload novamente.'
  if (status === 409) {
    const code = details?.document?.code
    return code
      ? `Este arquivo já está cadastrado no documento ${code}.`
      : 'Este arquivo já está cadastrado em outro documento.'
  }
  return error?.message || 'Não foi possível publicar o documento. Tente novamente.'
}

export const useDocumentFormStore = defineStore('documentForm', {
  state: () => ({
    form: emptyForm(),
    projects: [],
    disciplines: [],
    catalogsLoading: false,
    catalogsError: null,
    publishing: false,
    publishError: null,
    serverErrors: {},
    publishedDocument: null,
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

    clearServerError(field) {
      if (!(field in this.serverErrors)) return
      const rest = { ...this.serverErrors }
      delete rest[field]
      this.serverErrors = rest
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
        })
        const document = await createDocument(payload)
        this.publishedDocument = {
          id: document.id,
          code: document.code,
          title: document.title,
          revision: document.revision?.label ?? revisionLabel(INITIAL_VERSION),
        }
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
    },
  },
})
