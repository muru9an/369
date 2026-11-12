import { useMemo, useState } from 'react'
import { DAY_LIMIT, SLOT_CONFIG, exportJournal, getJourneyProgress, getSlotState, importJournal, saveSlotEntry } from './domain'
import { addProfile, createJournal, readJournal, setActiveProfile, writeJournal } from './storage'

const CATEGORIES = ['Wealth', 'Career & business', 'Health & energy', 'Love & relationships', 'Peace & mind', 'My own path']
const WORDING = {
  morning: 'I begin this day with a clear heart.',
  midday: 'I return to what matters, with steady attention.',
  evening: 'I release this day with gratitude.',
}

function StarDivider() {
  return <div className="star-divider" aria-hidden="true"><span>✦</span></div>
}

function ProgressSpiral({ complete }) {
  const points = Array.from({ length: DAY_LIMIT }, (_, index) => {
    const angle = (index / DAY_LIMIT) * Math.PI * 2 - Math.PI / 2
    const radius = 30 + index * 1.65
    return { x: 150 + Math.cos(angle) * radius, y: 150 + Math.sin(angle) * radius, active: index < complete }
  })

  return (
    <svg className="spiral" viewBox="0 0 300 300" role="img" aria-label={`${complete} of ${DAY_LIMIT} journey days complete`}>
      {[55, 88, 121].map((radius) => (
        <circle key={radius} cx="150" cy="150" r={radius} className="orbit" />
      ))}
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r={point.active ? 3.2 : 2.2} className={point.active ? 'orbit-dot active' : 'orbit-dot'} />
      ))}
      <circle cx="150" cy="150" r="13" className="spiral-sun" />
      <circle cx="150" cy="150" r="5" className="spiral-core" />
    </svg>
  )
}

