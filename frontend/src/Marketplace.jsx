// file: frontend/src/Marketplace.jsx

import React, { useState, useEffect, useMemo } from 'react';
import * as api from './api';

const attributeMap = {
  PAC: { label: 'PAC', key: 'pace' }, SHO: { label: 'SHO', key: 'shooting' }, PAS: { label: 'PAS', key: 'passing' },
  DRI: { label: 'DRI', key: 'dribbling' }, DEF: { label: 'DEF', key: 'defense' }, PHY: { label: 'PHY', key: 'physical' },
  GK:  { label: 'GK', key: 'goalkeeping' },
};
const defaultAttributeOrder = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY', 'GK'];

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

export default function Marketplace() {
  const [roles, setRoles] = useState([]);
  const [allTiers, setAllTiers] = useState([]);
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
  const [analysisError, setAnalysisError] = useState('');
  const [analysisTier, setAnalysisTier] = useState('Iron');

  const [attributeOrder, setAttributeOrder] = useState(defaultAttributeOrder);
  const [tierThresholds, setTierThresholds] = useState({}); // New state variable

  useEffect(() => {
    (async () => {
      try {
        const [rolesData, tiersResponse] = await Promise.all([ // Renamed tiersData to tiersResponse
          api.fetchRoles(),
          fetch('http://127.0.0.1:8000/tiers').then(res => res.json())
        ]);
        setRoles(rolesData);
        const tiers = tiersResponse.tiers ? Object.keys(tiersResponse.tiers) : []; // Get tier names from keys
        setTierThresholds(tiersResponse.tiers || {}); // Store the full TIER_THRESH object
        setAllTiers(tiers);
        if (!tiers.includes('Iron') && tiers.length > 0) {
          setTier(tiers[0]);
          setAnalysisTier(tiers[0]);
        }
      } catch (err) {
        console.error('Could not load page data.', err);
        setError('Could not load roles and tiers.');
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedRole && roles.length > 0) {
      const details = roles.find(r => (r.Role || r.RoleType) === selectedRole);
      setCurrentRoleDetails(details);
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
    if (!selectedRole || !currentRoleDetails) {
      setError('Please select a role.');
      return;
    }
    setIsLoading(true);
    setError('');
    setResults([]);
    try {
      const thresholds = tierThresholds[tier] || []; // Get thresholds for the selected tier
      const attributeMins = {};
      const attributeKeys = ['pace', 'shooting', 'passing', 'dribbling', 'defense', 'physical', 'goalkeeping'];

      // Initialize all attribute minimums to 0
      attributeKeys.forEach(key => {
        attributeMins[`${key}Min`] = 0;
      });

      // Map attribute codes to their full names (from main.py's ATTR_MAP)
      const attrMap = {
        "PAC": "pace", "SHO": "shooting", "PAS": "passing", "DRI": "dribbling",
        "DEF": "defense", "PHY": "physical", "GK": "goalkeeping"
      };

      // Calculate minimums for the role's main attributes
      const roleAttributes = [
        currentRoleDetails.Attribute1,
        currentRoleDetails.Attribute2,
        currentRoleDetails.Attribute3,
        currentRoleDetails.Attribute4
      ].filter(Boolean); // Filter out empty strings

      roleAttributes.forEach((attrCode, index) => {
        const fullAttrName = attrMap[attrCode];
        if (fullAttrName && thresholds[index] !== undefined) {
          attributeMins[`${fullAttrName}Min`] = thresholds[index];
        }
      });

      const searchParams = {
        positions: currentRoleDetails.Positions,
        ...attributeMins, // Spread the calculated attribute minimums
      };

      const data = await api.searchMarketplace(searchParams);
      setResults(data ?? []);
    } catch (err) {
      setError('Search failed. Check the token or console for details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortByPrice = () => setResults([...results].sort((a, b) => a.price - b.price));
  const handleSortByFitScore = () => setResults([...results].sort((a, b) => b.player.metadata.fit_score - a.player.metadata.fit_score));

  const handlePlayerClick = (playerListing) => {
    if (!playerListing.player?.id) return;
    setAnalysisTier(tier); // Set initial tier from search
    setAnalyzedPlayer(playerListing.player);
    fetchAnalysis(playerListing.player.id, tier);
  };

  const fetchAnalysis = async (playerId, tierToAnalyze) => {
    setIsAnalysisLoading(true);
    setAnalysisError('');
    setAnalysisData(null);
    try {
      const data = await api.fetchPlayerAnalysis(playerId, tierToAnalyze);
      setAnalysisData(data);
    } catch (err) {
      console.error("Player analysis failed:", err);
      setAnalysisError("Could not load player analysis. The player may no longer be available.");
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleTierChange = (e) => {
    const newTier = e.target.value;
    setAnalysisTier(newTier);
    if (analyzedPlayer) {
      setAnalysisData(null);
      fetchAnalysis(analyzedPlayer.id, newTier);
    }
  };

  const getAttrStyle = (attrCode) => {
    const baseStyle = { padding: '8px', transition: 'background-color 0.3s ease' };
    if (!currentRoleDetails || !attrCode) return baseStyle;
    const keyAttributes = [currentRoleDetails.Attribute1, currentRoleDetails.Attribute2, currentRoleDetails.Attribute3, currentRoleDetails.Attribute4];
    if (keyAttributes.includes(attrCode)) return { ...baseStyle, backgroundColor: 'rgba(255, 214, 10, 0.1)' };
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
            <label style={{flex: 2}}>Select Role:<select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={{ width: '100%'}}><option value="">Select...</option>{roles.map(r => { const rN = r.RoleType || r.Role; return (<option key={rN} value={rN}>{rN}</option>)})}</select></label>
            <label style={{flex: 1}}>Tier:
              <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ width: '100%'}}>
                {allTiers.map(t => (<option key={t} value={t}>{t}</option>))}
              </select>
            </label>
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
              <thead>
                <tr style={{textAlign: 'left'}}>
                  <th>Fit</th><th>Name</th><th>Age</th><th>Overall</th><th>Price ($)</th><th>Positions</th>
                  {attributeOrder.map(attrCode => (<th key={attrCode} style={getAttrStyle(attrCode)}>{attributeMap[attrCode].label}</th>))}
                  <th>Retirement</th>
                </tr>
              </thead>
              <tbody>
                {results.map(listing => {
                  const p = listing.player.metadata;
                  const rowStyle = { borderTop: '1px solid var(--border-color)', backgroundColor: p.retirementYears ? 'rgba(251, 133, 0, 0.15)' : 'transparent', cursor: 'pointer' };
                  return (
                    <tr key={listing.listingResourceId} style={rowStyle} onClick={() => handlePlayerClick(listing)}>
                      <td style={{fontWeight: 'bold'}}>{p.fit_label}</td>
                      <td>{p.firstName} {p.lastName}</td>
                      <td>{p.age}</td>
                      <td style={{fontWeight: 'bold'}}>{p.overall}</td>
                      <td>{listing.price ? `${listing.price.toLocaleString()}` : 'N/A'}</td>
                      <td>{p.positions.join(', ')}</td>
                      {attributeOrder.map(attrCode => (<td key={attrCode} style={getAttrStyle(attrCode)}>{p[attributeMap[attrCode].key]}</td>))}
                      <td style={{fontWeight: 'bold', color: 'var(--ut-orange)'}}>{p.retirementYears || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
                    {allTiers.map(t => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                {isAnalysisLoading && <div style={{padding: '2rem', textAlign: 'center'}}>Loading...</div>}
                {analysisError && <div style={{padding: '2rem', textAlign: 'center', color: 'var(--mikado-yellow)'}}>{analysisError}</div>}
                {!isAnalysisLoading && !analysisError && analysisData && (
                  <>
                    {analysisData.best_role ? (
                      <p><strong>Best Role:</strong> {analysisData.best_role.role} <span>({analysisData.best_role.score})</span></p>
                    ) : (
                      <p>No suitable roles found for this tier.</p>
                    )}
                    <h5>All Positive Roles:</h5>
                    <ul>
                      {analysisData.positive_roles.map(r => (
                        <li key={r.role}>{r.role} <span>{r.score} ({r.label})</span></li>
                      ))}
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