import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/api/documents', () => ({ fetchSimpleFilters: vi.fn().mockResolvedValue({}) }))

import HomeView from '@/views/home/HomeView.vue'
import { PROFILES, useAuthStore } from '@/stores/authStore'

describe('HomeView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('should greet the user again when the account name changes, without a reload', async () => {
    const auth = useAuthStore()
    auth.login(PROFILES.COLLABORATOR)
    const wrapper = mount(HomeView, { global: { stubs: { SearchPanel: true } } })
    await flushPromises()
    const before = wrapper.find('h1').text()

    auth.applyAccount({ id: 12, name: 'Beatriz C. Canuto' })
    await flushPromises()

    expect(before).toBe('Bem-vindo, Beatriz Canuto')
    expect(wrapper.find('h1').text()).toBe('Bem-vindo, Beatriz C. Canuto')
  })
})
