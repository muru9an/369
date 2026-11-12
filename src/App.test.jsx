import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('journal app', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 12, 8, 0, 0))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('guides a new profile through choosing an intention', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Ari' } })
    fireEvent.click(screen.getByRole('button', { name: /wealth/i }))
    fireEvent.change(screen.getByLabelText(/your desire/i), { target: { value: 'I welcome steady abundance' } })
    fireEvent.click(screen.getByRole('button', { name: /begin my journey/i }))

    expect(screen.getByText(/day 1 of 33/i)).toBeInTheDocument()
    expect(screen.getByText(/i welcome steady abundance/i)).toBeInTheDocument()
  })

  it('shows separate profiles and backup controls in settings', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Ari' } })
    fireEvent.click(screen.getByRole('button', { name: /my own path/i }))
    fireEvent.change(screen.getByLabelText(/your desire/i), { target: { value: 'I trust my pace' } })
    fireEvent.click(screen.getByRole('button', { name: /begin my journey/i }))
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))

    expect(screen.getByRole('button', { name: /export journal backup/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Switch profile', { selector: 'select#settings-profile-switch' })).toBeInTheDocument()
    expect(screen.getByText(/everything is saved in this browser/i)).toBeInTheDocument()
  })

  it('saves the first writing step and keeps its progress on the profile', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Ari' } })
    fireEvent.click(screen.getByRole('button', { name: /wealth/i }))
    fireEvent.change(screen.getByLabelText(/your desire/i), { target: { value: 'I welcome steady abundance' } })
    fireEvent.click(screen.getByRole('button', { name: /begin my journey/i }))
    fireEvent.click(screen.getByRole('button', { name: /write/i }))
    fireEvent.change(screen.getByLabelText(/your writing/i), { target: { value: 'I welcome steady abundance\nI welcome steady abundance\nI welcome steady abundance' } })
    fireEvent.click(screen.getByRole('button', { name: /save this writing/i }))

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('3', { selector: 'strong' })).toBeInTheDocument()
  })
})
