// file: frontend/src/ClubView.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as api from './api';

export default function ClubView() {
  const { clubName } = useParams();
  const [rosterIds, setRosterIds] = useState([]);
  const [rosterPlayers, setRosterPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // This is a simplified version for now. The full tactical simulator will be added next.
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const clubs = await api.fetchClubs();
      const ids = clubs[clubName] || [];
      setRosterIds(ids);
      if (ids.length > 0) {
        const players = await api.fetchPlayersByIds(ids);
        setRosterPlayers(players);
      } else {
        setRosterPlayers([]);
      }
    } catch(err) {
      console.error("Failed to load club data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clubName]);
  
  const handleRemovePlayer = async (playerId) => {
      const updatedRoster = rosterIds.filter(id => id !== playerId);
      try {
          await api.updateClubRoster(clubName, updatedRoster);
          fetchData(); // Refresh
      } catch(err) {
          alert("Failed to update roster.");
      }
  };

  return (
    <div className="container">
      <section>
        <h1>{clubName}</h1>
        <h2>Roster ({rosterPlayers.length} / 25)</h2>
        <button onClick={() => alert("Ad-hoc add player not implemented yet.")}>Add Players to Roster</button>
        {isLoading ? <p>Loading roster...</p> : (
          <table>
            <thead><tr><th>Name</th><th>Age</th><th>Overall</th><th>Positions</th><th>Actions</th></tr></thead>
            <tbody>
              {rosterPlayers.map(p => (
                <tr key={p.id}>
                  <td>{p.firstName} {p.lastName}</td>
                  <td>{p.age}</td>
                  <td>{p.overall}</td>
                  <td>{p.positions.join(', ')}</td>
                  <td><button onClick={() => handleRemovePlayer(p.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section>
        <h2>Tactics Simulator</h2>
        <p>The tactics simulator for this club roster will be implemented here.</p>
      </section>
    </div>
  );
}