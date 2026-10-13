import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PanelTabs from '../../src/views/manager/components/PanelTabs.vue'

const TABS = [
  { id: 'revisions', label: 'Revisões Técnicas Pendentes', count: 3 },
  { id: 'access-requests', label: 'Pedidos de Acesso a Documentos Restritos', count: 0 },
  { id: 'history', label: 'Histórico', count: null },
]

function mountTabs(activeTab = 'revisions') {
  return mount(PanelTabs, { props: { tabs: TABS, activeTab }, attachTo: document.body })
}

describe('PanelTabs', () => {
  it('should render every tab with its pending count', () => {
    const wrapper = mountTabs()

    const labels = wrapper.findAll('[role="tab"]').map((tab) => tab.text())

    expect(labels).toEqual([
      'Revisões Técnicas Pendentes (3)',
      'Pedidos de Acesso a Documentos Restritos (0)',
      'Histórico',
    ])
    wrapper.unmount()
  })

  it('should mark only the active tab as selected', () => {
    const wrapper = mountTabs('access-requests')

    const selected = wrapper.findAll('[role="tab"]').map((tab) => tab.attributes('aria-selected'))

    expect(selected).toEqual(['false', 'true', 'false'])
    expect(wrapper.find('.panel-tab.active').text()).toContain('Pedidos de Acesso')
    wrapper.unmount()
  })

  it('should ask to select the clicked tab', async () => {
    const wrapper = mountTabs()

    await wrapper.findAll('[role="tab"]')[2].trigger('click')

    expect(wrapper.emitted('select')).toEqual([['history']])
    wrapper.unmount()
  })

  it('should move to the neighbour tabs with the arrow keys and wrap around', async () => {
    const wrapper = mountTabs()
    const first = wrapper.findAll('[role="tab"]')[0]

    await first.trigger('keydown', { key: 'ArrowRight' })
    await first.trigger('keydown', { key: 'ArrowLeft' })

    expect(wrapper.emitted('select')).toEqual([['access-requests'], ['history']])
    wrapper.unmount()
  })
})
