import { afterEach, describe, expect, it } from 'vitest'
import { clearCookie, readCookie } from '../../src/utils/cookies'

describe('cookies', () => {
  afterEach(() => {
    clearCookie('csrftoken')
    clearCookie('theme')
  })

  it('should read a cookie by its exact name', () => {
    const source = { cookie: 'theme=dark; csrftoken=abc%3D123; xcsrftoken=other' }

    expect(readCookie('csrftoken', source)).toBe('abc=123')
    expect(readCookie('theme', source)).toBe('dark')
  })

  it('should return null when the cookie does not exist', () => {
    expect(readCookie('csrftoken', { cookie: 'theme=dark' })).toBeNull()
    expect(readCookie('csrftoken', { cookie: '' })).toBeNull()
    expect(readCookie('csrftoken', null)).toBeNull()
  })

  it('should remove a cookie from the browser', () => {
    document.cookie = 'csrftoken=abc; path=/'
    document.cookie = 'theme=dark; path=/'

    clearCookie('csrftoken')

    expect(readCookie('csrftoken')).toBeNull()
    expect(readCookie('theme')).toBe('dark')
  })
})
