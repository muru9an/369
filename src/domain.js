export const DAY_LIMIT = 33
export const SLOT_CONFIG = [
  { id: 'morning', label: 'Three', timeLabel: 'Morning', repetitions: 3, unlockHour: 6 },
  { id: 'midday', label: 'Six', timeLabel: 'Midday', repetitions: 6, unlockHour: 12 },
  { id: 'evening', label: 'Nine', timeLabel: 'Evening', repetitions: 9, unlockHour: 18 },
]

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`
const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function createProfile(name, category = '', desire = '') {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Add a name for this profile.')
  return {
    id: makeId(),
    name: cleanName,
    category,
    desire: desire.trim(),
    createdAt: new Date().toISOString(),
    entries: {},
    reflection: '',
    reflectionUpdatedAt: null,
  }
}

function isDayComplete(profile, day) {
  return SLOT_CONFIG.every((slot) => Boolean(profile.entries?.[day]?.slots?.[slot.id]))
}

export function getJourneyProgress(profile) {
  let daysComplete = 0
  for (let day = 1; day <= DAY_LIMIT; day += 1) {
    if (!isDayComplete(profile, day)) break
    daysComplete += 1
  }

  const seedsSown = Object.values(profile.entries ?? {}).reduce(
    (total, entry) => total + Object.values(entry.slots ?? {}).reduce((count, slot) => count + slot.repetitions, 0),
    0,
  )
  const completedDates = [...new Set(
    Object.values(profile.entries ?? {})
      .filter((entry) => SLOT_CONFIG.every((slot) => Boolean(entry.slots?.[slot.id])))
      .map((entry) => entry.completedAt ?? entry.date),
  )].sort().reverse()

  let streak = 0
  let expected = completedDates[0]
  for (const date of completedDates) {
    if (date !== expected) break
    streak += 1
    const previous = new Date(`${date}T12:00:00`)
    previous.setDate(previous.getDate() - 1)
    expected = localDateKey(previous)
  }

  return {
    daysComplete,
    daysLeft: DAY_LIMIT - daysComplete,
    seedsSown,
    streak,
    currentDay: Math.min(daysComplete + 1, DAY_LIMIT),
    isComplete: daysComplete === DAY_LIMIT,
  }
}

export function getSlotState(profile, slotId, now = new Date()) {
  const slotIndex = SLOT_CONFIG.findIndex((slot) => slot.id === slotId)
  if (slotIndex < 0) throw new Error('That writing step does not exist.')

  const progress = getJourneyProgress(profile)
  if (progress.isComplete) return 'complete'
  const day = progress.currentDay
  if (day > 1 && (profile.entries?.[day - 1]?.completedAt ?? '') >= localDateKey(now)) return 'tomorrow'
  const entry = profile.entries?.[day]
  if (entry?.slots?.[slotId]) return 'complete'
  if (slotIndex > 0 && !entry?.slots?.[SLOT_CONFIG[slotIndex - 1].id]) return 'locked'
  if (now.getHours() < SLOT_CONFIG[slotIndex].unlockHour) return 'locked'
  return 'open'
}

export function saveSlotEntry(profile, slotId, text, now = new Date()) {
  const slot = SLOT_CONFIG.find((item) => item.id === slotId)
  if (!slot) throw new Error('That writing step does not exist.')
  if (getSlotState(profile, slotId, now) !== 'open') throw new Error('This writing step is not open yet.')

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length !== slot.repetitions || lines.some((line) => line !== profile.desire)) {
    throw new Error(`Write your desire exactly ${slot.repetitions} times, one time per line.`)
  }

  const day = getJourneyProgress(profile).currentDay
  const prior = profile.entries?.[day] ?? { date: localDateKey(now), slots: {} }
  const slots = {
    ...prior.slots,
    [slotId]: { text: lines.join('\n'), repetitions: slot.repetitions, savedAt: now.toISOString() },
  }
  const complete = SLOT_CONFIG.every((item) => Boolean(slots[item.id]))
  return {
    ...profile,
    entries: {
      ...profile.entries,
      [day]: {
        ...prior,
        slots,
        ...(complete ? { completedAt: localDateKey(now) } : {}),
      },
    },
  }
}

export function exportJournal(journal) {
  return JSON.stringify({
    format: '369-journal-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...journal,
  }, null, 2)
}

function validProfile(profile) {
  return profile && typeof profile === 'object'
    && typeof profile.id === 'string' && profile.id.length > 0
    && typeof profile.name === 'string' && profile.name.trim().length > 0
    && typeof profile.category === 'string'
    && typeof profile.desire === 'string'
    && profile.entries && typeof profile.entries === 'object' && !Array.isArray(profile.entries)
    && typeof profile.reflection === 'string'
}

export function importJournal(serialized) {
  try {
    const backup = typeof serialized === 'string' ? JSON.parse(serialized) : serialized
    const valid = backup?.format === '369-journal-backup'
      && backup.version === 1
      && Array.isArray(backup.profiles)
      && backup.profiles.length > 0
      && backup.profiles.every(validProfile)
      && new Set(backup.profiles.map((profile) => profile.id)).size === backup.profiles.length
      && backup.profiles.some((profile) => profile.id === backup.activeProfileId)
    if (!valid) throw new Error('invalid format')
    return { profiles: backup.profiles, activeProfileId: backup.activeProfileId }
  } catch {
    throw new Error('This file is not a valid journal backup.')
  }
}
