<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, FileText, ShieldCheck, ShieldX } from '@lucide/vue'
import Dropdown from '@/components/common/Dropdown.vue'
import {
  NOTIFICATION_TYPES,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/notifications'

const POLL_INTERVAL_MS = 60 * 1000
const PAGE_SIZE = 5
const SCROLL_THRESHOLD_PX = 24

const TYPE_META = {
  [NOTIFICATION_TYPES.DOCUMENT_UPDATED]: { icon: FileText, variant: 'info' },
  [NOTIFICATION_TYPES.ACCESS_APPROVED]: { icon: ShieldCheck, variant: 'success' },
  [NOTIFICATION_TYPES.ACCESS_REJECTED]: { icon: ShieldX, variant: 'danger' },
}

const router = useRouter()
const notifications = ref([])
const visibleCount = ref(PAGE_SIZE)
const list = ref(null)
const dropdown = ref(null)
let timer = null

const unreadCount = computed(() => notifications.value.filter((item) => item.is_new).length)
const visible = computed(() => notifications.value.slice(0, visibleCount.value))

async function load() {
  try {
    notifications.value = await fetchNotifications()
  } catch {
    return
  }
}

function metaFor(type) {
  return TYPE_META[type] ?? TYPE_META[NOTIFICATION_TYPES.DOCUMENT_UPDATED]
}

function relativeTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) {
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `ontem, às ${time}`
  }
  return `há ${days} dias`
}

function onScroll() {
  const el = list.value
  if (!el || visibleCount.value >= notifications.value.length) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX) {
    visibleCount.value += PAGE_SIZE
  }
}

async function onOpen() {
  visibleCount.value = PAGE_SIZE
  await nextTick()
  if (list.value) list.value.scrollTop = 0
}

async function markAllAsRead() {
  const previous = notifications.value
  notifications.value = previous.map((item) => ({ ...item, is_new: false }))
  try {
    await markAllNotificationsAsRead()
  } catch {
    notifications.value = previous
  }
}

async function openNotification(item) {
  dropdown.value?.close()
  const wasNew = item.is_new
  item.is_new = false
  router.push(`/documents/${item.document.id}`)
  if (!wasNew) return
  try {
    await markNotificationAsRead(item.id)
  } catch {
    item.is_new = true
  }
}

onMounted(() => {
  load()
  timer = setInterval(load, POLL_INTERVAL_MS)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <Dropdown ref="dropdown" label="Notificações" width="22rem" @open="onOpen">
    <template #trigger="{ open, toggle }">
      <button
        class="notifications-trigger"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :aria-label="unreadCount ? `Notificações, ${unreadCount} não lidas` : 'Notificações'"
        @click="toggle"
      >
        <Bell :size="18" aria-hidden="true" />
        <span v-if="unreadCount" class="notifications-count" aria-hidden="true">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>
    </template>

    <div class="notifications-header">
      <h2 class="notifications-title">Notificações</h2>
      <button
        type="button"
        class="notifications-mark-all"
        :disabled="!unreadCount"
        @click="markAllAsRead"
      >
        Marcar todas como lidas
      </button>
    </div>

    <ul v-if="visible.length" ref="list" class="notifications-list" @scroll="onScroll">
      <li v-for="item in visible" :key="item.id">
        <button
          type="button"
          class="notification-item"
          :class="{ new: item.is_new }"
          @click="openNotification(item)"
        >
          <span class="notification-badge" :class="`badge-${metaFor(item.type).variant}`">
            <component :is="metaFor(item.type).icon" :size="16" aria-hidden="true" />
          </span>
          <span class="notification-body">
            <span class="notification-text">{{ item.title }}</span>
            <span class="notification-code">{{ item.document.code }}</span>
            <span class="notification-date">{{ relativeTime(item.created_at) }}</span>
          </span>
          <span v-if="item.is_new" class="notification-dot" aria-label="Não lida" />
        </button>
      </li>
    </ul>
    <p v-else class="notifications-empty">Nenhuma notificação.</p>
  </Dropdown>
</template>

<style scoped>
.notifications-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-navy-light);
  color: var(--color-text-inverse);
  cursor: pointer;
}

.notifications-trigger:hover {
  filter: brightness(1.15);
}

.notifications-trigger:focus-visible {
  outline: 2px solid var(--color-text-inverse);
  outline-offset: 2px;
}

.notifications-count {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--color-text-inverse);
  color: var(--color-navy);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}

.notifications-header {
  padding: 1rem 1.25rem 0.75rem;
}

.notifications-title {
  margin: 0 0 0.4rem;
  font-size: 1.05rem;
  font-weight: 700;
}

.notifications-mark-all {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
}

.notifications-mark-all:disabled {
  opacity: 0.5;
  cursor: default;
}

.notifications-list {
  max-height: 22rem;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  border-top: 1px solid var(--color-border);
  list-style: none;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 1.25rem;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.notification-item.new {
  background: var(--color-info-bg);
}

.notification-item:hover,
.notification-item:focus-visible {
  filter: brightness(0.97);
  outline: none;
}

.notification-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-info-bg);
  color: var(--color-info);
}

.badge-success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.badge-danger {
  background: var(--color-surface-muted);
  color: var(--color-danger);
}

.notification-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.notification-text {
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.35;
}

.notification-code,
.notification-date {
  color: var(--color-text-muted);
  font-size: 0.72rem;
}

.notification-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  margin-top: 0.3rem;
  border-radius: 50%;
  background: var(--color-primary);
}

.notifications-empty {
  margin: 0;
  padding: 1.25rem;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  text-align: center;
}
</style>