function Setup({ onStart, onCancel, error, initialName = '' }) {
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState('')
  const [desire, setDesire] = useState('')
  const [formError, setFormError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!name.trim() || !category || !desire.trim()) {
      setFormError('Choose a focus and write the desire you want to carry through your 33 days.')
      return
    }
    try {
      onStart(name.trim(), category, desire.trim())
    } catch (reason) {
      setFormError(reason.message)
    }
  }

  return (
    <main className="setup-shell">
      <div className="brand-mark" aria-hidden="true">✦</div>
      <p className="eyebrow">A PRIVATE JOURNAL FOR YOUR BECOMING</p>
      <h1>One desire.<br /><span>One 33-day journey.</span></h1>
      <StarDivider />
      <p className="lede">Choose a focus. Return to it with a little care, three times a day.</p>
      {error && <p className="notice error" role="alert">{error}</p>}
      <form className="setup-card" onSubmit={submit}>
        <label className="field-label" htmlFor="profile-name">Your name</label>
        <input id="profile-name" autoComplete="name" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="What should we call you?" required />
        <span className="field-label">What are you calling in?</span>
        <div className="category-grid">
          {CATEGORIES.map((item) => (
            <button type="button" className={`category-button ${category === item ? 'selected' : ''}`} key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
        <label className="field-label" htmlFor="desire">Your desire</label>
        <textarea id="desire" rows="3" maxLength={180} value={desire} onChange={(event) => setDesire(event.target.value)} placeholder="Write one clear sentence to return to each day." required />
        {formError && <p className="notice error" role="alert">{formError}</p>}
        <button className="button primary wide" type="submit">{onCancel ? 'Save profile & begin' : 'Begin my journey'} <span aria-hidden="true">→</span></button>
        {onCancel && <button className="button quiet wide" type="button" onClick={onCancel}>Cancel</button>}
        <p className="privacy-caption">Your writing stays in this browser on this device. Profiles keep your journals separate, but are not password-protected.</p>
      </form>
    </main>
  )
}

function SlotCard({ slot, state, onWrite }) {
  return (
    <article className={`slot-card ${state}`}>
      <div className="slot-number">{state === 'complete' ? '✓' : slot.repetitions}</div>
      <div className="slot-copy">
        <h3>{slot.label}</h3>
        <p className="slot-time">{slot.timeLabel}</p>
        <p className="slot-state">{state === 'complete' ? 'Completed' : state === 'open' ? 'Ready when you are' : state === 'tomorrow' ? 'Continue tomorrow' : `Opens at ${String(slot.unlockHour).padStart(2, '0')}:00`}</p>
      </div>
      {state === 'open' && <button className="button small primary" type="button" onClick={() => onWrite(slot.id)}>Write</button>}
      {state === 'locked' && <span className="lock-icon" aria-label="Locked until its writing time">⌑</span>}
    </article>
  )
}

export default function App() {
  const [journal, setJournal] = useState(() => {
    try {
      return readJournal()
    } catch (error) {
      return createJournal()
    }
  })
  const [storageError, setStorageError] = useState(() => {
    try {
      readJournal()
      return ''
    } catch (error) {
      return error.message
    }
  })
  const [view, setView] = useState('today')
  const [writingSlot, setWritingSlot] = useState(null)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [reflection, setReflection] = useState('')
  const [restoreText, setRestoreText] = useState('')

  const profile = journal.profiles.find((item) => item.id === journal.activeProfileId) ?? null
  const progress = useMemo(() => profile ? getJourneyProgress(profile) : null, [profile])

  function persist(updated) {
    const saved = writeJournal(updated)
    setJournal(saved)
    setStorageError('')
    return saved
  }

  function startProfile(name, category, desire) {
    if (storageError) throw new Error('Restore a backup before starting a new profile so existing data is not overwritten.')
    const updated = addProfile(journal, name, category, desire)
    setJournal(updated)
    setShowSetup(false)
    setView('today')
    setMessage(`Welcome, ${name}. Your first day is ready.`)
  }

  function saveWriting(event) {
    event.preventDefault()
    try {
      const updatedProfile = saveSlotEntry(profile, writingSlot, draft)
      const updated = {
        ...journal,
        profiles: journal.profiles.map((item) => item.id === profile.id ? updatedProfile : item),
      }
      persist(updated)
      setWritingSlot(null)
      setDraft('')
      setMessage('Saved. Your words are yours to keep.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  function changeProfile(profileId) {
    try {
      setJournal(setActiveProfile(journal, profileId))
      setWritingSlot(null)
      setMessage('')
    } catch (error) {
      setMessage(error.message)
    }
  }

  function downloadBackup() {
    try {
      const blob = new Blob([exportJournal(journal)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `369-journal-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setMessage('Your backup file has been downloaded.')
    } catch {
      setMessage('The backup could not be downloaded. Try another browser or copy your journal text first.')
    }
  }

  async function restoreBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imported = importJournal(await file.text())
      persist({ version: 1, ...imported })
      setMessage('Backup restored on this device.')
      setView('today')
    } catch (error) {
      setMessage(error.message)
    }
  }

  function saveReflection(event) {
    event.preventDefault()
    try {
      const updatedProfile = { ...profile, reflection: reflection.trim(), reflectionUpdatedAt: new Date().toISOString() }
      persist({ ...journal, profiles: journal.profiles.map((item) => item.id === profile.id ? updatedProfile : item) })
      setMessage('Your reflection is saved.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  if (showSetup || (!profile && !storageError)) {
    return <Setup onStart={startProfile} onCancel={journal.profiles.length ? () => setShowSetup(false) : null} error={storageError} />
  }

  if (!profile && storageError) {
    return (
      <main className="recovery-shell">
        <div className="brand-mark" aria-hidden="true">✦</div>
        <p className="eyebrow">YOUR JOURNAL STAYS YOURS</p>
        <h1>Restore a <span>backup.</span></h1>
        <p className="lede">The saved browser data could not be read, so nothing has been changed. Select a valid 369 backup to continue.</p>
        <label className="button primary" htmlFor="recovery-file">Choose backup file</label>
        <input id="recovery-file" className="sr-only" type="file" accept=".json,application/json" onChange={restoreBackup} />
        <p className="notice error" role="alert">{storageError}</p>
        {message && <p role="status">{message}</p>}
      </main>
    )
  }

  const daySlots = profile.entries?.[progress.currentDay]?.slots ?? {}
  const completedDays = Object.entries(profile.entries ?? {}).filter(([, entry]) => SLOT_CONFIG.every((slot) => entry.slots?.[slot.id]))

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#today" onClick={(event) => { event.preventDefault(); setView('today') }}><span>✦</span> 369</a>
        <div className="profile-switch">
          <label className="sr-only" htmlFor="profile-switch">Switch profile</label>
          <select id="profile-switch" value={profile.id} onChange={(event) => changeProfile(event.target.value)} aria-label="Switch profile">
            {journal.profiles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </div>
      </header>

      <main className="content">
        {message && <p role="status" className="notice status-notice">{message}<button type="button" aria-label="Dismiss message" onClick={() => setMessage('')}>×</button></p>}
        {view === 'today' && (
          <>
            <div className="page-heading">
              <p className="eyebrow">YOUR INTENTION, YOUR PACE</p>
              <h1>Today, <span>with intention.</span></h1>
              <StarDivider />
              <p className="lede">A small practice, returned to gently.</p>
            </div>
            <section className="journey-panel">
              <div className="progress-heading"><span>Day {progress.currentDay} of {DAY_LIMIT}</span><span>{progress.daysComplete} complete</span></div>
              <div className="progress-track" role="progressbar" aria-label="Journey progress" aria-valuenow={progress.daysComplete} aria-valuemin={0} aria-valuemax={DAY_LIMIT}><span style={{ width: `${(progress.daysComplete / DAY_LIMIT) * 100}%` }} /></div>
              <div className="stats-row">
                <div><strong>{progress.streak}</strong><span>Day streak</span></div>
                <div><strong>{progress.seedsSown}</strong><span>Seeds sown</span></div>
                <div><strong>{progress.daysLeft}</strong><span>Days left</span></div>
              </div>
              <ProgressSpiral complete={progress.daysComplete} />
              <blockquote className="intention-quote">“{profile.desire}”</blockquote>
              <p className="prompt-line">{WORDING[writingSlot] ?? 'Make space for your intention, one line at a time.'}</p>
              {writingSlot && (
                <form className="writing-form" onSubmit={saveWriting}>
                  <p>Write your desire <strong>exactly {SLOT_CONFIG.find((slot) => slot.id === writingSlot).repetitions} times</strong>, one time per line.</p>
                  <textarea aria-label="Your writing" rows="6" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`${profile.desire}\n${profile.desire}`} required autoFocus />
                  <div className="button-row">
                    <button className="button primary" type="submit">Save this writing</button>
                    <button className="button quiet" type="button" onClick={() => { setWritingSlot(null); setDraft('') }}>Cancel</button>
                  </div>
                </form>
              )}
              <div className="slots-list">
                {SLOT_CONFIG.map((slot) => <SlotCard key={slot.id} slot={slot} state={getSlotState(profile, slot.id)} onWrite={setWritingSlot} />)}
              </div>
              <p className="privacy-caption">Your words stay in this browser. No account, no cloud, no tracking.</p>
            </section>
          </>
        )}

        {view === 'journey' && (
          <>
            <div className="page-heading">
              <p className="eyebrow">A LITTLE PROGRESS, EVERY DAY</p>
              <h1>Your journey <span>unfolds.</span></h1>
              <StarDivider />
              <p className="lede">Each complete day lights another point in your spiral.</p>
            </div>
            <section className="journey-panel">
              <div className="stats-row">
                <div><strong>{progress.streak}</strong><span>Day streak</span></div>
                <div><strong>{progress.seedsSown}</strong><span>Seeds sown</span></div>
                <div><strong>{progress.daysLeft}</strong><span>Days left</span></div>
              </div>
              <ProgressSpiral complete={progress.daysComplete} />
              <div className="day-grid" aria-label="Journey days">
                {Array.from({ length: DAY_LIMIT }, (_, index) => {
                  const day = index + 1
                  const done = SLOT_CONFIG.every((slot) => profile.entries?.[day]?.slots?.[slot.id])
                  return <div className={`day-dot ${done ? 'done' : ''}`} key={day} aria-label={`Day ${day}${done ? ', complete' : ', not complete'}`}>{done ? '✓' : day}</div>
                })}
              </div>
              {completedDays.length > 0 && <div className="journal-list"><h2>Completed days</h2>{completedDays.map(([day, entry]) => <article className="entry-card" key={day}><h3>Day {day}</h3><p>{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p><blockquote>“{profile.desire}”</blockquote></article>)}</div>}
              {progress.isComplete && <button className="button primary wide" type="button" onClick={() => { setReflection(profile.reflection); setView('reflection') }}>Write your day 33 reflection</button>}
            </section>
          </>
        )}

        {view === 'reflection' && (
          <section className="journey-panel reflection-panel">
            <p className="eyebrow">DAY 33 · A MOMENT TO NOTICE</p>
            <h1>Finish with <span>reflection.</span></h1>
            <StarDivider />
            <p className="lede">What shifted? What would you like to carry with you?</p>
            <div className="completion-note"><span>✓</span><div><strong>33 of 33 days complete</strong><small>{progress.seedsSown} seeds written.</small></div></div>
            <form className="writing-form" onSubmit={saveReflection}>
              <label className="field-label" htmlFor="reflection">Your reflection</label>
              <textarea id="reflection" rows="8" value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="Take a breath. Write what you notice." />
              <button className="button primary wide" type="submit">Save your reflection</button>
            </form>
          </section>
        )}

        {view === 'settings' && (
          <>
            <div className="page-heading compact">
              <p className="eyebrow">PRIVATE. OFFLINE. YOURS.</p>
              <h1>Your <span>settings.</span></h1>
              <StarDivider />
            </div>
            <section className="journey-panel settings-panel">
              <h2>Profiles on this device</h2>
              <p>Switch between journals without mixing entries. Profiles are for organization, not a security lock.</p>
              <label className="field-label" htmlFor="settings-profile-switch">Switch profile</label>
              <select id="settings-profile-switch" value={profile.id} onChange={(event) => changeProfile(event.target.value)}>
                {journal.profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button className="button secondary wide" type="button" onClick={() => setShowSetup(true)}>＋ Add another profile</button>
              <div className="settings-divider" />
              <h2>Your desire</h2>
              <p className="quote-small">“{profile.desire}” · {profile.category}</p>
              <div className="settings-divider" />
              <h2>Keep a backup</h2>
              <p>Export a copy before changing browsers or devices. Restoring replaces the journal currently saved in this browser.</p>
              <button className="button secondary wide" type="button" aria-label="Export journal backup" onClick={downloadBackup}>↓ Export journal backup</button>
              <label className="button quiet wide file-button" htmlFor="backup-file">↑ Restore from backup</label>
              <input id="backup-file" className="sr-only" type="file" accept=".json,application/json" onChange={restoreBackup} />
              <div className="privacy-card">
                <span className="privacy-symbol" aria-hidden="true">◇</span>
                <div><strong>Your words stay yours.</strong><p>Everything is saved in this browser on this device. No account, cloud sync, or tracking.</p><small>Works offline after the first visit.</small></div>
              </div>
              <p className="privacy-caption">Clearing browser data, using private browsing, or switching devices may remove or leave behind your journal. Keep an export somewhere safe.</p>
            </section>
          </>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {[['today', 'Today'], ['journey', 'Journey'], ['settings', 'Settings']].map(([key, label]) => (
          <button key={key} type="button" className={view === key ? 'active' : ''} aria-current={view === key ? 'page' : undefined} onClick={() => setView(key)}><span aria-hidden="true">{key === 'today' ? '◉' : key === 'journey' ? '⌁' : '⚙'}</span>{label}</button>
        ))}
      </nav>
    </div>
  )
}
