// file: frontend/src/SquadPicker.jsx

import React, { useEffect, useState, useMemo } from "react";
import * as api from "./api";

// --- Reusable, Styled Dialog Component ---
const Dialog = ({ title, children, onCancel, buttons }) => {
  return (
    <div className="modal-overlay">
      <div className="dialog-card">
        <h3>{title}</h3>
        {children}
        <div className="dialog-buttons">
          {buttons.map(btn => (
            <button key={btn.label} onClick={btn.onClick}>
              {btn.label}
            </button>
          ))}
          {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
        </div>
      </div>
    </div>
  );
};

const attributeMap = {
  PAC: { label: 'PAC', key: 'pace' }, SHO: { label: 'SHO', key: 'shooting' }, PAS: { label: 'PAS', key: 'passing' },
  DRI: { label: 'DRI', key: 'dribbling' }, DEF: { label: 'DEF', key: 'defense' }, PHY: { label: 'PHY', key: 'physical' },
  GK:  { label: 'GK', key: 'goalkeeping' },
};

export default function SquadPicker() {
  const [formations, setFormations] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [tier, setTier] = useState("Iron");
  const [authToken, setAuthToken] = useState("");
  const [roleMap, setRoleMap] = useState({});
  const [squad, setSquad] = useState([]);
  
  const [analyzedPlayer, setAnalyzedPlayer] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const [marketModalRole, setMarketModalRole] = useState(null);
  const [marketResults, setMarketResults] = useState([]);
  const [isMarketLoading, setIsMarketLoading] = useState(false);

  const [dialog, setDialog] = useState(null);
  const [squadNameInput, setSquadNameInput] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const formList = await api.fetchFormations();
        setFormations(formList?.formations ?? []);
        const rolesList = await api.fetchRoles();
        setAllRoles(rolesList ?? []);
      } catch (err) { console.error("Failed to load initial data", err); }
    };
    fetchData();
  }, []);

  const rolesByPosition = useMemo(() => {
    const grouped = {};
    for (const role of allRoles) {
      const pos = role.Position;
      if (!grouped[pos]) grouped[pos] = [];
      grouped[pos].push(role.Role || role.RoleType);
    }
    return grouped;
  }, [allRoles]);

  async function handleFormationChange(e) {
    const name = e.target.value;
    setSelectedFormation(name);
    setSquad([]);
    if (!name) { setRoleMap({}); return; }
    try {
      const map = await api.fetchFormationMap(name);
      setRoleMap(map || {});
    } catch (err) { console.error(err); setRoleMap({}); }
  }

  function handleRoleChange(slot, newRole) {
    setRoleMap(prevMap => ({ ...prevMap, [slot]: { ...prevMap[slot], role: newRole } }));
  }

  async function handleAssign(e) {
    e.preventDefault();
    const simpleRoleMap = Object.entries(roleMap).reduce((acc, [slot, data]) => {
      acc[slot] = data.role;
      return acc;
    }, {});
    try {
      const res = await api.assignSquad({
        formation_name: selectedFormation,
        tier: tier,
        role_map: simpleRoleMap
      });
      setSquad(res?.squad ?? []);
    } catch (err) { console.error(err); setSquad([]); }
  }
  
  const handleSave = () => {
    const defaultName = `${tier} - ${selectedFormation}`;
    setSquadNameInput(defaultName);
    setDialog({ type: 'saveSquad' });
  };
  
  const confirmSaveSquad = async () => {
      if (!squadNameInput) {
          setDialog({ type: 'alert', message: "Please enter a name for the squad."});
          return;
      }
      try {
        await api.saveSquad(squadNameInput, squad);
        setDialog({ type: 'alert', message: `Squad "${squadNameInput}" saved successfully!` });
      } catch (error) {
        console.error(error);
        setDialog({ type: 'alert', message: "Failed to save squad. A squad with this name may already exist." });
      }
  };

  const { totalFitScore, averageFitScore } = useMemo(() => {
    if (!squad || squad.length === 0) return { totalFitScore: 0, averageFitScore: 0 };
    const playersInSquad = squad.filter(row => row.player_id && !row.is_marketplace_suggestion);
    if (playersInSquad.length === 0) return { totalFitScore: 0, averageFitScore: 0 };
    const total = playersInSquad.reduce((sum, row) => sum + (row.fit_score || 0), 0);
    const average = total / playersInSquad.length;
    return { totalFitScore: total, averageFitScore: average.toFixed(1) };
  }, [squad]);

  const handlePlayerClick = async (playerRow) => {
    if (playerRow.fit_label === "Unfilled") {
      if (!authToken) {
        setDialog({ type: 'alert', message: "Please enter an Authentication Token to search the marketplace." });
        return;
      }
      setMarketModalRole(playerRow.assigned_role);
      setIsMarketLoading(true);
      setMarketResults([]);
      try {
        const data = await api.searchMarketplace({ role_name: playerRow.assigned_role, auth_token: authToken, tier: tier });
        setMarketResults(data ?? []);
      } catch (err) {
        console.error("Marketplace search failed:", err);
      } finally {
        setIsMarketLoading(false);
      }
      return;
    }
    if (!playerRow.player_id) return;
    setIsAnalysisLoading(true);
    setAnalysisError('');
    setAnalyzedPlayer(playerRow);
    setAnalysisData(null);
    try {
      const data = await api.fetchPlayerAnalysis(playerRow.player_id, tier);
      setAnalysisData(data);
    } catch (err) {
      console.error("Player analysis failed:", err);
      setAnalysisError("Could not load player analysis. The player may not be available.");
    } finally {
      setIsAnalysisLoading(false);
    }
  };
  
  const closeMarketModal = () => setMarketModalRole(null);

  const sortMarketByPrice = () => setMarketResults([...marketResults].sort((a, b) => a.price - b.price));
  const sortMarketByFit = () => setMarketResults([...marketResults].sort((a, b) => b.player.metadata.fit_score - a.player.metadata.fit_score));

  const marketRoleAttributes = useMemo(() => {
    if (!marketModalRole || !allRoles.length) return [];
    const roleDetails = allRoles.find(r => (r.Role || r.RoleType) === marketModalRole);
    if (!roleDetails) return [];
    return [roleDetails.Attribute1, roleDetails.Attribute2, roleDetails.Attribute3, roleDetails.Attribute4].filter(Boolean);
  }, [marketModalRole, allRoles]);

  return (
    <div className="container">
      <section>
        <h1>MFL Squad Picker</h1>
        <div style={{ display: "flex", flexDirection: 'column', gap: 16, alignItems: "center" }}>
          <label style={{width: '100%', maxWidth: '500px'}}>
            Authentication Token (for marketplace search):
            <input type="text" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Enter Bearer Token (optional)" />
          </label>
          <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center", flexWrap: 'wrap' }}>
            <label>Formation:<select value={selectedFormation} onChange={handleFormationChange}><option value="">Select…</option>{formations.map((f) => (<option key={f} value={f}>{f}</option>))}</select></label>
            <label>Tier:<select value={tier} onChange={(e) => setTier(e.target.value)}><option>Iron</option><option>Stone</option><option>Bronze</option><option>Silver</option><option>Gold</option><option>Platinum</option><option>Diamond</option></select></label>
          </div>
        </div>
      </section>

      {Object.keys(roleMap).length > 0 && (
        <section>
          <h2>Customize Roles for {selectedFormation}</h2>
          <table><thead><tr><th>Slot</th><th>Role</th></tr></thead><tbody>
            {Object.entries(roleMap).map(([slot, slotData]) => {
              const position = slotData.position;
              const validRolesForSlot = position ? rolesByPosition[position] || [] : [];
              return (
                <tr key={slot}><td>{slot}</td><td><select value={slotData.role} onChange={(e) => handleRoleChange(slot, e.target.value)} style={{width: '100%', backgroundColor: 'transparent', border: 'none'}}>{validRolesForSlot.length > 0 ? (validRolesForSlot.map(roleOption => (<option key={roleOption} value={roleOption}>{roleOption}</option>))) : (<option value="N/A">No roles for {position}</option>)}</select></td></tr>
              )
            })}
          </tbody></table>
          <button onClick={handleAssign} disabled={!selectedFormation} style={{width: '100%', marginTop: '1rem'}}>Assign Squad</button>
        </section>
      )}

      {squad.length > 0 && (
        <section>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1rem'}}>
            <h2>Assigned Squad</h2>
            <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                 <div style={{textAlign: 'right'}}>
                    <div>Total Fit Score: <span style={{color: 'var(--mikado-yellow)', fontWeight: 'bold', fontSize: '1.2em'}}>{totalFitScore}</span></div>
                    <div>Average Fit Score: <span style={{color: 'var(--mikado-yellow)', fontWeight: 'bold'}}>{averageFitScore}</span></div>
                </div>
                <button onClick={handleSave}>Save Squad</button>
            </div>
          </div>
          <table>
            <thead><tr><th>Slot</th><th>Role</th><th>Player</th><th>Fit</th><th>Label</th></tr></thead>
            <tbody>
              {squad.map((row) => {
                const isUnfilled = row.fit_label === "Unfilled";
                const rowStyle = { cursor: 'pointer', color: isUnfilled ? 'var(--gold)' : (row.fit_score < 0 ? 'var(--ut-orange)' : 'inherit') };
                return (<tr key={`${row.slot}-${row.player_id}`} style={rowStyle} onClick={() => handlePlayerClick(row)}><td>{row.slot}</td><td>{row.assigned_role}</td><td>{row.player_name || (isUnfilled ? 'Click to search market...' : '—')}</td><td>{row.fit_score ?? ''}</td><td>{row.fit_label ?? ''}</td></tr>)
              })}
            </tbody>
          </table>
        </section>
      )}
      
      {analyzedPlayer && (
        <div className="modal-overlay" onClick={() => setAnalyzedPlayer(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setAnalyzedPlayer(null)}>X</button>
            {isAnalysisLoading ? <div style={{padding: '4rem', textAlign: 'center'}}>Loading analysis...</div> : analysisError ? <div style={{padding: '4rem', textAlign: 'center', color: 'var(--mikado-yellow)'}}>{analysisError}</div> : analysisData && (
              <div className="modal-content">
                <div className="player-stat-card">
                  <div className="overall">{analysisData.player_attributes.overall}</div>
                  <h3>{analyzedPlayer.player_name}</h3>
                  <p>Age: {analysisData.player_attributes.age} &nbsp;&bull;&nbsp; {analysisData.player_attributes.positions.join(', ')}</p>
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

      {marketModalRole && (
        <div className="modal-overlay" onClick={closeMarketModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeMarketModal}>X</button>
            <div style={{padding: '2rem', paddingBottom: '1rem'}}>
              <h2>Market Suggestions for {marketModalRole}</h2>
              <div style={{display: 'flex', gap: '10px', marginBottom: '1rem'}}>
                <button onClick={sortMarketByFit}>Sort by Fit (Highest)</button>
                <button onClick={sortMarketByPrice}>Sort by Price (Lowest)</button>
              </div>
            </div>
            {isMarketLoading ? <div style={{padding: '2rem', textAlign: 'center'}}>Searching marketplace...</div> : 
              marketResults.length > 0 ? (
                <div style={{maxHeight: '400px', overflowY: 'auto', padding: '0 2rem 2rem 2rem'}}>
                  <table>
                    <thead><tr><th>Player</th><th>Age</th><th>Fit</th><th>Price ($)</th>{marketRoleAttributes.map(attrCode => (<th key={attrCode}>{attributeMap[attrCode]?.label || attrCode}</th>))}</tr></thead>
                    <tbody>
                      {marketResults.map(listing => {
                        const p = listing.player.metadata;
                        const ageStyle = { color: p.retirementYears ? 'var(--mikado-yellow)' : 'inherit', fontWeight: p.retirementYears ? 'bold' : 'normal' };
                        return (
                          <tr key={listing.listingResourceId}>
                            <td>{p.firstName} {p.lastName}</td>
                            <td style={ageStyle}>{p.age}</td>
                            <td>{p.fit_score} ({p.fit_label})</td>
                            <td>{listing.price ? `${listing.price.toLocaleString()}` : 'N/A'}</td>
                            {marketRoleAttributes.map(attrCode => (
                              <td key={attrCode}>{p[attributeMap[attrCode]?.key] || '-'}</td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <div style={{padding: '2rem', textAlign: 'center'}}>No players found on the market for this role.</div>
            }
          </div>
        </div>
      )}
      
      {/* --- CORRECTED: Full implementation of the dialog modals --- */}
      {dialog?.type === 'saveSquad' && (
        <Dialog title="Save Squad" onCancel={() => setDialog(null)} buttons={[{ label: "Save", onClick: confirmSaveSquad }]}>
          <p>Enter a unique name for this squad configuration.</p>
          <input type="text" value={squadNameInput} onChange={(e) => setSquadNameInput(e.target.value)} />
        </Dialog>
      )}
      
      {dialog?.type === 'alert' && (
        <Dialog title="Notification" buttons={[{ label: "OK", onClick: () => setDialog(null) }]}>
          <p>{dialog.message}</p>
        </Dialog>
      )}
    </div>
  );
}