<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import { useNotificationStore } from '@/stores/notificationStore'

const watermarks = Array.from({ length: 12 }, (_, index) => {
  const column = index % 3
  const row = Math.floor(index / 3)
  const x =
    column === 0 ? Math.random() * 6 : column === 2 ? -Math.random() * 6 : Math.random() * 12 - 6
  const y =
    row === 0 ? Math.random() * 15 : row === 3 ? -Math.random() * 15 : Math.random() * 30 - 15
  return { x, y }
})

const props = defineProps({
  user: { type: Object, required: true },
  documentId: { type: [Number, String], default: null },
  fileId: { type: [Number, String], default: null },
})

const notifications = useNotificationStore()
const obscured = ref(false)
const INFO_EVENTS = new Set(['FOCUS_LOST', 'TAB_HIDDEN'])
const FORBIDDEN_MESSAGE = 'Ação proibida: este documento é sigiloso e não pode ser capturado.'

const FOCUS_REPORT_DELAY_MS = 600
let pendingFocusReport = null
const lastLogged = new Map()
const LOG_THROTTLE_MS = 2000

function cancelPendingFocusReport() {
  clearTimeout(pendingFocusReport)
  pendingFocusReport = null
}

function logEvent(event, detail) {
  if (!INFO_EVENTS.has(event)) {
    cancelPendingFocusReport()
    notifications.error(FORBIDDEN_MESSAGE)
  }
  if (props.documentId == null) return
  const now = Date.now()
  if (now - (lastLogged.get(event) ?? 0) < LOG_THROTTLE_MS) return
  lastLogged.set(event, now)
  const fileId = Number(props.fileId)
  api
    .post(`/documents/${props.documentId}/security-events`, {
      event,
      file_id: Number.isInteger(fileId) ? fileId : null,
      detail,
    })
    .catch((failure) => console.error('Falha ao registrar evento de segurança:', failure))
}

function clearClipboard() {
  navigator.clipboard?.writeText?.(' ').catch(() => {})
}

function blockShortcut(event) {
  const key = event.key?.toLowerCase()
  const modifier = event.ctrlKey || event.metaKey
  let logged = null

  if (key === 'printscreen') {
    clearClipboard()
    logEvent('PRINT_SCREEN_KEY')
    return
  }
  if (event.metaKey && event.shiftKey && ['3', '4', '5', 's'].includes(key)) {
    logged = 'PRINT_SCREEN_KEY'
  } else if (key === 'f12' || (modifier && event.shiftKey && ['i', 'j', 'c'].includes(key))) {
    logged = 'DEVTOOLS_SHORTCUT'
  } else if (modifier && key === 'p') {
    logged = 'PRINT_ATTEMPT'
  } else if (modifier && key === 's') {
    logged = 'SAVE_ATTEMPT'
  } else if (modifier && key === 'u') {
    logged = 'VIEW_SOURCE_ATTEMPT'
  } else if (modifier && ['c', 'x'].includes(key)) {
    logged = key === 'c' ? 'COPY_ATTEMPT' : 'CUT_ATTEMPT'
  } else if (modifier && key === 'a') {
    event.preventDefault()
    return
  }
  if (logged) {
    event.preventDefault()
    logEvent(logged)
  }
}

function blockAndLog(event, name) {
  event.preventDefault()
  logEvent(name)
}

function onBeforePrint() {
  logEvent('PRINT_ATTEMPT')
}

function reportFocusLoss(event) {
  cancelPendingFocusReport()
  pendingFocusReport = setTimeout(() => {
    pendingFocusReport = null
    logEvent(event)
  }, FOCUS_REPORT_DELAY_MS)
}

function onBlur() {
  obscured.value = true
  reportFocusLoss('FOCUS_LOST')
}

function onFocus() {
  obscured.value = false
}

function onVisibilityChange() {
  if (document.hidden) {
    obscured.value = true
    reportFocusLoss('TAB_HIDDEN')
  }
}

onMounted(() => {
  window.addEventListener('keydown', blockShortcut, true)
  window.addEventListener('keyup', blockShortcut, true)
  window.addEventListener('beforeprint', onBeforePrint)
  window.addEventListener('blur', onBlur)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  cancelPendingFocusReport()
  window.removeEventListener('keydown', blockShortcut, true)
  window.removeEventListener('keyup', blockShortcut, true)
  window.removeEventListener('beforeprint', onBeforePrint)
  window.removeEventListener('blur', onBlur)
  window.removeEventListener('focus', onFocus)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div
    class="protected-content"
    :class="{ 'protected-content--obscured': obscured }"
    @copy="blockAndLog($event, 'COPY_ATTEMPT')"
    @cut="blockAndLog($event, 'CUT_ATTEMPT')"
    @selectstart.prevent
    @dragstart="blockAndLog($event, 'DRAG_ATTEMPT')"
    @contextmenu="blockAndLog($event, 'CONTEXT_MENU')"
  >
    <div class="protected-content-body"><slot /></div>
    <div class="protected-watermark" aria-hidden="true">
      <span
        v-for="(mark, index) in watermarks"
        :key="index"
        :style="{ transform: `translate(${mark.x}%, ${mark.y}%) rotate(-15deg)` }"
      >
        {{ user.name }} · {{ user.email }}
      </span>
    </div>
  </div>
</template>

<style>
@media print {
  .protected-content {
    display: none !important;
  }
}
</style>

<style scoped>
.protected-content {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  -webkit-user-select: none;
  user-select: none;
}

.protected-content-body {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.protected-content--obscured .protected-content-body {
  visibility: hidden;
}

.protected-content :deep(*) {
  -webkit-user-select: none;
  user-select: none;
}

.protected-watermark {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  align-items: center;
  justify-items: center;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.protected-watermark span {
  width: 90%;
  color: rgba(100, 25, 25, 0.4);
  font-size: clamp(0.65rem, 1vw, 0.9rem);
  font-weight: 700;
  text-align: center;
  overflow-wrap: anywhere;
}
</style>
