<script setup>
import { computed } from 'vue'
import Button from '@/components/common/Button.vue'
import Pagination from '@/components/common/Pagination.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import AccessRequestsTable from '@/views/manager/components/AccessRequestsTable.vue'
import PanelEmptyState from '@/views/manager/components/PanelEmptyState.vue'
import PanelTableSkeleton from '@/views/manager/components/PanelTableSkeleton.vue'
import PanelTabs from '@/views/manager/components/PanelTabs.vue'
import PendingRevisionsTable from '@/views/manager/components/PendingRevisionsTable.vue'
import {
  PANEL_PAGE_SIZE_OPTIONS,
  PANEL_TABS,
  useReviewPanel,
} from '@/views/manager/composables/useReviewPanel.js'
import { formatTime } from '@/utils/formatters.js'

const { tabs, activeTab, revisions, accessRequests, selectTab, openRevisionReview } =
  useReviewPanel()

const SECTIONS = {
  [PANEL_TABS.REVISIONS]: {
    title: 'Revisões aguardando decisão técnica',
    loadingLabel: 'Carregando revisões pendentes',
    columns: 7,
    itemLabel: 'revisões',
    emptyTitle: 'Nenhuma revisão pendente',
    emptyDescription: 'Não há revisões aguardando decisão técnica no momento.',
  },
  [PANEL_TABS.ACCESS_REQUESTS]: {
    title: 'Pedidos de acesso aguardando decisão',
    loadingLabel: 'Carregando pedidos de acesso',
    columns: 6,
    itemLabel: 'pedidos',
    emptyTitle: 'Nenhum pedido de acesso pendente',
    emptyDescription: 'Não há pedidos de acesso a documentos restritos no momento.',
  },
  [PANEL_TABS.HISTORY]: {
    title: 'Histórico de decisões',
  },
}

const section = computed(() => SECTIONS[activeTab.value])

const activeList = computed(() => {
  if (activeTab.value === PANEL_TABS.REVISIONS) return revisions
  if (activeTab.value === PANEL_TABS.ACCESS_REQUESTS) return accessRequests
  return null
})

const updatedLabel = computed(() =>
  activeList.value?.updatedAt ? `Atualizado hoje • ${formatTime(activeList.value.updatedAt)}` : '',
)
</script>

<template>
  <PageLayout
    wide
    title="Painel de revisões"
    subtitle="Gerenciamento centralizado de solicitações e pendências técnicas."
  >
    <PanelTabs :tabs="tabs" :active-tab="activeTab" @select="selectTab" />

    <section
      :id="`panel-tabpanel-${activeTab}`"
      class="panel-card"
      role="tabpanel"
      :aria-labelledby="`panel-tab-${activeTab}`"
    >
      <header class="panel-card-header">
        <h2>{{ section.title }}</h2>
        <span v-if="updatedLabel && !activeList.loading" class="panel-updated">
          <span class="panel-updated-dot" aria-hidden="true" />
          {{ updatedLabel }}
        </span>
      </header>

      <PanelEmptyState
        v-if="!activeList"
        class="panel-content"
        title="Histórico ainda não disponível"
        description="As decisões já tomadas serão listadas aqui quando o histórico for liberado."
      />

      <PanelTableSkeleton
        v-else-if="activeList.loading"
        class="panel-content"
        :columns="section.columns"
        :label="section.loadingLabel"
      />

      <div v-else-if="activeList.error" class="panel-content panel-error" role="alert">
        <p>{{ activeList.error }}</p>
        <Button variant="outline" @click="activeList.load()">Tentar novamente</Button>
      </div>

      <PanelEmptyState
        v-else-if="!activeList.items.length"
        class="panel-content"
        :title="section.emptyTitle"
        :description="section.emptyDescription"
      />

      <PendingRevisionsTable
        v-else-if="activeTab === PANEL_TABS.REVISIONS"
        class="panel-content"
        :revisions="activeList.items"
        @evaluate="openRevisionReview"
      />
      <AccessRequestsTable v-else class="panel-content" :requests="activeList.items" />

      <footer v-if="activeList && !activeList.error" class="panel-pagination">
        <Pagination
          :current-page="activeList.currentPage"
          :total-pages="activeList.totalPages"
          :total-items="activeList.count ?? 0"
          :items-per-page="activeList.pageSize"
          :items-per-page-options="PANEL_PAGE_SIZE_OPTIONS"
          :item-label="section.itemLabel"
          @change-page="activeList.goToPage"
          @change-items-per-page="activeList.setPageSize"
        />
      </footer>
    </section>
  </PageLayout>
</template>

<style scoped>
.panel-card {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 278px);
  min-height: 24rem;
  margin-top: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.panel-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.panel-card-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-card-header h2 {
  font-size: 1rem;
}

.panel-updated {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: 0.72rem;
  white-space: nowrap;
}

.panel-updated-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
}

.panel-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: var(--color-warning);
  text-align: center;
}

.panel-pagination {
  flex-shrink: 0;
  padding: 0 1rem 1rem;
}

.panel-pagination :deep(.pagination) {
  margin-top: 0;
}
</style>
