import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import UnderConstructionView from '../../src/views/UnderConstructionView.vue'

describe('UnderConstructionView', () => {
  it('should show the heading of the current route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/profile',
          component: UnderConstructionView,
          meta: { heading: 'Gestão do Titular' },
        },
      ],
    })
    router.push('/profile')
    await router.isReady()

    const wrapper = mount(UnderConstructionView, { global: { plugins: [router] } })

    expect(wrapper.find('h1').text()).toBe('Gestão do Titular')
    expect(wrapper.text()).toContain('Esta tela ainda está em construção.')
  })
})
