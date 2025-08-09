// file: frontend/src/Agency.jsx

import React, { useState, useEffect, useMemo } from 'react';
import * as api from './api';

const getAttributeStyle = (value) => {
  let backgroundColor, color;
  if (value >= 95) { backgroundColor = '#000814'; color = '#ffc300'; }
  else if (value >= 85) { backgroundColor = '#7209b7'; color = '#fffffc'; }
  else if (value >= 75) { backgroundColor = '#00296b'; color = '#fffffc'; }
  else if (value >= 65) { backgroundColor = '#386641'; color = '#000814'; }
  else if (value >= 55) { backgroundColor = '#ffc300'; color = '#000814'; }
  else { backgroundColor = '#f2e9e4'; color = '#000814'; }
  return { backgroundColor, color, fontWeight: 'bold', textAlign: 'center', borderRadius: '4px', padding: '2px 6px' };
};

const StatDisplay = ({ label, value }) => (
  <div>
    <strong style={getAttributeStyle(value)}>{value}</strong>
    <span>{label}</span>
  </div>
);

export default function Agency() {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'overall', direction: 'descending' });
  const [orderedTiers, setOrderedTiers] = useState([]);
  const [clubs, setClubs] = useState([]);

  // State for the analysis modal
  const [analyzedPlayer, setAnalyzedPlayer] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisTier, setAnalysisTier] = useState('Iron'); // Add state for the modal's tier

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ownedPlayers, clubsData, tiersData] = await Promise.all([
          api.fetchOwnedPlayers(),
          api.fetchClubs(),
          api.fetchTiers()
        ]);

        setClubs(clubsData || []);
        const tiers = tiersData.tiers || [];
        setOrderedTiers(tiers);
        if (tiers.length > 0 && !tiers.includes('Iron')) {
          setAnalysisTier(tiers[0]);
        }
        setPlayers(ownedPlayers);
      } catch (err) {
        console.error("Failed to fetch initial data", err);
        setError("Could not load page data. Please ensure the backend server is running.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePlayerClick = async (player) => {
    if (!player.id) return;
    
    setAnalyzedPlayer(player);
    fetchAnalysis(player.id); 
  };

  const fetchAnalysis = async (playerId) => {
    setIsAnalysisLoading(true);
    setAnalysisError('');
    setAnalysisData(null);
    try {
      const data = await api.fetchPlayerRoleAnalysis(playerId);
      setAnalysisData(data);
      if (data.overall_best_role) {
        setAnalysisTier(data.overall_best_role.tier);
      } else if (orderedTiers.length > 0) {
        setAnalysisTier(orderedTiers[0]);
      }
    } catch (err) {
      console.error("Player analysis failed:", err);
      setAnalysisError("Could not load player analysis.");
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleTierChange = (e) => {
    const newTier = e.target.value;
    setAnalysisTier(newTier);
  };

  const sortedPlayers = useMemo(() => {
    let sortableItems = [...players];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'bestTier') {
          aValue = orderedTiers.indexOf(a.bestTier);
          bValue = orderedTiers.indexOf(b.bestTier);
          if (aValue === -1) aValue = Infinity;
          if (bValue === -1) bValue = Infinity;
          return sortConfig.direction === 'descending' ? aValue - bValue : bValue - aValue;
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [players, sortConfig, orderedTiers]);

  const requestSort = (key) => {
    let direction = (sortConfig.key === key && sortConfig.direction === 'ascending') ? 'descending' : 'ascending';
    if (sortConfig.key !== key) {
      direction = ['age', 'lastName'].includes(key) ? 'ascending' : 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleClubAssignmentChange = async (playerId, newClubName) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const oldClubName = player.assigned_club;
    if (oldClubName === newClubName) return;

    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, assigned_club: newClubName } : p));
    try {
      await api.updatePlayerAssignment({
        player_id: playerId,
        old_club_name: oldClubName,
        new_club_name: newClubName,
      });
    } catch (err) {
      console.error("Failed to update player assignment", err);
      alert("Failed to update assignment. Reverting change.");
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, assigned_club: oldClubName } : p));
    }
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  return (
    <div className="container">
      <section>
        <h1>My Agency Players</h1>
        <p>This is the master list of all players currently in your wallet. Click on a player to view their detailed analysis.</p>
        
        {isLoading && <p>Loading players...</p>}
        {error && <p style={{color: 'var(--mikado-yellow)'}}>{error}</p>}

        {!isLoading && !error && (
          <table>
            <thead>
              <tr>
                <th onClick={() => requestSort('lastName')}>Player Name{getSortIndicator('lastName')}</th>
                <th onClick={() => requestSort('age')}>Age{getSortIndicator('age')}</th>
                <th onClick={() => requestSort('overall')}>Overall{getSortIndicator('overall')}</th>
                <th>Positions</th>
                <th onClick={() => requestSort('bestTier')}>Best Tier{getSortIndicator('bestTier')}</th>
                <th>Best Role</th>
                <th>Assigned Club</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map(p => (
                <tr key={p.id} onClick={() => handlePlayerClick(p)} style={{cursor: 'pointer'}}>
                  <td>{p.firstName} {p.lastName}</td>
                  <td>{p.age}</td>
                  <td style={getAttributeStyle(p.overall)}>{p.overall}</td>
                  <td>{p.positions.join(', ')}</td>
                  <td>{p.bestTier}</td>
                  <td>{p.bestRole}</td>
                  <td>
                    <select
                      value={p.assigned_club}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleClubAssignmentChange(p.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="club-assign-select"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {clubs.map(club => (<option key={club.club_name} value={club.club_name}>{club.club_name}</option>))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <style>{`
          th { cursor: pointer; }
          .club-assign-select { width: 100%; min-width: 150px; padding: 5px; cursor: pointer; }
          tr:hover { background-color: var(--yale-blue); }
        `}</style>
      </section>

      {analyzedPlayer && (
        <div className="modal-overlay" onClick={() => setAnalyzedPlayer(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setAnalyzedPlayer(null)}>X</button>
            
            <div className="modal-content">
              {analysisData && analysisData.player_attributes && (
                <div className="player-stat-card">
                  <div className="overall">{analysisData.player_attributes.overall}</div>
                  <h3>{analysisData.player_attributes.firstName} {analysisData.player_attributes.lastName}</h3>
                  <p>Age: {analysisData.player_attributes.age} &nbsp;&bull;&nbsp; {analysisData.player_attributes.positions.join(', ')}</p>
                  <div className="player-stat-grid">
                    <StatDisplay label="Pace" value={analysisData.player_attributes.pace} />
                    <StatDisplay label="Shooting" value={analysisData.player_attributes.shooting} />
                    <StatDisplay label="Passing" value={analysisData.player_attributes.passing} />
                    <StatDisplay label="Dribbling" value={analysisData.player_attributes.dribbling} />
                    <StatDisplay label="Defense" value={analysisData.player_attributes.defense} />
                    <StatDisplay label="Physical" value={analysisData.player_attributes.physical} />
                  </div>
                </div>
              )}
              <div className="role-analysis">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h4>Role Analysis</h4>
                  <select value={analysisTier} onChange={handleTierChange}>
                    {orderedTiers.map(t => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                {isAnalysisLoading && <div style={{padding: '2rem', textAlign: 'center'}}>Loading...</div>}
                {analysisError && <div style={{padding: '2rem', textAlign: 'center', color: 'var(--mikado-yellow)'}}>{analysisError}</div>}
                {!isAnalysisLoading && !analysisError && analysisData && (
                  <>
                    {analysisData.overall_best_role && analysisData.overall_best_role.tier === analysisTier && (
                      <p><strong>Best Role:</strong> {analysisData.overall_best_role.role} <span>({analysisData.overall_best_role.score})</span></p>
                    )}
                    <h5>All Positive Roles:</h5>
                    <ul>
                      {analysisData.all_positive_roles_by_tier && analysisData.all_positive_roles_by_tier[analysisTier] && analysisData.all_positive_roles_by_tier[analysisTier].length > 0 ? (
                        analysisData.all_positive_roles_by_tier[analysisTier]
                          .filter(role => !(analysisData.overall_best_role && role.role === analysisData.overall_best_role.role && role.tier === analysisData.overall_best_role.tier))
                          .map((role, index) => (
                            <li key={index}>{role.role} <span>{role.score} ({role.label})</span></li>
                          ))
                      ) : (
                        <li>No positive roles found for this tier.</li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
