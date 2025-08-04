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

  const [analyzedPlayer, setAnalyzedPlayer] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  useEffect(() => { (async () => { try { const r = await api.fetchRoles(); setRoles(r); } catch (err) { console.error('Could not load roles.', err); setError('Could not load roles.'); }})(); }, []);
  useEffect(() => { if (selectedRole && roles.length > 0) { const d = roles.find(r => (r.Role || r.RoleType) === selectedRole); setCurrentRoleDetails(d); } else { setCurrentRoleDetails(null); }}, [selectedRole, roles]);
  const handleSearch = async (e) => { e.preventDefault(); if (!selectedRole || !authToken) { setError('Please select a role and provide an auth token.'); return; } setIsLoading(true); setError(''); setResults([]); try { const data = await api.searchMarketplace({ role_name: selectedRole, auth_token: authToken, tier: tier }); setResults(data ?? []); } catch (err) { setError('Search failed. Check the token or console for details.'); console.error(err); } finally { setIsLoading(false); }};
  const handleSortByPrice = () => { const sorted = [...results].sort((a, b) => a.price - b.price); setResults(sorted); };
  const handleSortByFitScore = () => { const sorted = [...results].sort((a, b) => b.player.metadata.fit_score - a.player.metadata.fit_score); setResults(sorted); };
  
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
    // This function is no longer used in Marketplace.jsx but kept for reference
    // if you decide to re-implement attribute highlighting here.
    return { padding: '8px' };
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
              <thead>
                <tr style={{textAlign: 'left'}}>
                  <th>Fit</th><th>Name</th><th>Age</th><th>Overall</th><th>Price ($)</th><th>Positions</th>
                  <th>PAC</th><th>SHO</th><th>PAS</th><th>DRI</th><th>DEF</th><th>PHY</th><th>GK</th><th>Retirement</th>
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
                      <td>{p.pace}</td><td>{p.shooting}</td><td>{p.passing}</td><td>{p.dribbling}</td><td>{p.defense}</td><td>{p.physical}</td><td>{p.goalkeeping}</td>
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
            {isAnalysisLoading ? <div style={{padding: '4rem', textAlign: 'center'}}>Loading analysis...</div> : analysisData && (
              <div className="modal-content">
                <div className="player-stat-card">
                  <div className="overall">{analysisData.player_attributes.overall}</div>
                  <h3>{analysisData.player_attributes.firstName} {analysisData.player_attributes.lastName}</h3>
                  <p>{analysisData.player_attributes.positions.join(', ')}</p>
                  <div className="player-stat-grid">
                    <div><strong>{analysisData.player_attributes.pace}</strong> <span>Pace</span></div>
                    <div><strong>{analysisData.player_attributes.shooting}</strong> <span>Shooting</span></div>
                    <div><strong>{analysisData.player_attributes.passing}</strong> <span>Passing</span></div>
                    <div><strong>{analysisData.player_attributes.dribbling}</strong> <span>Dribbling</span></div>
                    <div><strong>{analysisData.player_attributes.defense}</strong> <span>Defense</span></div>
                    <div><strong>{analysisData.player_attributes.physical}</strong> <span>Physical</span></div>
                  </div>
                </div>
                <div className="role-analysis">
                  <h4>Role Analysis (Tier: {tier})</h4>
                  <p><strong>Best Role:</strong> {analysisData.best_role.role} <span>({analysisData.best_role.score})</span></p>
                  <h5>All Positive Roles:</h5>
                  <ul>
                    {analysisData.positive_roles.map(r => (
                      <li key={r.role}>{r.role} <span>{r.score} ({r.label})</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}