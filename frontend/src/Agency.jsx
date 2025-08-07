// file: frontend/src/Agency.jsx

import React, { useState, useEffect, useMemo } from 'react';
import * as api from './api';

export default function Agency() {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'overall', direction: 'descending' });
  const [orderedTiers, setOrderedTiers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch players and the ordered list of tiers for sorting.
        const [ownedPlayers, tiersResponse] = await Promise.all([
          api.fetchOwnedPlayers(),
          fetch('http://127.0.0.1:8000/tiers').then(res => res.json())
        ]);

        setOrderedTiers(tiersResponse.tiers || []);
        setPlayers(ownedPlayers); // Player data is now pre-processed by the backend
      } catch (err) {
        console.error("Failed to fetch owned players", err);
        setError("Could not load player data. Please ensure the backend server is running.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedPlayers = useMemo(() => {
    let sortableItems = [...players];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // For 'bestTier', we sort based on its index in the ordered list.
        // A lower index means a better tier (e.g., Diamond is at index 0).
        if (sortConfig.key === 'bestTier') {
          aValue = orderedTiers.indexOf(a.bestTier);
          bValue = orderedTiers.indexOf(b.bestTier);
          // Place any "Unrated" or un-found tiers at the bottom of the sort.
          if (aValue === -1) aValue = Infinity;
          if (bValue === -1) bValue = Infinity;

          // To sort descending (best to worst), we sort the index ascending.
          if (sortConfig.direction === 'descending') return aValue - bValue;
          // To sort ascending (worst to best), we sort the index descending.
          return bValue - aValue;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [players, sortConfig, orderedTiers]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key !== key) {
      // Default to descending for numeric values, ascending for age
      direction = ['age'].includes(key) ? 'ascending' : 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  return (
    <div className="container">
      <section>
        <h1>My Agency Players</h1>
        <p>This is the master list of all players currently in your wallet.</p>
        
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
                <tr key={p.id}>
                  <td>{p.firstName} {p.lastName}</td>
                  <td>{p.age}</td>
                  <td>{p.overall}</td>
                  <td>{p.positions.join(', ')}</td>
                  <td>{p.bestTier}</td>
                  <td>{p.bestRole}</td>
                  <td>{p.assigned_club}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <style>{`
          th {
            cursor: pointer;
          }
        `}</style>
      </section>
    </div>
  );
}