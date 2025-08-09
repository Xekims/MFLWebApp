// file: src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom"; // <-- Import
import './index.css'
import '../fontawesome/css/all.min.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* <-- Wrap App */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)