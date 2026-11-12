import { describe, expect, it } from 'vitest'
import {
  DAY_LIMIT,
  SLOT_CONFIG,
  createProfile,
  exportJournal,
  getJourneyProgress,
  getSlotState,
  importJournal,
  saveSlotEntry,
} from './domain'

const at = (hour, day = 12) => new Date(2026, 2, day, hour, 0, 0)

describe('journal journey', () => {
  it('keeps progress and entries isolated between profiles', () => {
    const first = createProfile('Ari', 'Career & business', 'A calmer workday')
    const second = createProfile('Sam', 'Peace & mind', 'More room to breathe')
    const updated = saveSlotEntry(first, 'morning', 'A calmer workday\n'.repeat(3).trim(), at(8))

    expect(updated.entries).toHaveProperty('1')
    expect(second.entries).toEqual({})
    expect(getJourneyProgress(second).daysComplete).toBe(0)
    expect(getJourneyProgress(updated).seedsSown).toBe(3)
  })

  it('counts completed days and never exceeds the 33-day journey', () => {
    let profile = createProfile('Ari', 'Wealth', 'I welcome steady abundance')
    for (let day = 1; day <= DAY_LIMIT; day += 1) {
      for (const slot of SLOT_CONFIG) {
        profile = saveSlotEntry(
          profile,
          slot.id,
          `${profile.desire}\n`.repeat(slot.repetitions).trim(),
          at(slot.unlockHour + 1, 12 + day),
        )
      }
    }

    expect(getJourneyProgress(profile)).toMatchObject({
      daysComplete: 33,
      daysLeft: 0,
      seedsSown: 594,
      isComplete: true,
    })
  })

  it('unlocks writing in the morning, midday, and evening sequence', () => {
    const profile = createProfile('Ari', 'Health & energy', 'I care for my body')

    expect(getSlotState(profile, 'morning', at(5))).toBe('locked')
    expect(getSlotState(profile, 'morning', at(6))).toBe('open')
    expect(getSlotState(profile, 'midday', at(12))).toBe('locked')
    const afterMorning = saveSlotEntry(profile, 'morning', 'I care for my body\n'.repeat(3).trim(), at(8))
    expect(getSlotState(afterMorning, 'midday', at(12))).toBe('open')
    expect(getSlotState(afterMorning, 'evening', at(12))).toBe('locked')
  })

  it('starts the next journey day on a later calendar day, never by rushing all 33 in one sitting', () => {
    let profile = createProfile('Ari', 'Peace & mind', 'I make room for calm')
    for (const slot of SLOT_CONFIG) {
      profile = saveSlotEntry(
        profile,
        slot.id,
        `${profile.desire}\n`.repeat(slot.repetitions).trim(),
        at(slot.unlockHour + 1),
      )
    }
    expect(getSlotState(profile, 'morning', at(20))).toBe('tomorrow')
    expect(getSlotState(profile, 'morning', at(8, 13))).toBe('open')
  })

  it('rejects a slot submission unless the affirmation is repeated exactly', () => {
    const profile = createProfile('Ari', 'Wealth', 'I welcome abundance')

    expect(() => saveSlotEntry(profile, 'morning', 'I welcome abundance', at(8))).toThrow(/exactly 3 times/i)
  })

  it('round-trips an exported journal and rejects malformed imports', () => {
    const profile = createProfile('Ari', 'My own path', 'I trust my pace')
    const payload = exportJournal({ profiles: [profile], activeProfileId: profile.id })

    expect(importJournal(payload)).toMatchObject({ profiles: [profile], activeProfileId: profile.id })
    expect(() => importJournal('{"profiles":[{"name":"broken"}]}')).toThrow(/valid journal backup/i)
  })
})
