// file: frontend/src/SquadPicker.jsx

import React, { useEffect, useState, useMemo } from "react";
import * as api from "./api";

export default function SquadPicker() {
  const [formations, setFormations] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [tier, setTier] = useState("Iron");
  const [roleMap, setRoleMap] = useState({});
  const [squad, setSquad] = useState([]);
  const [analyzedPlayer, setAnalyzedPlayer] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const formList = await api.fetchFormations();
        setFormations(formList?.formations ?? []);
        const rolesList = await api.fetchRoles();
        setAllRoles(rolesList ?? []);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    fetchData();
  }, []);

  const rolesByPosition = useMemo(() => {
    const grouped = {};
    for (const role of allRoles) {
      const pos = role.Position;
      if (!grouped[pos]) {
        grouped[pos] = [];
      }
      grouped[pos].push(role.Role || role.RoleType);
    }
    return grouped;
  }, [allRoles]);

  async function handleFormationChange(e) {
    const name = e.target.value;
    setSelectedFormation(name);
    setSquad([]);
    if (!name) {
      setRoleMap({});
      return;
    }
    try {
      const map = await api.fetchFormationMap(name);
      setRoleMap(map || {});
    } catch (err) {
      console.error(err);
      setRoleMap({});
    }
  }

  function handleRoleChange(slot, newRole) {
    setRoleMap(prevMap => ({
      ...prevMap,
      [slot]: {
        ...prevMap[slot],
        role: newRole,
      }
    }));
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
    } catch (err) {
      console.error(err);
      setSquad([]);
    }
  }

  // --- THIS SECTION IS NOW MORE ROBUST ---
  const { totalFitScore, averageFitScore } = useMemo(() => {
    if (!squad || squad.length === 0) {
      return { totalFitScore: 0, averageFitScore: 0 };
    }
    
    const playersInSquad = squad.filter(row => row.player_id);
    
    if (playersInSquad.length === 0) {
        return { totalFitScore: 0, averageFitScore: 0 };
    }

    const total = playersInSquad.reduce((sum, row) => sum + (row.fit_score || 0), 0);
    const average = total / playersInSquad.length;
    
    return {
      totalFitScore: total,
      averageFitScore: average.toFixed(1)
    };
  }, [squad]);

  const handlePlayerClick = async (playerRow) => {
    if (!playerRow.player_id) return;
    setIsAnalysisLoading(true);
    setAnalyzedPlayer(playerRow);
    setAnalysisData(null);
    try {
      const data = await api.fetchPlayerAnalysis(playerRow.player_id, tier);
      setAnalysisData(data);
    } catch (err) {
      console.error("Player analysis failed:", err);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  return (
    <div className="container">
      <section>
        <h1>MFL Squad Picker</h1>
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center", flexWrap: 'wrap' }}>
          <label>Formation:<select value={selectedFormation} onChange={handleFormationChange}><option value="">Select…</option>{formations.map((f) => (<option key={f} value={f}>{f}</option>))}</select></label>
          <label>Tier:<select value={tier} onChange={(e) => setTier(e.target.value)}><option>Iron</option><option>Stone</option><option>Bronze</option><option>Silver</option><option>Gold</option><option>Platinum</option><option>Diamond</option></select></label>
        </div>
      </section>

      {Object.keys(roleMap).length > 0 && (
        <section>
          <h2>Customize Roles for {selectedFormation}</h2>
          <table>
            <thead><tr><th>Slot</th><th>Role</th></tr></thead>
            <tbody>
              {Object.entries(roleMap).map(([slot, slotData]) => {
                const position = slotData.position;
                const validRolesForSlot = position ? rolesByPosition[position] || [] : [];
                return (
                  <tr key={slot}>
                    <td>{slot}</td>
                    <td>
                      <select 
                        value={slotData.role}
                        onChange={(e) => handleRoleChange(slot, e.target.value)}
                        style={{width: '100%', backgroundColor: 'transparent', border: 'none'}}
                      >
                        {validRolesForSlot.length > 0 ? (
                          validRolesForSlot.map(roleOption => (<option key={roleOption} value={roleOption}>{roleOption}</option>))
                        ) : (
                          <option value="N/A">No roles for {position}</option>
                        )}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button onClick={handleAssign} disabled={!selectedFormation} style={{width: '100%', marginTop: '1rem'}}>Assign Squad</button>
        </section>
      )}

      {squad.length > 0 && (
        <section>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1rem'}}>
            <h2>Assigned Squad</h2>
            <div style={{textAlign: 'right'}}>
              <div>Total Fit Score: <span style={{color: 'var(--mikado-yellow)', fontWeight: 'bold', fontSize: '1.2em'}}>{totalFitScore}</span></div>
              <div>Average Fit Score: <span style={{color: 'var(--mikado-yellow)', fontWeight: 'bold'}}>{averageFitScore}</span></div>
            </div>
          </div>
          <table>
            <thead><tr><th>Slot</th><th>Role</th><th>Player</th><th>Fit</th><th>Label</th></tr></thead>
            <tbody>
              {squad.map((row) => {
                const isNegativeFit = row.fit_score < 0;
                const rowStyle = { color: isNegativeFit ? 'var(--ut-orange)' : 'inherit', cursor: row.player_id ? 'pointer' : 'default' };
                return (<tr key={`${row.slot}-${row.player_id}`} style={rowStyle} onClick={() => handlePlayerClick(row)}><td>{row.slot}</td><td>{row.assigned_role}</td><td>{row.player_name || '—'}</td><td>{row.fit_score ?? ''}</td><td>{row.fit_label ?? ''}</td></tr>)
              })}
            </tbody>
          </table>
        </section>
      )}
      
      {/* --- PLAYER CARD MODAL (UPDATED) --- */}
      {analyzedPlayer && (
        <div className="modal-overlay" onClick={() => setAnalyzedPlayer(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setAnalyzedPlayer(null)}>X</button>
            {isAnalysisLoading ? <div style={{padding: '4rem', textAlign: 'center'}}>Loading analysis...</div> : analysisData && (
              <div className="modal-content">
                <div className="player-stat-card">
                  <div className="overall">{analysisData.player_attributes.overall}</div>
                  <h3>{analyzedPlayer.player_name}</h3>
                  {/* --- NEW LINE TO DISPLAY AGE AND POSITION --- */}
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
    </div>
  );
}