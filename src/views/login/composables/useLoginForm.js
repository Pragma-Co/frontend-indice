import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { validateLoginForm } from '@/utils/validators'

const SIGN_IN_ERROR_MESSAGES = {
  0: 'Não foi possível conectar ao servidor. Tente novamente.',
  400: 'Verifique os dados informados.',
  401: 'E-mail ou senha incorretos.',
}

const FALLBACK_SIGN_IN_ERROR = 'Não foi possível entrar agora. Tente novamente em instantes.'

export function signInErrorMessage(status) {
  return SIGN_IN_ERROR_MESSAGES[status] ?? FALLBACK_SIGN_IN_ERROR
}

export function resolveRedirectTarget(redirect) {
  const isSafePath =
    typeof redirect === 'string' &&
    redirect.startsWith('/') &&
    !redirect.startsWith('//') &&
    !redirect.startsWith('/\\')
  return isSafePath ? redirect : { name: 'home' }
}

export function useLoginForm() {
  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  const form = reactive({ email: '', password: '' })
  const touched = reactive({ email: false, password: false })
  const submitAttempted = ref(false)
  const serverError = ref('')
  const submitting = ref(false)

  const validationErrors = computed(() => validateLoginForm(form))
  const errors = computed(() =>
    Object.fromEntries(
      Object.entries(validationErrors.value).filter(
        ([field]) => submitAttempted.value || touched[field],
      ),
    ),
  )

  function onBlur(field) {
    touched[field] = true
  }

  function clearServerError() {
    serverError.value = ''
  }

  function resetPassword() {
    form.password = ''
    touched.password = false
    submitAttempted.value = false
  }

  async function submit() {
    if (submitting.value) return
    submitAttempted.value = true
    touched.email = true
    touched.password = true
    if (Object.keys(validationErrors.value).length) return

    clearServerError()
    submitting.value = true
    try {
      await auth.signIn({ email: form.email.trim(), password: form.password })
    } catch (error) {
      serverError.value = signInErrorMessage(error?.status)
      if (error?.status === 401) resetPassword()
      return
    } finally {
      submitting.value = false
    }
    await router.push(resolveRedirectTarget(route.query?.redirect))
  }

  return { form, errors, serverError, submitting, onBlur, clearServerError, submit }
}
