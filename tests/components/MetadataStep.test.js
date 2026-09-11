import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MetadataStep from '../../src/components/document-upload/MetadataStep.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))

import { listProjects } from '../../src/api/projects'
import { listDisciplines } from '../../src/api/disciplines'

const PROJECTS = [{ id: 1, code: 'AK-2100', name: 'Aeroestrutura de Fuselagem Central' }]
const DISCIPLINES = [{ id: 1, code: 'EST', name: 'Estruturas' }]

function nextButton(wrapper) {
  return wrapper.findAll('button').find((b) => b.text() === 'Próximo Passo')
}

async function fillRequiredFields(wrapper) {
  await wrapper.find('#project').setValue(1)
  await wrapper.find('#discipline').setValue(1)
  await wrapper.find('#document-type').setValue('DWG')
  await wrapper.find('#title').setValue('Desenho da fuselagem central')
  await wrapper.find('#author').setValue('João Silva')
  await wrapper.find('#areas').setValue('EST')
}

describe('MetadataStep', () => {
  let store

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    listProjects.mockResolvedValue(PROJECTS)
    listDisciplines.mockResolvedValue(DISCIPLINES)
    await store.loadCatalogs()
  })

  it('should populate the project and discipline selects with API data', () => {
    // When
    const wrapper = mount(MetadataStep)
    // Then
    expect(wrapper.find('#project').text()).toContain('AK-2100 - Aeroestrutura de Fuselagem Central')
    expect(wrapper.find('#discipline').text()).toContain('EST - Estruturas')
  })

  it('should render code and revision as read-only', () => {
    // When
    const wrapper = mount(MetadataStep)
    // Then
    expect(wrapper.find('#code').attributes('readonly')).toBeDefined()
    expect(wrapper.find('#revision').attributes('readonly')).toBeDefined()
    expect(wrapper.find('#revision').element.value).toBe('REV01')
  })

  it('should keep "Próximo Passo" disabled while required fields are empty', () => {
    // When
    const wrapper = mount(MetadataStep)
    // Then
    expect(nextButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should build the code and enable the next step once required fields are filled', async () => {
    // Given
    const wrapper = mount(MetadataStep)
    // When
    await fillRequiredFields(wrapper)
    // Then
    expect(wrapper.find('#code').element.value).toBe('AK-2100-EST-DWG-REV01')
    expect(wrapper.text()).toContain('ENGENHARIA ESTRUTURAL')
    expect(nextButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('should emit next when submitting a valid form', async () => {
    // Given
    const wrapper = mount(MetadataStep)
    await fillRequiredFields(wrapper)
    // When
    await wrapper.find('form').trigger('submit')
    // Then
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('should not emit next when submitting an incomplete form', async () => {
    // Given
    const wrapper = mount(MetadataStep)
    // When
    await wrapper.find('form').trigger('submit')
    // Then
    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it('should remove an area when clicking the × on its tag', async () => {
    // Given
    store.form.areas = ['EST', 'QUA']
    const wrapper = mount(MetadataStep)
    // When
    await wrapper.find('button[aria-label="Remover Qualidade e Inspeção"]').trigger('click')
    // Then
    expect(store.form.areas).toEqual(['EST'])
  })

  it('should pre-fill the author with the logged-in user and allow editing', async () => {
    // Given
    store.setDefaultAuthor('João Silva')
    const wrapper = mount(MetadataStep)
    expect(wrapper.find('#author').element.value).toBe('João Silva')
    // When
    await wrapper.find('#author').setValue('Maria Souza')
    // Then
    expect(store.form.author).toBe('Maria Souza')
  })

  it('should block the next step when the pre-filled author is cleared', async () => {
    // Given
    const wrapper = mount(MetadataStep)
    await fillRequiredFields(wrapper)
    expect(nextButton(wrapper).attributes('disabled')).toBeUndefined()
    // When
    await wrapper.find('#author').setValue('')
    // Then
    expect(nextButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should show an error message when the catalogs fail to load', () => {
    // Given
    store.catalogsError = 'Não foi possível conectar ao servidor.'
    // When
    const wrapper = mount(MetadataStep)
    // Then
    expect(wrapper.find('[role="alert"]').text()).toContain('Não foi possível conectar ao servidor.')
  })
})
