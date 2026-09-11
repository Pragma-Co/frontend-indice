import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentConfirmationView from '../../src/views/DocumentConfirmationView.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

const push = vi.fn()
const replace = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push, replace }) }))
vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))

describe('DocumentConfirmationView', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    vi.clearAllMocks()
    store.projects = [{ id: 1, code: 'AK-2100', name: 'Aeroestrutura de Fuselagem Central' }]
    store.disciplines = [{ id: 1, code: 'EST', name: 'Estruturas' }]
    Object.assign(store.form, {
      title: 'Desenho da fuselagem central',
      projectId: 1,
      disciplineId: 1,
      documentType: 'DWG',
      author: 'João Silva',
      areas: ['EST'],
    })
  })

  it('should send the user back to the metadata step when required fields are missing', () => {
    // Given
    store.form.title = ''
    // When
    mount(DocumentConfirmationView)
    // Then
    expect(replace).toHaveBeenCalledWith({ name: 'document-metadata' })
  })

  it('should stay on the confirmation step when the form is complete', () => {
    // When
    mount(DocumentConfirmationView)
    // Then
    expect(replace).not.toHaveBeenCalled()
  })

  it('should show Confirmação as the current step with the previous steps done', () => {
    // When
    const wrapper = mount(DocumentConfirmationView)
    // Then
    expect(wrapper.find('.step-circle.active').text()).toBe('3')
    expect(wrapper.findAll('.step-circle.done')).toHaveLength(2)
    expect(wrapper.text()).toContain('Resumo do Documento')
  })

  it('should summarise the metadata kept in the store', () => {
    // Given
    store.form.title = 'Desenho da fuselagem central'
    store.form.projectId = 1
    store.form.disciplineId = 1
    store.form.documentType = 'DWG'
    // When
    const wrapper = mount(DocumentConfirmationView)
    // Then
    expect(wrapper.find('[data-testid="document-code"]').text()).toBe('AK-2100-EST-DWG-REV01')
  })

  it('should go back to the metadata step keeping the form', async () => {
    // Given
    store.form.title = 'Mantido'
    const wrapper = mount(DocumentConfirmationView)
    // When
    await wrapper.findAll('button').find((b) => b.text() === 'Anterior').trigger('click')
    // Then
    expect(push).toHaveBeenCalledWith({ name: 'document-metadata' })
    expect(store.form.title).toBe('Mantido')
  })
})
