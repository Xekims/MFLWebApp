// frontend/src/Agency.jsx
import React, { useState, useEffect, useMemo } from 'react';
import * as api from './api';
import PlayerDetailModal from './PlayerDetailModal';

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

export default function Agency() {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'overall', direction: 'descending' });

  const [clubs, setClubs] = useState([]);
  const [openPlayerId, setOpenPlayerId] = useState(null);
  const [orderedTiers, setOrderedTiers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [ownedPlayers, clubsData, tiersData] = await Promise.all([
          api.fetchOwnedPlayers(),
          api.fetchClubs(),
          api.fetchTiers()
        ]);
        setPlayers(ownedPlayers || []);
        setClubs(clubsData || []);
        const tiers = tiersData?.tiers ? Object.keys(tiersData.tiers) : [];
        setOrderedTiers(tiers);
      } catch (err) {
        console.error("Failed to fetch initial data", err);
        setError("Could not load page data. Please ensure the backend server is running.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const sortedPlayers = useMemo(() => {
    let sortableItems = [...players];
    const { key, direction } = sortConfig;
    if (!key) return sortableItems;
    sortableItems.sort((a, b) => {
      if (key === 'bestTier') {
        const idx = (t) => {
          const i = orderedTiers.indexOf(t);
          return i === -1 ? Number.MAX_SAFE_INTEGER : i;
        };
        return direction === 'ascending' ? idx(a.bestTier) - idx(b.bestTier) : idx(b.bestTier) - idx(a.bestTier);
      }
      const av = a[key]; const bv = b[key];
      if (av < bv) return direction === 'ascending' ? -1 : 1;
      if (av > bv) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
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
        <p>Click on a player row to view their detailed analysis.</p>

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
                <tr key={p.id} onClick={() => setOpenPlayerId(p.id)} style={{ cursor: 'pointer' }}>
                  <td>{p.firstName} {p.lastName}</td>
                  <td>{p.age}</td>
                  <td style={getAttributeStyle(p.overall)}>{p.overall}</td>
                  <td>{(p.positions || []).join(', ')}</td>
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
                      {clubs.map(club => (
                        <option key={club.club_name} value={club.club_name}>{club.club_name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {openPlayerId && (
        <PlayerDetailModal
          playerId={openPlayerId}
          orderedTiers={orderedTiers}
          onClose={() => setOpenPlayerId(null)}
        />
      )}
    </div>
  );
}
