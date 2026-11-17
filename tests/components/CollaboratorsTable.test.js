import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CollaboratorsTable from '@/views/manager/components/CollaboratorsTable.vue'

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
})
