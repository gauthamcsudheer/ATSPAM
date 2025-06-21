import { useState, useEffect } from 'react'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (err) {
        console.error('Error parsing saved user:', err)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    setShowRegister(false)
  }

  const handleRegister = (userData) => {
    // After successful registration, show login form
    setShowRegister(false)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const toggleAuthMode = () => {
    setShowRegister(!showRegister)
  }

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />
  }

  return (
    <div className="app">
      {showRegister ? (
        <Register onRegister={handleRegister} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
      
      <div className="auth-toggle">
        {showRegister ? (
          <p>
            Already have an account?{' '}
            <button onClick={toggleAuthMode} className="toggle-button">
              Sign in here
        </button>
          </p>
        ) : (
        <p>
            Don't have an account?{' '}
            <button onClick={toggleAuthMode} className="toggle-button">
              Create account here
            </button>
        </p>
        )}
      </div>
    </div>
  )
}

export default App
