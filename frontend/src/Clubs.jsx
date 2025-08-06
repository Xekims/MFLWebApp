// file: frontend/src/Clubs.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from './api';

export default function Clubs() {
  const [clubs, setClubs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const data = await api.fetchClubs();
      setClubs(data);
    } catch(err) {
      console.error("Failed to fetch clubs", err);
      setError("Could not load clubs. Please ensure the backend server is running.");
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
        fetchData(); // Refresh list after creating
      } catch (err) {
        alert("Failed to create club. A club with this name may already exist.");
        console.error(err);
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
        <p>Manage your club rosters. Click on a club to view its roster and run tactical simulations.</p>
        
        {isLoading && <p>Loading clubs...</p>}

        {error && <p style={{color: 'var(--mikado-yellow)'}}>{error}</p>}
        
        {!isLoading && !error && (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '2rem'}}>
            {Object.entries(clubs).map(([name, roster]) => (
              <Link to={`/clubs/${encodeURIComponent(name)}`} key={name} style={{
                  backgroundColor: 'var(--rich-black)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
              }}>
                <h3 style={{margin: 0, color: 'var(--gold)'}}>{name}</h3>
                <p style={{margin: '0.5rem 0 0 0', color: 'var(--text-secondary)'}}>
                  {roster.length} Players in Roster
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}