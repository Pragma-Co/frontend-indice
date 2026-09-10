import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ConfirmationStep from '../../src/components/document-upload/ConfirmationStep.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'

vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))

function publishButton(wrapper) {
  return wrapper.findAll('button').find((b) => b.text().startsWith('Publicar') || b.text().startsWith('Publicando'))
}

function fillValidForm(store) {
  store.form.title = 'Desenho da fuselagem central'
  store.form.projectId = 1
  store.form.disciplineId = 1
  store.form.documentType = 'DWG'
  store.form.description = 'Desenho de conjunto da fuselagem central'
  store.form.author = 'João Silva'
  store.form.areas = ['EST', 'QUA']
  store.form.confidentiality = 'SECRET'
}

describe('ConfirmationStep', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    store.projects = [{ id: 1, code: 'AK-2100', name: 'Aeroestrutura de Fuselagem Central' }]
    store.disciplines = [{ id: 1, code: 'EST', name: 'Estruturas' }]
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 15))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render the summary faithfully from the data filled in step 2', () => {
    // Given
    fillValidForm(store)
    // When
    const wrapper = mount(ConfirmationStep)
    const text = wrapper.text()
    // Then
    expect(wrapper.find('[data-testid="document-code"]').text()).toBe('AK-2100-EST-DWG-REV01')
    expect(text).toContain('REV01')
    expect(text).toContain('15/09/2026')
    expect(text).toContain('João Silva')
    expect(text).toContain('DWG - Desenho Técnico')
    expect(text).toContain('EST - Estruturas')
    expect(text).toContain('Sigiloso')
    expect(text).toContain('Engenharia Estrutural')
    expect(text).toContain('Qualidade e Inspeção')
    expect(text).toContain('Desenho de conjunto da fuselagem central')
  })

  it('should render tags and confidentiality as badges', () => {
    // Given
    fillValidForm(store)
    // When
    const wrapper = mount(ConfirmationStep)
    const badges = wrapper.findAll('.badge').map((b) => b.text())
    // Then
    expect(badges).toContain('Sigiloso')
    expect(badges).toContain('Engenharia Estrutural')
    expect(badges).toContain('Qualidade e Inspeção')
    expect(wrapper.find('.badge-secret').exists()).toBe(true)
  })

  it('should show dashes for empty fields and list the missing required ones', () => {
    // When
    const wrapper = mount(ConfirmationStep)
    // Then
    expect(wrapper.find('[data-testid="document-code"]').text()).toBe('—')
    expect(wrapper.find('[role="alert"]').text()).toContain('Título é obrigatório.')
  })

  it('should render the reserved preview container', () => {
    // When
    const wrapper = mount(ConfirmationStep)
    // Then
    expect(wrapper.find('[data-testid="preview-container"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Pré-visualização')
  })

  it('should keep "Publicar" disabled while required fields are missing', () => {
    // When
    const wrapper = mount(ConfirmationStep)
    // Then
    expect(publishButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should emit publish when the form is complete', async () => {
    // Given
    fillValidForm(store)
    const wrapper = mount(ConfirmationStep)
    // When
    await publishButton(wrapper).trigger('click')
    // Then
    expect(wrapper.emitted('publish')).toHaveLength(1)
  })

  it('should show the loading state and block both actions while publishing', () => {
    // Given
    fillValidForm(store)
    store.publishing = true
    // When
    const wrapper = mount(ConfirmationStep)
    const publish = publishButton(wrapper)
    const back = wrapper.findAll('button').find((b) => b.text() === 'Anterior')
    // Then
    expect(publish.text()).toContain('Publicando')
    expect(publish.attributes('disabled')).toBeDefined()
    expect(publish.attributes('aria-busy')).toBe('true')
    expect(back.attributes('disabled')).toBeDefined()
  })

  it('should emit back without touching the filled data', async () => {
    // Given
    fillValidForm(store)
    const wrapper = mount(ConfirmationStep)
    // When
    await wrapper.findAll('button').find((b) => b.text() === 'Anterior').trigger('click')
    // Then
    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(store.form.title).toBe('Desenho da fuselagem central')
    expect(store.form.areas).toEqual(['EST', 'QUA'])
  })
})
