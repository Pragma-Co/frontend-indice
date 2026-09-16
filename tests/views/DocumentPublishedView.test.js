import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentPublishedView from '../../src/views/DocumentPublishedView.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

const push = vi.fn()
const replace = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push, replace }) }))
vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))

describe('DocumentPublishedView', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    vi.clearAllMocks()
  })

  it('should show the code, title and revision of the published document', () => {
    // Given
    store.publishedDocument = {
      id: 7,
      code: 'AK-2100-EST-DWG-0002',
      title: 'Desenho da fuselagem central',
      revision: 'REV01',
    }
    // When
    const wrapper = mount(DocumentPublishedView)
    // Then
    expect(wrapper.find('[data-testid="published-code"]').text()).toBe('AK-2100-EST-DWG-0002')
    expect(wrapper.text()).toContain('Desenho da fuselagem central')
    expect(wrapper.text()).toContain('REV01')
    expect(replace).not.toHaveBeenCalled()
  })

  it('should redirect to the documents list when nothing was published', () => {
    // When
    mount(DocumentPublishedView)
    // Then
    expect(replace).toHaveBeenCalledWith({ name: 'document-list' })
  })

  it('should offer a new upload and the documents list', async () => {
    // Given
    store.publishedDocument = { id: 7, code: 'AK-2100-EST-DWG-0002', title: 'x', revision: 'REV01' }
    const wrapper = mount(DocumentPublishedView)
    const buttons = wrapper.findAll('button')
    // When
    await buttons.find((b) => b.text() === 'Novo upload').trigger('click')
    await buttons.find((b) => b.text() === 'Ver documentos').trigger('click')
    // Then
    expect(push).toHaveBeenCalledWith({ name: 'document-upload' })
    expect(push).toHaveBeenCalledWith({ name: 'document-list' })
  })
})
