// file: frontend/src/App.jsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import SquadPicker from "./SquadPicker";
import Marketplace from "./Marketplace";
import Config from "./Config";
import Agency from "./Agency"; // Import new component

export default function App() {
  return (
    <div className="container">
      <nav>
        <Link to="/">Squad Picker</Link>
        <Link to="/market">Marketplace Search</Link>
        <Link to="/agency">My Agency</Link> {/* Add new link */}
        <Link to="/config">Config</Link>
      </nav>
      <Routes>
        <Route path="/" element={<SquadPicker />} />
        <Route path="/market" element={<Marketplace />} />
        <Route path="/agency" element={<Agency />} /> {/* Add new route */}
        <Route path="/config" element={<Config />} />
      </Routes>
    </div>
  );
}