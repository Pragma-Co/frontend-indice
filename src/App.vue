<script setup>
import { computed, onMounted, ref } from 'vue'

const DB_LABELS = {
  postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',
}

const loading = ref(false)
const health = ref(null)
const offline = ref(false)
const lastChecked = ref(null)

const overall = computed(() => {
  if (loading.value && !health.value && !offline.value) {
    return { key: 'checking', label: 'Checking…' }
  }
  if (offline.value) {
    return { key: 'offline', label: 'Backend unreachable' }
  }
  if (health.value?.status === 'ok') {
    return { key: 'ok', label: 'All systems operational' }
  }
  return { key: 'degraded', label: 'Degraded' }
})

const databases = computed(() => {
  const entries = health.value?.databases
  if (!entries) return []
  return Object.entries(entries).map(([key, info]) => ({
    key,
    label: DB_LABELS[key] ?? key,
    connected: info.connected === true,
    version: info.version ?? null,
    error: info.error ?? null,
  }))
})

async function checkHealth() {
  loading.value = true
  try {
    const response = await fetch('/api/health/')
    const data = await response.json().catch(() => null)
    // A JSON body with a "databases" object is a real backend answer
    // (200 or 503). Anything else came from the proxy failing to reach it.
    if (data && typeof data.databases === 'object') {
      health.value = data
      offline.value = false
    } else {
      health.value = null
      offline.value = true
    }
  } catch {
    health.value = null
    offline.value = true
  } finally {
    lastChecked.value = new Date()
    loading.value = false
  }
}

onMounted(checkHealth)
</script>

<template>
  <main class="page">
    <header class="header">
      <h1>API-6 — Connection Test</h1>
      <p class="subtitle">Frontend ↔ Backend health check</p>
    </header>

    <section class="status-banner" :class="overall.key">
      <span class="dot" :class="overall.key" />
      <span class="status-label">{{ overall.label }}</span>
    </section>

    <p v-if="offline" class="hint">
      Backend offline? Make sure the API is running and that
      <code>VITE_API_PORT</code> in your <code>.env</code> matches its port.
    </p>

    <section v-if="databases.length" class="cards">
      <article v-for="db in databases" :key="db.key" class="card">
        <div class="card-header">
          <span class="dot" :class="db.connected ? 'ok' : 'offline'" />
          <h2>{{ db.label }}</h2>
        </div>
        <p class="card-status">
          {{ db.connected ? 'Connected' : 'Not connected' }}
        </p>
        <p v-if="db.version" class="card-detail">{{ db.version }}</p>
        <p v-if="db.error" class="card-detail error">Error: {{ db.error }}</p>
      </article>
    </section>

    <footer class="footer">
      <button class="refresh" :disabled="loading" @click="checkHealth">
        {{ loading ? 'Checking…' : 'Refresh' }}
      </button>
      <span v-if="lastChecked" class="timestamp">
        Last checked: {{ lastChecked.toLocaleString() }}
      </span>
    </footer>
  </main>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 1.6rem;
}

.subtitle {
  color: #6b7280;
  margin-top: 0.25rem;
}

.status-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.9rem 1.2rem;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
  font-weight: 600;
}

.status-banner.ok {
  border-color: #bbe5c8;
  background: #f0faf3;
}

.status-banner.offline,
.status-banner.degraded {
  border-color: #f3c6c6;
  background: #fdf2f2;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #9ca3af;
  flex-shrink: 0;
}

.dot.ok {
  background: #22a55b;
}

.dot.offline,
.dot.degraded {
  background: #dc2626;
}

.hint {
  margin-top: 0.8rem;
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 0.7rem 1rem;
  font-size: 0.92rem;
}

.hint code {
  background: #fde68a;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1.1rem 1.2rem;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-header h2 {
  font-size: 1.05rem;
}

.card-status {
  margin-top: 0.5rem;
  font-weight: 600;
}

.card-detail {
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.card-detail.error {
  color: #b91c1c;
}

.footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.refresh {
  font: inherit;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1.4rem;
  cursor: pointer;
}

.refresh:hover:not(:disabled) {
  background: #1d4ed8;
}

.refresh:disabled {
  opacity: 0.6;
  cursor: default;
}

.timestamp {
  color: #6b7280;
  font-size: 0.9rem;
}
</style>
