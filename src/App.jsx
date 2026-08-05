import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import './App.css'

const services = [
  { name: 'Haircut', duration: '30 mins', price: 3000 },
  { name: 'Beard trim', duration: '15 mins', price: 1500 },
  { name: 'Wash and set', duration: '45 mins', price: 4000 },
]

const allTimes = ['10:00am', '11:30am', '1:00pm', '2:30pm', '4:00pm']

function getDateString(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

function formatDateLabel(offsetDays) {
  if (offsetDays === 0) return 'Today'
  if (offsetDays === 1) return 'Tomorrow'
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

const dateOptions = [0, 1, 2, 3, 4].map((offset) => ({
  value: getDateString(offset),
  label: formatDateLabel(offset),
}))

function App() {
  const [session, setSession] = useState(null)
  const [business, setBusiness] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const [view, setView] = useState('book')
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [name, setName] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [bookedTimes, setBookedTimes] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCheckingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchBusiness()
    }
  }, [session])

  const fetchBusiness = async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', session.user.id)
      .single()

    if (!error) setBusiness(data)
  }

  const fetchBookings = async () => {
    setLoadingBookings(true)
    const { data, error } = await supabase
      .from('booking')
      .select('*')
      .order('booking_date', { ascending: true })
      .order('created_at', { ascending: false })

    if (!error) setBookings(data)
    setLoadingBookings(false)
  }

  const fetchBookedTimes = async (date) => {
    const { data, error } = await supabase
      .from('booking')
      .select('time_slot')
      .eq('booking_date', date)

    if (!error) setBookedTimes(data.map((b) => b.time_slot))
  }

  useEffect(() => {
    fetchBookedTimes(selectedDate)
    setSelectedTime(null)
  }, [selectedDate])

  useEffect(() => {
    if (view === 'dashboard') {
      fetchBookings()
    }
  }, [view])

  const handleConfirm = async () => {
    setSaving(true)
    setError('')

    const { data: freshBooked } = await supabase
      .from('booking')
      .select('time_slot')
      .eq('booking_date', selectedDate)
      .eq('time_slot', selectedTime)

    if (freshBooked && freshBooked.length > 0) {
      setError('Sorry, that time was just taken. Please pick another.')
      setSaving(false)
      setSelectedTime(null)
      fetchBookedTimes(selectedDate)
      return
    }

    const { error } = await supabase.from('booking').insert({
      customer_name: name,
      service: selectedService.name,
      price: selectedService.price,
      time_slot: selectedTime,
      booking_date: selectedDate,
    })

    setSaving(false)

    if (error) {
      setError('Something went wrong, please try again.')
    } else {
      setConfirmed(true)
      fetchBookedTimes(selectedDate)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setBusiness(null)
  }

  const availableTimes = allTimes.filter((t) => !bookedTimes.includes(t))

  if (checkingSession) {
    return <div className="page"><p>Loading...</p></div>
  }

  if (!session) {
    return <Auth onAuthSuccess={() => {}} />
  }

  return (
    <div className="page">
      <h1>{business ? business.business_name : 'QuickSlot'}</h1>
      <button onClick={handleLogout} style={{ marginBottom: 16, background: 'none', border: 'none', color: '#b5654a', textDecoration: 'underline', cursor: 'pointer' }}>
        Log out
      </button>

      <div className="tabs">
        <button
          className={view === 'book' ? 'tab active' : 'tab'}
          onClick={() => setView('book')}
        >
          Book
        </button>
        <button
          className={view === 'dashboard' ? 'tab active' : 'tab'}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
      </div>

      {view === 'book' && (
        <>
          <p>Choose a date, service and time to book</p>

          <h2>Date</h2>
          <div className="list horizontal">
            {dateOptions.map((d) => (
              <button
                key={d.value}
                className={selectedDate === d.value ? 'selected' : ''}
                onClick={() => {
                  setSelectedDate(d.value)
                  setConfirmed(false)
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          <h2>Services</h2>
          <div className="list">
            {services.map((service) => (
              <button
                key={service.name}
                className={selectedService === service ? 'selected' : ''}
                onClick={() => setSelectedService(service)}
              >
                {service.name} — {service.duration} — ₦{service.price}
              </button>
            ))}
          </div>

          {selectedService && (
            <>
              <h2>Available times</h2>
              {availableTimes.length === 0 && <p>No times left for this day.</p>}
              <div className="list">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    className={selectedTime === time ? 'selected' : ''}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedTime && !confirmed && (
            <>
              <h2>Your name</h2>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
              <button className="confirm" onClick={handleConfirm} disabled={saving || !name}>
                {saving ? 'Saving...' : 'Confirm booking'}
              </button>
              {error && <p style={{ color: 'red' }}>{error}</p>}
            </>
          )}

          {confirmed && (
            <p className="success">
              ✅ Booking confirmed for {name} — {selectedService.name} on{' '}
              {dateOptions.find((d) => d.value === selectedDate)?.label} at {selectedTime}
            </p>
          )}
        </>
      )}

      {view === 'dashboard' && (
        <>
          <p>All bookings</p>
          {loadingBookings && <p>Loading...</p>}
          {!loadingBookings && bookings.length === 0 && <p>No bookings yet.</p>}
          <div className="list">
            {bookings.map((b) => (
              <div key={b.id} className="booking-row">
                <strong>{b.customer_name}</strong> — {b.service} — {b.booking_date} —{' '}
                {b.time_slot} — ₦{b.price}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default App