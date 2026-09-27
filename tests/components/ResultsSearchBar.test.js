import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsSearchBar from '@/views/document/components/ResultsSearchBar.vue'

describe('ResultsSearchBar', () => {
  it('should start with the term that came from the URL', () => {
    const wrapper = mount(ResultsSearchBar, { props: { term: 'tubulação' } })

    expect(wrapper.find('input').element.value).toBe('tubulação')
  })

  it('should emit the trimmed term when searching again', async () => {
    const wrapper = mount(ResultsSearchBar, { props: { term: 'tubulação' } })

    await wrapper.find('input').setValue('  válvulas  ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('search')).toEqual([['válvulas']])
  })

  it('should follow the URL when the term changes from outside', async () => {
    const wrapper = mount(ResultsSearchBar, { props: { term: 'tubulação' } })

    await wrapper.setProps({ term: 'caverna' })

    expect(wrapper.find('input').element.value).toBe('caverna')
  })
})
