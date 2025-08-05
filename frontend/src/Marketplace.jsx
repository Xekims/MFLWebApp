// file: frontend/src/Marketplace.jsx

import React, { useState, useEffect, useMemo } from 'react';
import * as api from './api';

// --- NEW: A helper map and default order for our dynamic columns ---
const attributeMap = {
  PAC: { label: 'PAC', key: 'pace' },
  SHO: { label: 'SHO', key: 'shooting' },
  PAS: { label: 'PAS', key: 'passing' },
  DRI: { label: 'DRI', key: 'dribbling' },
  DEF: { label: 'DEF', key: 'defense' },
  PHY: { label: 'PHY', key: 'physical' },
  GK:  { label: 'GK', key: 'goalkeeping' },
};
const defaultAttributeOrder = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY', 'GK'];


export default function Marketplace() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [currentRoleDetails, setCurrentRoleDetails] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [tier, setTier] = useState('Iron');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [analyzedPlayer, setAnalyzedPlayer] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  
  // --- NEW: State to hold the dynamic order of attribute columns ---
  const [attributeOrder, setAttributeOrder] = useState(defaultAttributeOrder);

  useEffect(() => {
    // Fetches initial roles data
    (async () => {
      try {
        const rolesData = await api.fetchRoles();
        setRoles(rolesData);
      } catch (err) {
        console.error('Could not load roles.', err);
        setError('Could not load roles.');
      }
    })();
  }, []);

  // --- UPDATED: This effect now also sets the column order ---
  useEffect(() => {
    if (selectedRole && roles.length > 0) {
      const details = roles.find(r => (r.Role || r.RoleType) === selectedRole);
      setCurrentRoleDetails(details);

      // Set the new dynamic column order
      if (details) {
        const keyAttributes = [details.Attribute1, details.Attribute2, details.Attribute3, details.Attribute4].filter(Boolean);
        const otherAttributes = defaultAttributeOrder.filter(attr => !keyAttributes.includes(attr));
        setAttributeOrder([...keyAttributes, ...otherAttributes]);
      } else {
        setAttributeOrder(defaultAttributeOrder);
      }
    } else {
      setCurrentRoleDetails(null);
      setAttributeOrder(defaultAttributeOrder);
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
        tier: tier
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
    const sorted = [...results].sort((a, b) => a.price - b.price);
    setResults(sorted);
  };

  const handleSortByFitScore = () => {
    const sorted = [...results].sort((a, b) => b.player.metadata.fit_score - a.player.metadata.fit_score);
    setResults(sorted);
  };

  const handlePlayerClick = async (playerListing) => {
    if (!playerListing.player?.id) return;
    setIsAnalysisLoading(true);
    setAnalyzedPlayer(playerListing.player);
    setAnalysisData(null);
    try {
      const data = await api.fetchPlayerAnalysis(playerListing.player.id, tier);
      setAnalysisData(data);
    } catch (err) {
      console.error("Player analysis failed:", err);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const getAttrStyle = (attrCode) => {
    const baseStyle = { padding: '8px', transition: 'background-color 0.3s ease' };
    if (!currentRoleDetails || !attrCode) {
      return baseStyle;
    }
    const keyAttributes = [
      currentRoleDetails.Attribute1,
      currentRoleDetails.Attribute2,
      currentRoleDetails.Attribute3,
      currentRoleDetails.Attribute4
    ];
    if (keyAttributes.includes(attrCode)) {
      return { ...baseStyle, backgroundColor: 'rgba(255, 214, 10, 0.1)' };
    }
    return baseStyle;
  };

  return (
    <div className="container">
      <section>
        <h1>Marketplace Player Search</h1>
        <p>Find players on the market that fit a specific role and tier. Click on a player in the results to see a detailed analysis.</p>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label>Authentication Token:<input type="text" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Enter your Bearer Token here"/></label>
          <div style={{display: 'flex', gap: '15px'}}>
            <label style={{flex: 2}}>Select Role:<select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={{ width: '100%'}}><option value="">Select...</option>{roles.map(r => { const rN = r.RoleType || r.Role; return (<option key={rN} value={rN}>{rN} ({r.Position})</option>)})}</select></label>
            <label style={{flex: 1}}>Tier:<select value={tier} onChange={(e) => setTier(e.target.value)} style={{ width: '100%'}}><option>Iron</option><option>Stone</option><option>Bronze</option><option>Silver</option><option>Gold</option><option>Platinum</option><option>Diamond</option></select></label>
          </div>
          <button type="submit" disabled={isLoading}>{isLoading ? 'Searching...' : 'Search Market'}</button>
        </form>
        {error && <p style={{ color: 'var(--mikado-yellow)', marginTop: '15px' }}>{error}</p>}
      </section>

      {results.length > 0 && (
        <section>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <h2>Search Results</h2>
            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={handleSortByPrice}>Sort by Price (Lowest)</button>
              <button onClick={handleSortByFitScore}>Sort by Fit Score (Highest)</button>
            </div>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table>
              {/* --- UPDATED: Table headers are now dynamically rendered --- */}
              <thead>
                <tr style={{textAlign: 'left'}}>
                  <th>Fit</th><th>Name</th><th>Age</th><th>Overall</th><th>Price ($)</th><th>Positions</th>
                  {attributeOrder.map(attrCode => (
                    <th key={attrCode} style={getAttrStyle(attrCode)}>{attributeMap[attrCode].label}</th>
                  ))}
                  <th>Retirement</th>
                </tr>
              </thead>
              <tbody>
                {results.map(listing => {
                  const p = listing.player.metadata;
                  const rowStyle = { borderTop: '1px solid var(--border-color)', backgroundColor: p.retirementYears ? 'rgba(251, 133, 0, 0.15)' : 'transparent', cursor: 'pointer' };
                  return (
                    <tr key={listing.listingResourceId} style={rowStyle} onClick={() => handlePlayerClick(listing)}>
                      <td style={{fontWeight: 'bold'}}>{p.fit_score} ({p.fit_label})</td>
                      <td>{p.firstName} {p.lastName}</td>
                      <td>{p.age}</td>
                      <td style={{fontWeight: 'bold'}}>{p.overall}</td>
                      <td>{listing.price ? `${listing.price.toLocaleString()}` : 'N/A'}</td>
                      <td>{p.positions.join(', ')}</td>
                      {/* --- UPDATED: Table cells are now dynamically rendered --- */}
                      {attributeOrder.map(attrCode => (
                        <td key={attrCode} style={getAttrStyle(attrCode)}>{p[attributeMap[attrCode].key]}</td>
                      ))}
                      <td style={{fontWeight: 'bold', color: 'var(--ut-orange)'}}>{p.retirementYears || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ... (Modal code remains unchanged) ... */}
      {analyzedPlayer && ( <div className="modal-overlay" onClick={() => setAnalyzedPlayer(null)}>...</div> )}
    </div>
  );
}