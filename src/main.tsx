import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import { StoresProvider } from './stores/StoresProvider'
import { createRootStore } from './stores/rootStore'

const theme = createTheme({
  palette: {
    mode: 'light',
  },
})

const rootStore = createRootStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoresProvider value={rootStore}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </StoresProvider>
  </StrictMode>,
)
