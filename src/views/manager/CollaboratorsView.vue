<script setup>
import { computed } from 'vue'
import { Plus, Search, ShieldCheck } from '@lucide/vue'
import Button from '@/components/common/Button.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import { useAuthStore } from '@/stores/authStore'
import CollaboratorsTable from '@/views/manager/components/CollaboratorsTable.vue'
import CreateAccessGroupDialog from '@/views/manager/components/CreateAccessGroupDialog.vue'
import ManageAccessGroupsDialog from '@/views/manager/components/ManageAccessGroupsDialog.vue'
import PanelEmptyState from '@/views/manager/components/PanelEmptyState.vue'
import PanelTableSkeleton from '@/views/manager/components/PanelTableSkeleton.vue'
import { useCollaboratorsPanel } from '@/views/manager/composables/useCollaboratorsPanel.js'

const auth = useAuthStore()

const {
  groups,
  collaboratorRows,
  loading,
  error,
  search,
  load,
  editingCollaborator,
  savingMemberships,
  membershipError,
  openMembershipDialog,
  closeMembershipDialog,
  saveMemberships,
  creatingGroup,
  submittingGroup,
  createGroupErrors,
  openCreateGroupDialog,
  closeCreateGroupDialog,
  clearCreateGroupErrors,
  submitCreateGroup,
} = useCollaboratorsPanel()

const areaName = computed(() => auth.currentUser?.area ?? '')

const subtitle = computed(() =>
  areaName.value
    ? `Gestão de permissões da área ${areaName.value}.`
    : 'Gestão de permissões da sua área.',
)

const countLabel = computed(() => {
  const total = collaboratorRows.value.length
  return total === 1 ? '1 colaborador' : `${total} colaboradores`
})

const isSearching = computed(() => Boolean(search.value.trim()))
</script>

<template>
  <PageLayout wide title="Colaboradores" :subtitle="subtitle">
    <div class="collaborators-toolbar">
      <div class="collaborators-search">
        <Search :size="16" aria-hidden="true" class="collaborators-search-icon" />
        <input
          v-model="search"
          type="search"
          placeholder="Pesquisar por nome ou e-mail..."
          aria-label="Pesquisar colaboradores por nome ou e-mail"
        />
      </div>
      <Button
        class="collaborators-create"
        :disabled="loading || Boolean(error)"
        @click="openCreateGroupDialog"
      >
        <Plus :size="16" aria-hidden="true" class="collaborators-create-icon" />Criar Grupo de
        Acesso
      </Button>
    </div>

    <section class="collaborators-card" aria-labelledby="collaborators-card-title">
      <header class="collaborators-card-header">
        <h2 id="collaborators-card-title">Colaboradores da área</h2>
        <span v-if="!loading && !error" class="collaborators-count" aria-live="polite">
          {{ countLabel }}
        </span>
      </header>

      <PanelTableSkeleton v-if="loading" :columns="3" label="Carregando colaboradores" />

      <div v-else-if="error" class="collaborators-error" role="alert">
        <p>{{ error }}</p>
        <Button variant="outline" @click="load">Tentar novamente</Button>
      </div>

      <PanelEmptyState
        v-else-if="!collaboratorRows.length && isSearching"
        title="Nenhum colaborador encontrado"
        description="Revise o nome ou e-mail pesquisado."
      />

      <PanelEmptyState
        v-else-if="!collaboratorRows.length"
        title="Nenhum colaborador em grupos da área"
        description="Os colaboradores aparecem aqui quando fazem parte de um grupo de acesso da área."
      />

      <CollaboratorsTable v-else :collaborators="collaboratorRows" @edit="openMembershipDialog" />

      <footer class="collaborators-card-footer">
        <ShieldCheck :size="14" aria-hidden="true" />
        A gestão de colaboradores e grupos está limitada à sua área.
      </footer>
    </section>

    <ManageAccessGroupsDialog
      v-if="editingCollaborator"
      :key="editingCollaborator.id"
      :collaborator="editingCollaborator"
      :groups="groups"
      :area-name="areaName"
      :saving="savingMemberships"
      :error="membershipError"
      @close="closeMembershipDialog"
      @save="saveMemberships"
    />

    <CreateAccessGroupDialog
      v-if="creatingGroup"
      :groups="groups"
      :area-name="areaName"
      :submitting="submittingGroup"
      :server-errors="createGroupErrors"
      @close="closeCreateGroupDialog"
      @edit="clearCreateGroupErrors"
      @submit="submitCreateGroup"
    />
  </PageLayout>
</template>

<style scoped>
.collaborators-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.collaborators-search {
  position: relative;
  flex: 1 1 16rem;
  max-width: 24rem;
}

.collaborators-search-icon {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  color: var(--color-text-muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.collaborators-search input {
  width: 100%;
  padding: 0.6rem 0.75rem 0.6rem 2.35rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: 0.85rem;
}

.collaborators-search input:focus {
  outline: 2px solid var(--color-primary-bg);
  border-color: var(--color-primary);
}

.collaborators-create {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
}

.collaborators-create-icon {
  margin-right: 0.35rem;
}

.collaborators-card {
  margin-top: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.collaborators-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.collaborators-card-header h2 {
  font-size: 1rem;
}

.collaborators-count {
  flex-shrink: 0;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: 0.72rem;
}

.collaborators-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: var(--color-warning);
  text-align: center;
}

.collaborators-card-footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

@media (max-width: 640px) {
  .collaborators-search {
    flex-basis: 100%;
    max-width: none;
  }

  .collaborators-create {
    width: 100%;
  }
}
</style>
