import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'
import './styles/components.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

console.log('🔐 Vaultline Secure File Vault - v1.0.0')
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL) 