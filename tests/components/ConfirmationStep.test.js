import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ConfirmationStep from '../../src/components/document-upload/ConfirmationStep.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'
import { useUploadStore } from '../../src/stores/uploadStore'

vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))

function publishButton(wrapper) {
  return wrapper
    .findAll('button')
    .find((b) => b.text().startsWith('Publicar') || b.text().startsWith('Publicando'))
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
    store.documentTypes = [{ id: 'DWG', code: 'DWG', name: 'Desenho Técnico' }]
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 15))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render the summary faithfully from the data filled in step 2', () => {
    fillValidForm(store)
    const wrapper = mount(ConfirmationStep)
    const text = wrapper.text()
    expect(wrapper.find('[data-testid="document-code"]').text()).toBe('AK-2100-EST-DWG-####')
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
    fillValidForm(store)
    const wrapper = mount(ConfirmationStep)
    const badges = wrapper.findAll('.badge').map((b) => b.text())
    expect(badges).toContain('Sigiloso')
    expect(badges).toContain('Engenharia Estrutural')
    expect(badges).toContain('Qualidade e Inspeção')
    expect(wrapper.find('.badge-secret').exists()).toBe(true)
  })

  it('should show dashes for empty fields without listing validation messages', () => {
    const wrapper = mount(ConfirmationStep)
    expect(wrapper.find('[data-testid="document-code"]').text()).toBe('—')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('obrigatório')
  })

  it('should list the files attached in the upload step with type icon and size', () => {
    useUploadStore().setUploadedDocuments([
      { id: 'up-1', name: 'relatorio.pdf', size: 1536, typeLabel: 'Memorial' },
      { id: 'up-2', name: 'foto.png', size: 500, typeLabel: 'Imagem' },
    ])
    const wrapper = mount(ConfirmationStep)
    const rows = wrapper.findAll('.preview-file')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('relatorio.pdf')
    expect(rows[0].text()).toContain('1.5 KB')
    expect(rows[0].find('.file-icon').attributes('data-kind')).toBe('pdf')
    expect(rows[1].find('.file-icon').attributes('data-kind')).toBe('image')
  })

  it('should show a placeholder in the preview container when no file was attached', () => {
    const wrapper = mount(ConfirmationStep)
    expect(wrapper.find('[data-testid="preview-container"]').text()).toContain(
      'Nenhum arquivo anexado',
    )
    expect(wrapper.text()).toContain('Pré-visualização')
  })

  it('should keep "Publicar" disabled while required fields are missing', () => {
    const wrapper = mount(ConfirmationStep)
    expect(publishButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should emit publish when the form is complete', async () => {
    fillValidForm(store)
    const wrapper = mount(ConfirmationStep)
    await publishButton(wrapper).trigger('click')
    expect(wrapper.emitted('publish')).toHaveLength(1)
  })

  it('should show the loading state and block both actions while publishing', () => {
    fillValidForm(store)
    store.publishing = true
    const wrapper = mount(ConfirmationStep)
    const publish = publishButton(wrapper)
    const back = wrapper.findAll('button').find((b) => b.text() === 'Anterior')
    expect(publish.text()).toContain('Publicando')
    expect(publish.attributes('disabled')).toBeDefined()
    expect(publish.attributes('aria-busy')).toBe('true')
    expect(back.attributes('disabled')).toBeDefined()
  })

  it('should emit back without touching the filled data', async () => {
    fillValidForm(store)
    const wrapper = mount(ConfirmationStep)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Anterior')
      .trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(store.form.title).toBe('Desenho da fuselagem central')
    expect(store.form.areas).toEqual(['EST', 'QUA'])
  })
})
