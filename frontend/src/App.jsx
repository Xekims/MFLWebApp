// file: frontend/src/App.jsx

import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import SquadPicker from "./SquadPicker";
import Marketplace from "./Marketplace";
import Config from "./Config"; // <-- Import the new component

export default function App() {
  return (
    <div className="container">
      {/* --- ADD NEW LINK HERE --- */}
      <nav style={{ marginBottom: '20px', borderBottom: '1px solid var(--blue-green)', paddingBottom: '10px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <Link to="/">Squad Picker</Link>
        <Link to="/market">Marketplace Search</Link>
        <Link to="/config">Config</Link>
      </nav>

      {/* --- ADD NEW ROUTE HERE --- */}
      <Routes>
        <Route path="/" element={<SquadPicker />} />
        <Route path="/market" element={<Marketplace />} />
        <Route path="/config" element={<Config />} />
      </Routes>
    </div>
  );
}