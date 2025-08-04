// file: src/App.jsx

import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import SquadPicker from "./SquadPicker";
import Marketplace from "./Marketplace"; // We will create this next

export default function App() {
  return (
    <div className="container">
      {/* Simple Navigation Menu */}
      <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <Link to="/" style={{ marginRight: '15px' }}>Squad Picker</Link>
        <Link to="/market">Marketplace Search</Link>
      </nav>

      {/* Route Definitions */}
      <Routes>
        <Route path="/" element={<SquadPicker />} />
        <Route path="/market" element={<Marketplace />} />
      </Routes>
    </div>
  );
}