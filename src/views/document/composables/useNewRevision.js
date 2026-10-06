import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createDocumentRevision, fetchDocumentDetail } from '@/api/documents.js'
import { useDocumentUpload } from '@/composables/useDocumentUpload.js'
import { useAuthStore } from '@/stores/authStore.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { revisionLabel } from '@/utils/documentCode.js'
import { canCreateRevision } from '@/utils/documentStatus.js'

export const JUSTIFICATION_MIN_LENGTH = 20
export const JUSTIFICATION_MAX_LENGTH = 255

const IN_PROGRESS_FILE_STATUSES = ['validating', 'ready', 'uploading']

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar o documento.'
const NOT_FOUND_MESSAGE = 'Documento não encontrado.'
const SUBMIT_ERROR_MESSAGE = 'Não foi possível enviar a nova revisão. Tente novamente.'
const DUPLICATE_FILE_MESSAGE =
  'Um dos arquivos já existe no sistema e não pode ser usado nesta revisão.'

export function useNewRevision() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const notifications = useNotificationStore()

  const parentDocument = ref(null)
  const loading = ref(true)
  const loadError = ref('')
  const justification = ref('')
  const submitting = ref(false)

  const { queue, addFiles, removeFile, resolveDuplicate, ACCEPTED_EXTENSIONS } = useDocumentUpload({
    getUserId: () => authStore.currentUser?.id,
  })

  const currentVersion = computed(() => parentDocument.value?.revision?.version ?? 0)
  const currentRevisionLabel = computed(() =>
    currentVersion.value ? revisionLabel(currentVersion.value) : null,
  )
  const nextRevisionLabel = computed(() => revisionLabel(currentVersion.value + 1))
  const revisionBlocked = computed(
    () => !!parentDocument.value && !canCreateRevision(parentDocument.value.revision?.status),
  )

  const uploadedFiles = computed(() => queue.value.filter((item) => item.status === 'success'))
  const activeDuplicate = computed(() => queue.value.find((item) => item.status === 'duplicate'))
  const hasFilesInProgress = computed(() =>
    queue.value.some((item) => IN_PROGRESS_FILE_STATUSES.includes(item.status)),
  )
  const totalSize = computed(() => queue.value.reduce((total, item) => total + item.size, 0))

  const hasFile = computed(() => uploadedFiles.value.length > 0)
  const justificationLength = computed(() => justification.value.trim().length)
  const justificationValid = computed(
    () =>
      justificationLength.value >= JUSTIFICATION_MIN_LENGTH &&
      justification.value.length <= JUSTIFICATION_MAX_LENGTH,
  )
  const formValid = computed(() => hasFile.value && justificationValid.value)
  const canSubmit = computed(
    () =>
      formValid.value && !hasFilesInProgress.value && !submitting.value && !revisionBlocked.value,
  )

  async function loadDocument() {
    loading.value = true
    loadError.value = ''
    try {
      parentDocument.value = await fetchDocumentDetail(
        route.params.documentId,
        authStore.currentUser?.id,
      )
    } catch (error) {
      parentDocument.value = null
      loadError.value = error?.status === 404 ? NOT_FOUND_MESSAGE : LOAD_ERROR_MESSAGE
    } finally {
      loading.value = false
    }
  }

  function goToDocumentList() {
    router.push({ name: 'document-list' })
  }

  async function submit() {
    if (!canSubmit.value) return

    submitting.value = true
    try {
      await createDocumentRevision(
        route.params.documentId,
        uploadedFiles.value.map((item) => item.documentId),
        { changeDescription: justification.value.trim() },
      )
      notifications.success(`Revisão ${nextRevisionLabel.value} enviada para análise.`)
      goToDocumentList()
    } catch (error) {
      notifications.error(error?.status === 409 ? DUPLICATE_FILE_MESSAGE : SUBMIT_ERROR_MESSAGE)
    } finally {
      submitting.value = false
    }
  }

  onMounted(loadDocument)

  return {
    parentDocument,
    loading,
    loadError,
    justification,
    submitting,
    queue,
    acceptedExtensions: ACCEPTED_EXTENSIONS,
    currentRevisionLabel,
    nextRevisionLabel,
    revisionBlocked,
    activeDuplicate,
    totalSize,
    hasFile,
    justificationLength,
    justificationValid,
    formValid,
    canSubmit,
    addFiles,
    removeFile,
    resolveDuplicate,
    goToDocumentList,
    submit,
  }
}
