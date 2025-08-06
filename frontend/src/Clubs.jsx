// file: frontend/src/Clubs.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from './api';

export default function Clubs() {
  const [clubs, setClubs] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const data = await api.fetchClubs();
      setClubs(data);
    } catch(err) {
      console.error("Failed to fetch clubs", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClub = async () => {
    const clubName = prompt("Enter a name for your new club:");
    if (clubName) {
      try {
        await api.createClub(clubName);
        fetchData(); // Refresh list
      } catch (err) {
        alert("Failed to create club. A club with this name may already exist.");
      }
    }
  };

  return (
    <div className="container">
      <section>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h1>My Clubs</h1>
            <button onClick={handleCreateClub}>Create New Club</button>
        </div>
        {isLoading ? <p>Loading clubs...</p> : (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem'}}>
            {Object.entries(clubs).map(([name, roster]) => (
              <Link to={`/clubs/${encodeURIComponent(name)}`} key={name} className="club-card">
                <h3>{name}</h3>
                <p>{roster.length} Players</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}