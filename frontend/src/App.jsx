// file: frontend/src/App.jsx
import React, { useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
{/*import SquadPicker from "./SquadPicker";*/}
import Marketplace from "./Marketplace";
import Config from "./Config";
import Agency from "./Agency";
import Clubs from "./Clubs";
import ClubView from "./ClubView";
import PlayerSearch from "./PlayerSearch";

function PlayerSearchBar() {
  const navigate = useNavigate();
  const [playerId, setPlayerId] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (playerId) {
      navigate(`/player-search/${playerId}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="player-search-form player-search-form--icon">
      <input
        type="text"
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
        placeholder="Search Player ID..."
        className="player-search-input"
        aria-label="Search Player ID"
      />
      <button type="submit" className="player-search-button" aria-label="Search">
        <i className="fa-solid fa-search"></i>
      </button>
    </form>

  );
}

export default function App() {
  return (
    <>
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>XekiMFL Toolset</h3>
        </div>
        <PlayerSearchBar />
        <nav>
          {/*<NavLink to="/"><span><i className="fa-solid fa-users-line"></i></span> Squad Picker</NavLink>*/}
          <NavLink to="/market"><span><i className="fa-solid fa-store"></i></span> Marketplace</NavLink>
          <NavLink to="/agency"><span><i className="fa-solid fa-building-columns"></i></span> My Agency</NavLink>
          <NavLink to="/clubs"><span><i className="fa-solid fa-trophy"></i></span> My Clubs</NavLink>
          <NavLink to="/config"><span><i className="fa-solid fa-gear"></i></span> Config</NavLink>
        </nav>
      </div>
      <div className="main-content">
        <Routes>
          {/*<Route path="/" element={<SquadPicker />} />*/}
          <Route path="/market" element={<Marketplace />} />
          <Route path="/agency" element={<Agency />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/clubs/:clubName" element={<ClubView />} />
          <Route path="/config" element={<Config />} />
          <Route path="/player-search" element={<PlayerSearch />} />
          <Route path="/player-search/:playerId" element={<PlayerSearch />} />
        </Routes>
      </div>
    </>
  );
}
