import { beforeEach, describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  addProfile,
  createJournal,
  readJournal,
  setActiveProfile,
  writeJournal,
} from './storage'

describe('local journal storage', () => {
  beforeEach(() => localStorage.clear())

  it('creates a separate named profile without replacing existing writing', () => {
    const initial = createJournal()
    const withFirst = addProfile(initial, 'Ari')
    const firstId = withFirst.activeProfileId
    withFirst.profiles[0].desire = 'My own intention'
    writeJournal(withFirst)
    const withSecond = addProfile(readJournal(), 'Sam')

    expect(withSecond.profiles).toHaveLength(2)
    expect(withSecond.profiles[0]).toMatchObject({ id: firstId, desire: 'My own intention' })
    expect(withSecond.activeProfileId).toBe(withSecond.profiles[1].id)
  })

  it('switches the active profile and persists the selection', () => {
    const first = addProfile(createJournal(), 'Ari')
    const second = addProfile(first, 'Sam')
    const switched = setActiveProfile(second, first.profiles[0].id)

    expect(readJournal()).toMatchObject({ activeProfileId: first.profiles[0].id })
    expect(switched.activeProfileId).toBe(first.profiles[0].id)
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"profiles"')
  })

  it('surfaces invalid saved data instead of silently overwriting it', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(() => readJournal()).toThrow(/could not be read/i)
  })
})
