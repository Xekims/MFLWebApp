// file: frontend/src/App.jsx
import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import SquadPicker from "./SquadPicker";
import Marketplace from "./Marketplace";
import Config from "./Config";
import Agency from "./Agency";
import Clubs from "./Clubs";
import ClubView from "./ClubView";

export default function App() {
  return (
    <>
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>MFL Game</h3>
        </div>
        <nav>
          <NavLink to="/"><span>&#9876;</span> Squad Picker</NavLink>
          <NavLink to="/market"><span>&#128721;</span> Marketplace</NavLink>
          <NavLink to="/agency"><span>&#128100;</span> My Agency</NavLink>
          <NavLink to="/clubs"><span>&#127946;</span> Clubs</NavLink>
          <NavLink to="/config"><span>&#9881;</span> Config</NavLink>
        </nav>
      </div>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<SquadPicker />} />
          <Route path="/market" element={<Marketplace />} />
          <Route path="/agency" element={<Agency />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/clubs/:clubName" element={<ClubView />} />
          <Route path="/config" element={<Config />} />
        </Routes>
      </div>
    </>
  );
}
