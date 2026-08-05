import { useState } from 'react'
import { supabase } from './supabaseClient'

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export default function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('signup') // 'signup' or 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async () => {
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (userId) {
      const slug = slugify(businessName)

      const { error: insertError } = await supabase.from('businesses').insert({
        owner_id: userId,
        business_name: businessName,
        slug: slug,
      })

      if (insertError) {
        setError('Account created, but business setup failed: ' + insertError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    onAuthSuccess()
  }

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onAuthSuccess()
  }

  const handleSubmit = () => {
    if (mode === 'signup') {
      handleSignup()
    } else {
      handleLogin()
    }
  }

  return (
    <div className="page">
      <h1>QuickSlot</h1>
      <p>Booking made simple for any small business</p>

      <div className="tabs">
        <button
          className={mode === 'signup' ? 'tab active' : 'tab'}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
        <button
          className={mode === 'login' ? 'tab active' : 'tab'}
          onClick={() => setMode('login')}
        >
          Log in
        </button>
      </div>

      {mode === 'signup' && (
        <>
          <h2>Business name</h2>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Bella's Salon"
          />
        </>
      )}

      <h2>Email</h2>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        type="email"
      />

      <h2>Password</h2>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 6 characters"
        type="password"
      />

      <button className="confirm" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}