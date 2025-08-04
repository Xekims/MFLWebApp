// file: src/Marketplace.jsx

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
    e.preventDefault(); // Prevent form from reloading the page
    if (!selectedRole || !authToken) {
      setError('Please select a role and provide an auth token.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResults([]);

    try {
      // We will create searchMarketplace in api.js later
      const data = await api.searchMarketplace({
        role_name: selectedRole,
        auth_token: authToken,
      });
      setResults(data?.listings ?? []); // API response has a 'listings' key
    } catch (err) {
      setError('Search failed. Check the token or console for details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
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
  {/* UPDATE THE CODE IN THIS MAP */}
  {roles.map(role => {
    const roleName = role.RoleType || role.Role; // Use whichever key exists
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

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {results.length > 0 && (
        <>
          <h3 style={{marginTop: '30px'}}>Search Results</h3>
          <table style={{width: '100%'}}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Overall</th>
                <th>Asking Price</th>
              </tr>
            </thead>
            <tbody>
              {results.map(p => (
                <tr key={p.id}>
                  <td>{p.player.firstName} {p.player.lastName}</td>
                  <td>{p.player.age}</td>
                  <td>{p.player.overall}</td>
                  <td>{p.askingPrice ? `${p.askingPrice.toLocaleString()} credits` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}