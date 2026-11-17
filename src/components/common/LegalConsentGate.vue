<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore.js'
import { useLegalConsentStore } from '@/stores/legalConsentStore.js'
import LegalTermDialog from '@/views/user-management/components/LegalTermDialog.vue'

const POLL_INTERVAL_MS = 60_000

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const consent = useLegalConsentStore()

const active = computed(() => auth.isAuthenticated && !route.meta.public)
const current = computed(() => consent.current)

let timer = null

function refresh() {
  if (active.value) consent.refresh()
}

function onVisibility() {
  if (document.visibilityState === 'visible') refresh()
}

function start() {
  stop()
  refresh()
  timer = setInterval(refresh, POLL_INTERVAL_MS)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', refresh)
}

function stop() {
  clearInterval(timer)
  timer = null
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('focus', refresh)
}

watch(
  active,
  (isActive) => {
    if (isActive) start()
    else {
      stop()
      consent.reset()
    }
  },
  { immediate: true },
)

watch(
  () => route.fullPath,
  () => refresh(),
)

onBeforeUnmount(stop)

async function leave() {
  await auth.signOut()
  router.push({ name: 'login' }).catch(() => null)
}
</script>

<template>
  <LegalTermDialog
    v-if="active && current"
    :key="current.current_version.id"
    blocking
    :version-id="current.current_version.id"
    :title="current.title"
    :version-label="String(current.current_version.version)"
    :busy="consent.accepting"
    :action-error="consent.error"
    @accept="consent.accept()"
    @leave="leave"
  />
</template>
