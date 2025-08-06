// file: frontend/src/App.jsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import SquadPicker from "./SquadPicker";
import Marketplace from "./Marketplace";
import Config from "./Config";
import Agency from "./Agency"; // <-- NEW
import Clubs from "./Clubs";   // <-- NEW
import ClubView from "./ClubView"; // <-- NEW

export default function App() {
  return (
    <div className="container">
      <nav>
        <Link to="/">Squad Picker</Link>
        <Link to="/market">Marketplace Search</Link>
        <Link to="/agency">My Agency</Link> {/* <-- NEW */}
        <Link to="/clubs">Clubs</Link>     {/* <-- NEW */}
        <Link to="/config">Config</Link>
      </nav>
      <Routes>
        <Route path="/" element={<SquadPicker />} />
        <Route path="/market" element={<Marketplace />} />
        <Route path="/agency" element={<Agency />} />     {/* <-- NEW */}
        <Route path="/clubs" element={<Clubs />} />       {/* <-- NEW */}
        <Route path="/clubs/:clubName" element={<ClubView />} /> {/* <-- NEW */}
        <Route path="/config" element={<Config />} />
      </Routes>
    </div>
  );
}