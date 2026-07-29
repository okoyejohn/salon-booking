import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

const services = [
  { name: 'Haircut', duration: '30 mins', price: 3000 },
  { name: 'Beard trim', duration: '15 mins', price: 1500 },
  { name: 'Wash and set', duration: '45 mins', price: 4000 },
]

const allTimes = ['10:00am', '11:30am', '1:00pm', '2:30pm', '4:00pm']

function App() {
  const [view, setView] = useState('book')
  const [selectedService, setSelectedService] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [name, setName] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [bookedTimes, setBookedTimes] = useState([])

  const fetchBookings = async () => {
    setLoadingBookings(true)
    const { data, error } = await supabase
      .from('booking')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setBookings(data)
    setLoadingBookings(false)
  }

  const fetchBookedTimes = async () => {
    const { data, error } = await supabase.from('booking').select('time_slot')
    if (!error) setBookedTimes(data.map((b) => b.time_slot))
  }

  useEffect(() => {
    fetchBookedTimes()
  }, [])

  useEffect(() => {
    if (view === 'dashboard') {
      fetchBookings()
    }
  }, [view])

  const handleConfirm = async () => {
    setSaving(true)
    setError('')

    // Re-check right before saving, in case someone else just took this slot
    const { data: freshBooked } = await supabase
      .from('booking')
      .select('time_slot')
      .eq('time_slot', selectedTime)

    if (freshBooked && freshBooked.length > 0) {
      setError('Sorry, that time was just taken. Please pick another.')
      setSaving(false)
      setSelectedTime(null)
      fetchBookedTimes()
      return
    }

    const { error } = await supabase.from('booking').insert({
      customer_name: name,
      service: selectedService.name,
      price: selectedService.price,
      time_slot: selectedTime,
    })

    setSaving(false)

    if (error) {
      setError('Something went wrong, please try again.')
      console.error(error)
    } else {
      setConfirmed(true)
      fetchBookedTimes()
    }
  }

  const availableTimes = allTimes.filter((t) => !bookedTimes.includes(t))

  return (
    <div className="page">
      <h1>Bella's Salon</h1>

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
          <p>Choose a service and time to book</p>

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
              {availableTimes.length === 0 && <p>No times left today.</p>}
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
              ✅ Booking confirmed for {name} — {selectedService.name} at {selectedTime}
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
                <strong>{b.customer_name}</strong> — {b.service} — {b.time_slot} — ₦{b.price}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default App