// file: frontend/src/Marketplace.jsx

import React, { useState, useEffect } from 'react';
import * as api from './api';

export default function Marketplace() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [currentRoleDetails, setCurrentRoleDetails] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [tier, setTier] = useState('Iron');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (selectedRole && roles.length > 0) {
      const roleDetails = roles.find(r => (r.Role || r.RoleType) === selectedRole);
      setCurrentRoleDetails(roleDetails);
    } else {
      setCurrentRoleDetails(null);
    }
  }, [selectedRole, roles]);

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
        tier: tier,
      });
      setResults(data ?? []);
    } catch (err) {
      setError('Search failed. Check the token or console for details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortByPrice = () => {
    const sortedResults = [...results].sort((a, b) => a.price - b.price);
    setResults(sortedResults);
  };

  const handleSortByFitScore = () => {
    const sortedResults = [...results].sort((a, b) => b.player.metadata.fit_score - a.player.metadata.fit_score);
    setResults(sortedResults);
  };

  // --- UPDATED: This function now handles both shading required attrs and fading non-required attrs ---
  const getAttrStyle = (attrCode) => {
    const baseStyle = { padding: '8px', transition: 'all 0.3s ease' };
    
    if (!currentRoleDetails || !attrCode) return baseStyle;

    const requiredAttrs = [
      currentRoleDetails.Attribute1,
      currentRoleDetails.Attribute2,
      currentRoleDetails.Attribute3,
      currentRoleDetails.Attribute4
    ].filter(Boolean); // .filter(Boolean) removes any empty strings

    const attrIndex = requiredAttrs.indexOf(attrCode);

    // If the attribute is required, apply a background shade
    if (attrIndex !== -1) {
      const shades = [
        'rgba(33, 158, 188, 0.5)',  // Most important
        'rgba(33, 158, 188, 0.35)',
        'rgba(33, 158, 188, 0.2)',
        'rgba(33, 158, 188, 0.1)'   // Least important
      ];
      return { ...baseStyle, backgroundColor: shades[attrIndex] };
    }

    // If the attribute is not required, fade the text color
    return { ...baseStyle, color: 'rgba(142, 202, 230, 0.5)' }; // Faded --sky-blue
  };


  return (
    <div>
      <h1>Marketplace Player Search</h1>
      <p>Find players on the market that fit a specific role and tier.</p>

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
        
        <div style={{display: 'flex', gap: '15px'}}>
          <label style={{flex: 2}}>
            Select Role:
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={{ width: '100%'}}>
              <option value="">Select...</option>
              {roles.map(role => {
                const roleName = role.RoleType || role.Role;
                return (<option key={roleName} value={roleName}>{roleName} ({role.Position})</option>)
              })}
            </select>
          </label>
          <label style={{flex: 1}}>
            Tier:
            <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ width: '100%'}}>
              <option>Iron</option><option>Stone</option><option>Bronze</option><option>Silver</option>
              <option>Gold</option><option>Platinum</option><option>Diamond</option>
            </select>
          </label>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search Market'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}

      {results.length > 0 && (
        <>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px'}}>
            <h3>Search Results</h3>
            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={handleSortByPrice}>Sort by Price (Lowest)</button>
              <button onClick={handleSortByFitScore}>Sort by Fit Score (Highest)</button>
            </div>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap'}}>
              <thead>
                <tr style={{textAlign: 'left'}}>
                  <th style={{padding: '8px'}}>Fit</th>
                  <th style={{padding: '8px'}}>Name</th>
                  <th style={{padding: '8px'}}>Age</th>
                  <th style={{padding: '8px'}}>Overall</th>
                  <th style={{padding: '8px'}}>Price ($)</th>
                  <th style={{padding: '8px'}}>Positions</th>
                  {/* --- Table headers now use the updated style function --- */}
                  <th style={getAttrStyle('PAC')}>PAC</th>
                  <th style={getAttrStyle('SHO')}>SHO</th>
                  <th style={getAttrStyle('PAS')}>PAS</th>
                  <th style={{padding: '8px', transition: 'all 0.3s ease', ...getAttrStyle('DRI')}}>DRI</th>
                  <th style={getAttrStyle('DEF')}>DEF</th>
                  <th style={getAttrStyle('PHY')}>PHY</th>
                  <th style={getAttrStyle('GK')}>GK</th>
                  <th style={{padding: '8px'}}>Retirement</th>
                </tr>
              </thead>
              <tbody>
                {results.map(listing => {
                  const p = listing.player.metadata;
                  const rowStyle = { borderTop: '1px solid #444', backgroundColor: p.retirementYears ? 'rgba(251, 133, 0, 0.15)' : 'transparent' };
                  return (
                    <tr key={listing.listingResourceId} style={rowStyle}>
                      <td style={{padding: '8px', fontWeight: 'bold'}}>{p.fit_score} ({p.fit_label})</td>
                      <td style={{padding: '8px'}}>{p.firstName} {p.lastName}</td>
                      <td style={{padding: '8px'}}>{p.age}</td>
                      <td style={{padding: '8px', fontWeight: 'bold'}}>{p.overall}</td>
                      <td style={{padding: '8px'}}>{listing.price ? `${listing.price.toLocaleString()}` : 'N/A'}</td>
                      <td style={{padding: '8px'}}>{p.positions.join(', ')}</td>
                      {/* --- Table cells now use the updated style function --- */}
                      <td style={getAttrStyle('PAC')}>{p.pace}</td>
                      <td style={getAttrStyle('SHO')}>{p.shooting}</td>
                      <td style={getAttrStyle('PAS')}>{p.passing}</td>
                      <td style={getAttrStyle('DRI')}>{p.dribbling}</td>
                      <td style={getAttrStyle('DEF')}>{p.defense}</td>
                      <td style={getAttrStyle('PHY')}>{p.physical}</td>
                      <td style={getAttrStyle('GK')}>{p.goalkeeping}</td>
                      <td style={{padding: '8px', fontWeight: 'bold', color: 'var(--ut-orange)'}}>{p.retirementYears || '—'}</td>
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