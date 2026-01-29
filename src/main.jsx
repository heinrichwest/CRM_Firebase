import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Error boundary so a render error shows a message instead of a blank screen
class RootErrorBoundary extends React.Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Root error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 24,
          fontFamily: 'Roboto, sans-serif',
          maxWidth: 600,
          margin: '40px auto',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 8
        }}>
          <h1 style={{ color: '#c00', marginBottom: 16 }}>Something went wrong</h1>
          <pre style={{ overflow: 'auto', background: '#f5f5f5', padding: 12, fontSize: 14 }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <p style={{ marginTop: 16, color: '#666' }}>Check the browser console for details.</p>
        </div>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:24px;font-family:Roboto,sans-serif">No #root element found. Check index.html.</div>'
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>,
  )
}







