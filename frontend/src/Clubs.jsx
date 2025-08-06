// file: frontend/src/Clubs.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from './api';

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubTier, setNewClubTier] = useState('Gold');
  const [clubToDelete, setClubToDelete] = useState(null);

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

  const handleConfirmCreateClub = async (e) => {
    e.preventDefault();
    if (!newClubName.trim()) {
      alert("Please enter a club name.");
      return;
    }
    try {
      const newClub = await api.createClub(newClubName, newClubTier);
      setClubs(prevClubs => [...prevClubs, newClub]);
      setIsCreateModalOpen(false);
      setNewClubName('');
      setNewClubTier('Gold');
    } catch (err) {
      alert("Failed to create club. A club with this name may already exist.");
      console.error(err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!clubToDelete) return;
    try {
      await api.deleteClub(clubToDelete.club_name);
      setClubs(prevClubs => prevClubs.filter(c => c.club_name !== clubToDelete.club_name));
      setClubToDelete(null); // Close the modal on success
    } catch (err) {
      alert("Failed to delete the club. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="container">
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <form onSubmit={handleConfirmCreateClub} className="modal modal-sm">
            <div className="modal-header">
              <h3>Create New Club</h3>
            </div>
            <div className="modal-body">
              <p>Enter the details for your new club.</p>
              <label htmlFor="clubNameInput">Club Name</label>
              <input
                id="clubNameInput"
                type="text"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                placeholder="e.g., The All-Stars"
                required
              />
              <label htmlFor="clubTierSelect">Tier</label>
              <select id="clubTierSelect" value={newClubTier} onChange={(e) => setNewClubTier(e.target.value)}>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Bronze">Bronze</option>
                <option value="Iron">Iron</option>
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              <button type="submit">Create Club</button>
            </div>
          </form>
        </div>
      )}

      {clubToDelete && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete the club "<strong>{clubToDelete.club_name}</strong>"?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setClubToDelete(null)}>Cancel</button>
              <button type="button" className="button-danger" onClick={handleConfirmDelete}>Delete Club</button>
            </div>
          </div>
        </div>
      )}

      <section>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h1>My Clubs</h1>
            <button onClick={() => setIsCreateModalOpen(true)}>Create New Club</button>
        </div>
        <p>Manage your club rosters. Click on a club to view its roster and run tactical simulations.</p>
        
        {isLoading && <p>Loading clubs...</p>}

        {error && <p style={{color: 'var(--mikado-yellow)'}}>{error}</p>}
        
        {!isLoading && !error && (
          clubs.length > 0 ? (
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '2rem'}}>
              {clubs.map((club) => (
                <Link
                  to={`/clubs/${encodeURIComponent(club.club_name)}`}
                  key={club.club_name}
                  style={{
                    backgroundColor: 'var(--rich-black)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <h3 style={{margin: 0, color: 'var(--gold)'}}>{club.club_name}</h3>
                  <p style={{margin: '0.5rem 0 1rem 0', color: 'var(--text-secondary)'}}>
                    {(club.roster || []).length} Players in Roster
                  </p>
                  <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      backgroundColor: `var(--${(club.tier || 'iron').toLowerCase()}-tier-bg, var(--yale-blue))`,
                      color: `var(--${(club.tier || 'iron').toLowerCase()}-tier-text, var(--text-primary))`,
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                  }}>{club.tier}</span>
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', textAlign: 'right' }}>
                    <button
                      className="button-danger"
                      onClick={(e) => {
                        e.preventDefault(); // Prevent the <Link> from navigating
                        e.stopPropagation();
                        setClubToDelete(club);
                      }}
                      style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}
                    >
                      Delete
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p>You haven't created any clubs yet. Click "Create New Club" to get started!</p>
          )
        )}
      </section>
    </div>
  );
}