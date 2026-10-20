import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/lib/posthog.js'
import { installResizeObserverGuard } from '@/lib/resizeObserverGuard.js'

installResizeObserverGuard()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)