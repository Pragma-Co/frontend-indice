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
    const wrapper = mount(MetadataStep)

    expect(wrapper.find('#project').text()).toContain(
      'AK-2100 - Aeroestrutura de Fuselagem Central',
    )
    expect(wrapper.find('#discipline').text()).toContain('EST - Estruturas')
  })

  it('should render code and revision as read-only', () => {
    const wrapper = mount(MetadataStep)

    expect(wrapper.find('#code').attributes('readonly')).toBeDefined()
    expect(wrapper.find('#revision').attributes('readonly')).toBeDefined()
    expect(wrapper.find('#revision').element.value).toBe('REV01')
  })

  it('should keep "Próximo Passo" disabled while required fields are empty', () => {
    const wrapper = mount(MetadataStep)

    expect(nextButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should build the code and enable the next step once required fields are filled', async () => {
    const wrapper = mount(MetadataStep)

    await fillRequiredFields(wrapper)

    expect(wrapper.find('#code').element.value).toBe('AK-2100-EST-DWG-####')
    expect(wrapper.text()).toContain('ENGENHARIA ESTRUTURAL')
    expect(nextButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('should emit next when submitting a valid form', async () => {
    const wrapper = mount(MetadataStep)
    await fillRequiredFields(wrapper)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('should not emit next when submitting an incomplete form', async () => {
    const wrapper = mount(MetadataStep)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it('should remove an area when clicking the × on its tag', async () => {
    store.form.areas = ['EST', 'QUA']
    const wrapper = mount(MetadataStep)

    await wrapper.find('button[aria-label="Remover Qualidade e Inspeção"]').trigger('click')

    expect(store.form.areas).toEqual(['EST'])
  })

  it('should pre-fill the author with the logged-in user and allow editing', async () => {
    store.setDefaultAuthor('João Silva')
    const wrapper = mount(MetadataStep)
    expect(wrapper.find('#author').element.value).toBe('João Silva')

    await wrapper.find('#author').setValue('Maria Souza')

    expect(store.form.author).toBe('Maria Souza')
  })

  it('should lock the discipline until a project is chosen when projects carry discipline_ids', async () => {
    store.projects = [
      { id: 1, code: 'AK-2100', name: 'Aeroestrutura', discipline_ids: [1] },
      { id: 2, code: 'BR-300', name: 'Trem de pouso', discipline_ids: [] },
    ]
    store.disciplines = [
      { id: 1, code: 'EST', name: 'Estruturas' },
      { id: 2, code: 'HID', name: 'Hidráulica' },
    ]
    const wrapper = mount(MetadataStep)
    expect(wrapper.find('#discipline').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('#discipline option').map((o) => o.text().trim())).toEqual([
      'Selecione o projeto primeiro',
    ])

    await wrapper.find('#project').setValue(1)

    const options = wrapper.findAll('#discipline option').map((o) => o.text().trim())
    expect(wrapper.find('#discipline').attributes('disabled')).toBeUndefined()
    expect(options).toEqual(['Selecione a disciplina', 'EST - Estruturas'])
  })

  it('should reset the discipline when the project changes to one that does not include it', async () => {
    store.projects = [
      { id: 1, code: 'AK-2100', name: 'Aeroestrutura', discipline_ids: [1] },
      { id: 2, code: 'BR-300', name: 'Trem de pouso', discipline_ids: [2] },
    ]
    store.disciplines = [
      { id: 1, code: 'EST', name: 'Estruturas' },
      { id: 2, code: 'HID', name: 'Hidráulica' },
    ]
    const wrapper = mount(MetadataStep)
    await wrapper.find('#project').setValue(1)
    await wrapper.find('#discipline').setValue(1)

    await wrapper.find('#project').setValue(2)

    expect(store.form.disciplineId).toBe('')
    expect(wrapper.find('#discipline').element.value).toBe('')
  })

  it('should show an inline error only after a required field is left empty', async () => {
    const wrapper = mount(MetadataStep)
    expect(wrapper.text()).not.toContain('Título é obrigatório.')

    await wrapper.find('#title').trigger('focusout')

    expect(wrapper.text()).toContain('Título é obrigatório.')
    expect(wrapper.find('#title').element.closest('.field').classList).toContain('field--invalid')
  })

  it('should show a backend field error right away and clear it when the field changes', async () => {
    store.serverErrors = { title: 'Title is required.' }
    const wrapper = mount(MetadataStep)
    expect(wrapper.text()).toContain('Title is required.')

    await wrapper.find('#title').setValue('Desenho da fuselagem central')

    expect(wrapper.text()).not.toContain('Title is required.')
    expect(store.serverErrors).toEqual({})
  })

  it('should clear the inline error once the field is filled', async () => {
    const wrapper = mount(MetadataStep)
    await wrapper.find('#title').trigger('focusout')

    await wrapper.find('#title').setValue('Desenho da fuselagem central')

    expect(wrapper.text()).not.toContain('Título é obrigatório.')
  })

  it('should show the author error under the author block when it is cleared', async () => {
    store.setDefaultAuthor('João Silva')
    const wrapper = mount(MetadataStep)

    await wrapper.find('#author').setValue('')
    await wrapper.find('#author').trigger('blur')

    expect(wrapper.find('.metadata__author-error').text()).toBe('Responsável/Autor é obrigatório.')
  })

  it('should block the next step when the pre-filled author is cleared', async () => {
    const wrapper = mount(MetadataStep)
    await fillRequiredFields(wrapper)
    expect(nextButton(wrapper).attributes('disabled')).toBeUndefined()

    await wrapper.find('#author').setValue('')

    expect(nextButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should show an error message when the catalogs fail to load', () => {
    store.catalogsError = 'Não foi possível conectar ao servidor.'

    const wrapper = mount(MetadataStep)

    expect(wrapper.find('[role="alert"]').text()).toContain(
      'Não foi possível conectar ao servidor.',
    )
  })

  it('should show the AI badge on fields pre-filled by a suggestion', () => {
    store.applySuggestions({ title: 'Desenho da fuselagem central', documentType: 'DWG' })
    const wrapper = mount(MetadataStep)
    expect(wrapper.find('#title').element.value).toBe('Desenho da fuselagem central')
    const titleField = wrapper.find('#title').element.closest('.field')
    expect(titleField.classList).toContain('field--suggested')
    expect(titleField.textContent).toContain('Sugerido por IA')
    const descriptionField = wrapper.find('#description').element.closest('.field')
    expect(descriptionField.classList).not.toContain('field--suggested')
  })

  it('should drop the suggested flag for a field once the user edits it', async () => {
    store.applySuggestions({ title: 'Desenho da fuselagem central' })
    const wrapper = mount(MetadataStep)
    await wrapper.find('#title').setValue('Novo título editado')
    expect(store.isFieldSuggested('title')).toBe(false)
    expect(wrapper.find('#title').element.closest('.field').classList).not.toContain(
      'field--suggested',
    )
  })

  it('should drop the suggested flag on the areas field when a tag is removed', async () => {
    store.applySuggestions({ areas: ['EST', 'QUA'] })
    const wrapper = mount(MetadataStep)
    await wrapper.find('button[aria-label="Remover Qualidade e Inspeção"]').trigger('click')
    expect(store.isFieldSuggested('areas')).toBe(false)
  })
})
