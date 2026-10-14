import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Pagination from '../../src/components/common/Pagination.vue'

function mountPagination(props = {}) {
  return mount(Pagination, {
    props: {
      currentPage: 2,
      totalPages: 3,
      totalItems: 45,
      itemsPerPage: 20,
      itemsPerPageOptions: [5, 10, 20, 50],
      ...props,
    },
  })
}

describe('Pagination', () => {
  it('should summarize the range as documents by default', () => {
    const wrapper = mountPagination()

    expect(wrapper.find('.pagination-summary').text()).toBe('Mostrando 21 a 40 de 45 documentos')
  })

  it('should name the listed items when a label is given', () => {
    const wrapper = mountPagination({ itemLabel: 'revisões' })

    expect(wrapper.find('.pagination-summary').text()).toBe('Mostrando 21 a 40 de 45 revisões')
  })
})
