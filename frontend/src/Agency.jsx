// file: frontend/src/Agency.jsx
import React, { useState, useEffect } from 'react';
import * as api from './api';

export default function Agency() {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.fetchOwnedPlayers();
        setPlayers(data);
      } catch (err) {
        console.error("Failed to fetch owned players", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container">
      <section>
        <h1>My Agency Players</h1>
        {isLoading ? <p>Loading players...</p> : (
          <table>
            <thead>
              <tr>
                <th>Player Name</th>
                <th>Age</th>
                <th>Overall</th>
                <th>Positions</th>
                <th>Assigned Club</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id}>
                  <td>{p.firstName} {p.lastName}</td>
                  <td>{p.age}</td>
                  <td>{p.overall}</td>
                  <td>{p.positions.join(', ')}</td>
                  <td>{p.assigned_club}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}