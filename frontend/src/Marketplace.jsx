// file: frontend/src/Marketplace.jsx

import React, { useState, useEffect } from 'react';
import * as api from './api';

export default function Marketplace() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all roles when the component loads
  useEffect(() => {
    (async () => {
      try {
        const allRoles = await api.fetchRoles();
        setRoles(allRoles);
      } catch (err) {
        setError('Could not load roles.');
        console.error(err);
      }
    })();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!selectedRole || !authToken) {
      setError('Please select a role and provide an auth token.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResults([]);

    try {
      const data = await api.searchMarketplace({
        role_name: selectedRole,
        auth_token: authToken,
      });
      setResults(data ?? []);
    } catch (err) {
      setError('Search failed. Check the token or console for details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW SORTING FUNCTION ---
  const handleSortByPrice = () => {
    const sortedResults = [...results].sort((a, b) => a.price - b.price);
    setResults(sortedResults);
  };

  return (
    <div>
      <h1>Marketplace Player Search</h1>
      <p>Find players on the market that fit a specific role.</p>

      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '500px' }}>
        <label>
          Authentication Token:
          <input
            type="text"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Enter your Bearer Token here"
            style={{ width: '100%', marginTop: '5px' }}
          />
        </label>
        
        <label>
          Select Role:
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={{ width: '100%', marginTop: '5px' }}>
            <option value="">Select...</option>
            {roles.map(role => {
              const roleName = role.RoleType || role.Role;
              return (
                <option key={roleName} value={roleName}>
                  {roleName} ({role.Position})
                </option>
              )
            })}
          </select>
        </label>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search Market'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}

      {results.length > 0 && (
        <>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px'}}>
            <h3>Search Results</h3>
            {/* --- NEW SORT BUTTON --- */}
            <button onClick={handleSortByPrice}>
              Sort by Price (Lowest)
            </button>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap'}}>
              <thead>
                <tr style={{textAlign: 'left'}}>
                  <th style={{padding: '8px'}}>Name</th>
                  <th style={{padding: '8px'}}>Age</th>
                  <th style={{padding: '8px'}}>Overall</th>
                  <th style={{padding: '8px'}}>Price ($)</th>
                  <th style={{padding: '8px'}}>Positions</th>
                  <th style={{padding: '8px'}}>PAC</th>
                  <th style={{padding: '8px'}}>SHO</th>
                  <th style={{padding: '8px'}}>PAS</th>
                  <th style={{padding: '8px'}}>DRI</th>
                  <th style={{padding: '8px'}}>DEF</th>
                  <th style={{padding: '8px'}}>PHY</th>
                  <th style={{padding: '8px'}}>GK</th>
                </tr>
              </thead>
              <tbody>
                {results.map(listing => {
                  const p = listing.player.metadata;
                  return (
                    <tr key={listing.listingResourceId} style={{borderTop: '1px solid #444'}}>
                      <td style={{padding: '8px'}}>{p.firstName} {p.lastName}</td>
                      <td style={{padding: '8px'}}>{p.age}</td>
                      <td style={{padding: '8px', fontWeight: 'bold'}}>{p.overall}</td>
                      <td style={{padding: '8px'}}>{listing.price ? `${listing.price.toLocaleString()}` : 'N/A'}</td>
                      <td style={{padding: '8px'}}>{p.positions.join(', ')}</td>
                      <td style={{padding: '8px'}}>{p.pace}</td>
                      <td style={{padding: '8px'}}>{p.shooting}</td>
                      <td style={{padding: '8px'}}>{p.passing}</td>
                      <td style={{padding: '8px'}}>{p.dribbling}</td>
                      <td style={{padding: '8px'}}>{p.defense}</td>
                      <td style={{padding: '8px'}}>{p.physical}</td>
                      <td style={{padding: '8px'}}>{p.goalkeeping}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}