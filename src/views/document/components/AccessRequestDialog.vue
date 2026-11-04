<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Button from '@/components/common/Button.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import RadioGroup from '@/components/common/RadioGroup.vue'

const JUSTIFICATION_MIN_LENGTH = 20
const JUSTIFICATION_MAX_LENGTH = 1000

const props = defineProps({
  requesting: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'cancel'])

const justification = ref('')
const touched = ref(false)
const accessType = ref('PERMANENT')
const ACCESS_TYPE_OPTIONS = [
  { value: 'PERMANENT', label: 'Permanente' },
  { value: 'TEMPORARY', label: 'Temporário' },
]
const expiresOn = ref('')

function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const minExpiry = todayIso()
const isTemporary = computed(() => accessType.value === 'TEMPORARY')

const expiryError = computed(() => {
  if (!isTemporary.value) return ''
  if (!expiresOn.value) return 'Informe até quando o acesso é necessário.'
  if (expiresOn.value < minExpiry) return 'A data de expiração não pode estar no passado.'
  return ''
})

const trimmedLength = computed(() => justification.value.trim().length)

const justificationError = computed(() => {
  if (trimmedLength.value === 0) return 'Informe a justificativa do pedido de acesso.'
  if (trimmedLength.value < JUSTIFICATION_MIN_LENGTH) {
    return `A justificativa deve ter no mínimo ${JUSTIFICATION_MIN_LENGTH} caracteres.`
  }
  if (trimmedLength.value > JUSTIFICATION_MAX_LENGTH) {
    return `A justificativa deve ter no máximo ${JUSTIFICATION_MAX_LENGTH} caracteres.`
  }
  return ''
})

const shownJustificationError = computed(() => (touched.value ? justificationError.value : ''))
const shownExpiryError = computed(() => (touched.value ? expiryError.value : ''))

function submit() {
  touched.value = true
  if (props.requesting || justificationError.value || expiryError.value) return
  emit('submit', {
    justification: justification.value.trim(),
    access_type: accessType.value,
    expires_on: isTemporary.value ? expiresOn.value : null,
  })
}

function onKeydown(event) {
  if (event.key === 'Escape' && !props.requesting) emit('cancel')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="dialog-backdrop" @click.self="!requesting && emit('cancel')">
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-dialog-title"
      @keydown.enter.ctrl.prevent="submit"
    >
      <h2 id="access-dialog-title" class="dialog-title">Solicitar acesso ao documento</h2>
      <p class="dialog-text">
        Informe o tipo de acesso e a justificativa. O responsável pelo documento será notificado.
      </p>

      <RadioGroup
        v-model="accessType"
        name="access-type"
        legend="Tipo de acesso"
        required
        direction="row"
        :options="ACCESS_TYPE_OPTIONS"
        :disabled="requesting"
      />

      <div v-if="isTemporary" class="field">
        <label for="access-expires-on">Acesso até <span aria-hidden="true">*</span></label>
        <DatePicker
          id="access-expires-on"
          v-model="expiresOn"
          label="Data de expiração"
          :min="minExpiry"
          :disabled="requesting"
          :invalid="!!shownExpiryError"
        />
        <span v-if="shownExpiryError" class="error" role="alert">{{ shownExpiryError }}</span>
      </div>

      <div class="field">
        <label for="access-justification">Justificativa <span aria-hidden="true">*</span></label>
        <textarea
          id="access-justification"
          v-model="justification"
          rows="4"
          :maxlength="JUSTIFICATION_MAX_LENGTH"
          :disabled="requesting"
          :aria-invalid="shownJustificationError ? 'true' : undefined"
          placeholder="Explique por que você precisa acessar este documento..."
          @blur="touched = true"
        />
        <div class="meta">
          <span
            :class="{ error: shownJustificationError }"
            :role="shownJustificationError ? 'alert' : undefined"
          >
            {{ shownJustificationError || `Mínimo de ${JUSTIFICATION_MIN_LENGTH} caracteres` }}
          </span>
          <span>{{ justification.length }}/{{ JUSTIFICATION_MAX_LENGTH }}</span>
        </div>
      </div>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

      <div class="dialog-actions">
        <Button variant="outline" :disabled="requesting" @click="emit('cancel')">Cancelar</Button>
        <Button variant="primary" :loading="requesting" :disabled="requesting" @click="submit">
          {{ requesting ? 'Enviando solicitação…' : 'Enviar solicitação' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
}

.dialog {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  width: min(30rem, 92%);
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.dialog-title {
  font-size: 1.1rem;
}

.dialog-text {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.field label {
  font-size: 0.85rem;
  font-weight: 600;
}

.field textarea {
  width: 100%;
  padding: 0.5rem 0.6rem;
  font: inherit;
  font-size: 0.88rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.field textarea {
  resize: vertical;
}

.field [aria-invalid='true'] {
  border-color: var(--color-danger);
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.error {
  font-size: 0.85rem;
  color: var(--color-danger);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
