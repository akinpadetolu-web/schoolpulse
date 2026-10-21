// Loaded first on purpose: it installs the error guard before any other error
// listener (PostHog exception autocapture, platform reporting) is registered.
import '@/lib/resizeObserverGuard.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/lib/posthog.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)