<script setup>
import { computed } from 'vue'
import Button from '@/components/common/Button.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import AccessRequestsTable from '@/views/manager/components/AccessRequestsTable.vue'
import PanelEmptyState from '@/views/manager/components/PanelEmptyState.vue'
import PanelTableSkeleton from '@/views/manager/components/PanelTableSkeleton.vue'
import PanelTabs from '@/views/manager/components/PanelTabs.vue'
import PendingRevisionsTable from '@/views/manager/components/PendingRevisionsTable.vue'
import { PANEL_TABS, useReviewPanel } from '@/views/manager/composables/useReviewPanel.js'
import { formatTime } from '@/utils/formatters.js'

const { tabs, activeTab, revisions, accessRequests, selectTab, openRevisionReview } =
  useReviewPanel()

const SECTIONS = {
  [PANEL_TABS.REVISIONS]: {
    title: 'Revisões aguardando decisão técnica',
    loadingLabel: 'Carregando revisões pendentes',
    columns: 7,
    emptyTitle: 'Nenhuma revisão pendente',
    emptyDescription: 'Não há revisões aguardando decisão técnica no momento.',
  },
  [PANEL_TABS.ACCESS_REQUESTS]: {
    title: 'Pedidos de acesso aguardando decisão',
    loadingLabel: 'Carregando pedidos de acesso',
    columns: 6,
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
        title="Histórico ainda não disponível"
        description="As decisões já tomadas serão listadas aqui quando o histórico for liberado."
      />

      <PanelTableSkeleton
        v-else-if="activeList.loading"
        :columns="section.columns"
        :label="section.loadingLabel"
      />

      <div v-else-if="activeList.error" class="panel-error" role="alert">
        <p>{{ activeList.error }}</p>
        <Button variant="outline" @click="activeList.load()">Tentar novamente</Button>
      </div>

      <PanelEmptyState
        v-else-if="!activeList.items.length"
        :title="section.emptyTitle"
        :description="section.emptyDescription"
      />

      <template v-else>
        <PendingRevisionsTable
          v-if="activeTab === PANEL_TABS.REVISIONS"
          :revisions="activeList.items"
          @evaluate="openRevisionReview"
        />
        <AccessRequestsTable v-else :requests="activeList.items" />

        <footer v-if="activeList.totalPages > 1" class="panel-pagination">
          <Button
            variant="outline"
            :disabled="activeList.currentPage <= 1"
            @click="activeList.goToPage(activeList.currentPage - 1)"
          >
            Anterior
          </Button>
          <span>Página {{ activeList.currentPage }} de {{ activeList.totalPages }}</span>
          <Button
            variant="outline"
            :disabled="activeList.currentPage >= activeList.totalPages"
            @click="activeList.goToPage(activeList.currentPage + 1)"
          >
            Próxima
          </Button>
        </footer>
      </template>
    </section>
  </PageLayout>
</template>

<style scoped>
.panel-card {
  margin-top: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.panel-card-header {
  display: flex;
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
  gap: 1rem;
  padding: 3rem 1rem;
  color: var(--color-warning);
  text-align: center;
}

.panel-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.82rem;
}
</style>
