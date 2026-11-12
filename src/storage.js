import { createProfile } from './domain'

export const STORAGE_KEY = '369-journal-v1'

export function createJournal() {
  return { version: 1, profiles: [], activeProfileId: null }
}

function isValidJournal(value) {
  return value && value.version === 1 && Array.isArray(value.profiles)
    && (value.profiles.length === 0 || value.profiles.every((profile) =>
      typeof profile.id === 'string' && typeof profile.name === 'string'
      && typeof profile.category === 'string' && typeof profile.desire === 'string'
      && profile.entries && typeof profile.entries === 'object'
      && typeof profile.reflection === 'string'))
    && (value.profiles.length === 0
      ? value.activeProfileId === null
      : value.profiles.some((profile) => profile.id === value.activeProfileId))
}

export function readJournal() {
  let stored
  try {
    stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return createJournal()
    const parsed = JSON.parse(stored)
    if (!isValidJournal(parsed)) throw new Error('invalid shape')
    return parsed
  } catch {
    throw new Error('Your saved journal could not be read. Export nothing or overwrite nothing until you restore a valid backup.')
  }
}

export function writeJournal(journal) {
  if (!isValidJournal(journal)) throw new Error('The journal data is incomplete and could not be saved.')
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journal))
  } catch {
    throw new Error('Your browser could not save this journal. Check available storage and keep a backup.')
  }
  return journal
}

export function addProfile(journal, name, category = '', desire = '') {
  const profile = createProfile(name, category, desire)
  const updated = {
    version: 1,
    profiles: [...journal.profiles, profile],
    activeProfileId: profile.id,
  }
  writeJournal(updated)
  return updated
}

export function setActiveProfile(journal, profileId) {
  if (!journal.profiles.some((profile) => profile.id === profileId)) {
    throw new Error('That profile could not be found.')
  }
  const updated = { ...journal, activeProfileId: profileId }
  writeJournal(updated)
  return updated
}
