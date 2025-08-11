// file: frontend/src/Clubs.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from './api';



export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubTier, setNewClubTier] = useState('');
  const [clubToDelete, setClubToDelete] = useState(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [clubsData, tiersResponse] = await Promise.all([
        api.fetchClubs(),
        fetch('http://127.0.0.1:8000/tiers')
      ]);
      const tiersData = await tiersResponse.json();
      setClubs(clubsData);
      const tierList = Array.isArray(tiersData.tiers)
        ? tiersData.tiers
        : Object.keys(tiersData.tiers || {});
      setTiers(tierList);
      if (tierList.length > 0) {
        setNewClubTier(tierList[0]);
      }
    } catch(err) {
      console.error("Failed to fetch initial data", err);
      setError("Could not load page data. Please ensure the backend server is running.");
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
      if (tiers.length > 0) {
        setNewClubTier(tiers[0]);
      }
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
                {tiers.map(tier => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
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
        <div className="page-header">
            <h1>My Clubs</h1>
            <button onClick={() => setIsCreateModalOpen(true)}>Create New Club</button>
        </div>
        <p>Manage your club rosters. Click on a club to view its roster and run tactical simulations.</p>
        
        {isLoading && <p>Loading clubs...</p>}

        {error && <p className="error-message">{error}</p>}
        
        {!isLoading && !error && (
          clubs.length > 0 ? (
            <div className="club-grid">
              {clubs.map((club) => (
                <Link
                  to={`/clubs/${encodeURIComponent(club.club_name)}`}
                  key={club.club_name}
                  className="club-card"
                >
                  <h3>{club.club_name}</h3>
                  <p>{(club.roster || []).length} Players in Roster</p>
                  <span className={`tier-badge tier-${(club.tier || 'iron').toLowerCase()}`}>{club.tier}</span>
                  <div className="club-card-footer">
                    <button
                      className="button-danger button-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setClubToDelete(club);
                      }}
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
