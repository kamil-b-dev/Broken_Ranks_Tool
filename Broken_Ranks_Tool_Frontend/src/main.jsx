import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { EquipmentProvider } from './context/EquipmentContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <EquipmentProvider>
            <App />
        </EquipmentProvider>
    </React.StrictMode>,
)