import { CircularProgress } from '@mui/material'
import { observer } from 'mobx-react-lite'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { useAuthGate } from './hooks/useAuthGate'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import { useStores } from './stores/StoresProvider'

const App = observer(function App() {
  const { authStore } = useStores()

  // Важливо: читаємо apiKey прямо в render, щоб observer гарантовано підписався на зміни.
  void authStore.apiKey

  const { authChecked, authOk, authMessage } = useAuthGate({ authStore })
  const location = useLocation()

  if (!authChecked) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '20vh', fontFamily: 'system-ui', gap: 12 }}>
        <CircularProgress size={28} />
        <div>Перевірка ключа…</div>
      </div>
    )
  }

  // За замовчуванням переходимо на потрібну сторінку.
  if (location.pathname === '/') {
    return <Navigate to={authOk ? '/map' : '/signin'} replace />
  }

  return (
    <Routes>
      <Route
        path="/signin"
        element={authOk ? <Navigate to="/map" replace /> : <LoginPage initialError={authMessage} />}
      />
      <Route path="/map" element={authOk ? <MapPage /> : <Navigate to="/signin" replace />} />
      <Route path="*" element={<Navigate to={authOk ? '/map' : '/signin'} replace />} />
    </Routes>
  )
})

export default App
