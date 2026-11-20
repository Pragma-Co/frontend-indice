import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CollaboratorsTable from '@/views/manager/components/CollaboratorsTable.vue'
import { LOCK_REASONS } from '@/views/manager/composables/useCollaboratorsPanel.js'

const MARINA = {
  id: 7,
  name: 'Marina Duarte',
  email: 'marina.duarte@empresa.com',
  initials: 'MD',
  groups: [
    { id: 1, name: 'Estruturas', active: true },
    { id: 2, name: 'Fadiga', active: false },
  ],
}
const RAFAEL = {
  id: 8,
  name: 'Rafael Nunes',
  email: 'rafael.nunes@empresa.com',
  initials: 'RN',
  groups: [],
}

function mountTable() {
  return mount(CollaboratorsTable, { props: { collaborators: [MARINA, RAFAEL] } })
}

describe('CollaboratorsTable', () => {
  it('should show each collaborator with initials, name and e-mail', () => {
    const [first] = mountTable().findAll('tbody tr')

    expect(first.find('.person-avatar').text()).toBe('MD')
    expect(first.find('.cell-primary').text()).toBe('Marina Duarte')
    expect(first.find('.cell-secondary').text()).toBe('marina.duarte@empresa.com')
  })

  it('should list the current groups and mark the inactive ones', () => {
    const chips = mountTable().findAll('tbody tr')[0].findAll('.group-chip')

    expect(chips.map((chip) => chip.text())).toEqual(['Estruturas', 'Fadiga (inativo)'])
    expect(chips[1].classes()).toContain('inactive')
  })

  it('should say when the collaborator has no groups', () => {
    expect(mountTable().findAll('tbody tr')[1].find('.no-groups').text()).toBe('Nenhum grupo')
  })

  it('should ask to edit the collaborator of the clicked row', async () => {
    const wrapper = mountTable()

    await wrapper.find('button[aria-label="Gerenciar grupos de Rafael Nunes"]').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([[8]])
  })

  describe('when a row cannot be changed', () => {
    const OUTSIDER = {
      id: 20,
      name: 'Caio Bertoni',
      email: 'caio@empresa.com',
      initials: 'CB',
      groups: [],
      lockReason: LOCK_REASONS.OTHER_AREA,
    }
    const REMOVED = {
      id: 21,
      name: 'Origenes Mota',
      email: 'origenes@empresa.com',
      initials: 'OM',
      groups: [],
      lockReason: LOCK_REASONS.REMOVED,
    }

    function mountLocked() {
      return mount(CollaboratorsTable, { props: { collaborators: [RAFAEL, OUTSIDER, REMOVED] } })
    }

    it('should offer the edit button only to the collaborators of the area', () => {
      const rows = mountLocked().findAll('tbody tr')

      expect(rows.map((row) => row.find('button.edit-button').exists())).toEqual([
        true,
        false,
        false,
      ])
    })

    it('should tag and explain a collaborator from another area', () => {
      const row = mountLocked().findAll('tbody tr')[1]

      expect(row.classes()).toContain('locked')
      expect(row.find('.lock-tag').text()).toBe('Outra área')
      expect(row.find('.is-locked').attributes('aria-label')).toBe(
        'Colaborador de outra área: só é possível alterar os colaboradores da sua área.',
      )
    })

    it('should tag and explain a user removed from the system', () => {
      const row = mountLocked().findAll('tbody tr')[2]

      expect(row.find('.lock-tag').text()).toBe('Removido')
      expect(row.find('.lock-tag').classes()).toContain('removed')
      expect(row.find('.is-locked').attributes('title')).toBe(
        'Usuário removido do sistema: os grupos não podem ser alterados.',
      )
    })

    it('should not ask to edit a locked row', async () => {
      const wrapper = mountLocked()

      await wrapper.findAll('tbody tr')[2].find('.is-locked').trigger('click')

      expect(wrapper.emitted('edit')).toBeUndefined()
    })
  })
})
