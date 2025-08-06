// file: frontend/src/ClubView.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import * as api from './api';

// --- Reusable Add Players Modal ---
const AddPlayerModal = ({ onAdd, onCancel, clubRosterIds }) => {
    const [activeTab, setActiveTab] = useState('agency');
    const [agencyPlayers, setAgencyPlayers] = useState([]);
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const allOwned = await api.fetchOwnedPlayers();
            // Filter for players who are unassigned OR already in the current roster
            const available = allOwned.filter(p => p.assigned_club === "Unassigned" || clubRosterIds.includes(p.id));
            setAgencyPlayers(available);
            setIsLoading(false);
        })();
    }, [clubRosterIds]);

    const handleSelectPlayer = (playerId) => {
        if (selectedPlayers.includes(playerId)) {
            setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
        } else {
            setSelectedPlayers([...selectedPlayers, playerId]);
        }
    };
    
    const handleSave = () => {
        onAdd(selectedPlayers);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <button className="modal-close-btn" onClick={onCancel}>X</button>
                <h2>Add Players to Roster</h2>
                {/* Add tabs here in the future if needed */}
                {isLoading ? <p>Loading available players...</p> : (
                    <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                        <table>
                            <thead><tr><th>Select</th><th>Name</th><th>Overall</th><th>Positions</th></tr></thead>
                            <tbody>
                                {agencyPlayers.map(p => (
                                    <tr key={p.id}>
                                        <td><input type="checkbox" checked={selectedPlayers.includes(p.id)} onChange={() => handleSelectPlayer(p.id)} /></td>
                                        <td>{p.firstName} {p.lastName}</td>
                                        <td>{p.overall}</td>
                                        <td>{p.positions.join(', ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div style={{marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                    <button onClick={onCancel}>Cancel</button>
                    <button onClick={handleSave}>Add Selected Players</button>
                </div>
            </div>
        </div>
    );
};


export default function ClubView() {
  const { clubName } = useParams();
  const [rosterIds, setRosterIds] = useState([]);
  const [rosterPlayers, setRosterPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- States for the Tactics Simulator ---
  const [formations, setFormations] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [tier, setTier] = useState("Iron");
  const [roleMap, setRoleMap] = useState({});
  const [simulationResult, setSimulationResult] = useState([]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const clubs = await api.fetchClubs();
      const ids = clubs[clubName] || [];
      setRosterIds(ids);
      if (ids.length > 0) {
        const players = await api.fetchPlayersByIds(ids);
        setRosterPlayers(players);
      } else {
        setRosterPlayers([]);
      }
      const formList = await api.fetchFormations();
      setFormations(formList?.formations ?? []);
      const rolesList = await api.fetchRoles();
      setAllRoles(rolesList ?? []);
    } catch(err) {
      console.error("Failed to load club data", err);
      setError("Could not load club data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clubName]);

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
    setSimulationResult([]);
    if (!name) { setRoleMap({}); return; }
    try {
      const map = await api.fetchFormationMap(name);
      setRoleMap(map || {});
    } catch (err) { console.error(err); setRoleMap({}); }
  }

  function handleRoleChange(slot, newRole) {
    setRoleMap(prevMap => ({ ...prevMap, [slot]: { ...prevMap[slot], role: newRole } }));
  }

  const handleRunSimulation = async () => {
    const simpleRoleMap = Object.entries(roleMap).reduce((acc, [slot, data]) => {
      acc[slot] = data.role;
      return acc;
    }, {});
    try {
      const res = await api.runSimulation({ player_ids: rosterIds, role_map: simpleRoleMap, tier });
      setSimulationResult(res.squad);
    } catch(err) {
      alert("Failed to run simulation.");
    }
  };
  
  const handleAddPlayers = async (selectedPlayerIds) => {
      const newRoster = [...new Set([...rosterIds, ...selectedPlayerIds])];
      try {
          await api.updateClubRoster(clubName, newRoster);
          setIsModalOpen(false);
          fetchData(); // Refresh roster
      } catch(err) {
          alert("Failed to update roster");
      }
  };
  
  const handleRemovePlayer = async (playerId) => {
      const updatedRoster = rosterIds.filter(id => id !== playerId);
      try {
          await api.updateClubRoster(clubName, updatedRoster);
          fetchData(); // Refresh roster
      } catch(err) {
          alert("Failed to update roster.");
      }
  };

  return (
    <div className="container">
      <section>
        <h1>{clubName}</h1>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h2>Roster ({rosterPlayers.length} / 25)</h2>
            <button onClick={() => setIsModalOpen(true)}>Add Players to Roster</button>
        </div>
        {isLoading ? <p>Loading roster...</p> : (
          <table>
            <thead><tr><th>Name</th><th>Age</th><th>Overall</th><th>Positions</th><th>Actions</th></tr></thead>
            <tbody>
              {rosterPlayers.map(p => (
                <tr key={p.id}>
                  <td>{p.firstName} {p.lastName}</td>
                  <td>{p.age}</td>
                  <td>{p.overall}</td>
                  <td>{p.positions.join(', ')}</td>
                  <td><button onClick={() => handleRemovePlayer(p.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Tactics Simulator</h2>
        <p>Test different formations and roles using only the players in this club's roster.</p>
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center", flexWrap: 'wrap', marginBottom: '1rem' }}>
          <label>Formation:<select value={selectedFormation} onChange={handleFormationChange}><option value="">Select…</option>{formations.map((f) => (<option key={f} value={f}>{f}</option>))}</select></label>
          <label>Tier:<select value={tier} onChange={(e) => setTier(e.target.value)}><option>Iron</option><option>Stone</option><option>Bronze</option><option>Silver</option><option>Gold</option><option>Platinum</option><option>Diamond</option></select></label>
        </div>
        {Object.keys(roleMap).length > 0 && (
          <>
            <table><thead><tr><th>Slot</th><th>Role</th></tr></thead><tbody>
              {Object.entries(roleMap).map(([slot, slotData]) => {
                const position = slotData.position;
                const validRolesForSlot = position ? rolesByPosition[position] || [] : [];
                return (
                  <tr key={slot}><td>{slot}</td><td><select value={slotData.role} onChange={(e) => handleRoleChange(slot, e.target.value)} style={{width: '100%', backgroundColor: 'transparent', border: 'none'}}>{validRolesForSlot.length > 0 ? (validRolesForSlot.map(roleOption => (<option key={roleOption} value={roleOption}>{roleOption}</option>))) : (<option value="N/A">No roles for {position}</option>)}</select></td></tr>
                )
              })}
            </tbody></table>
            <button onClick={handleRunSimulation} disabled={!selectedFormation} style={{width: '100%', marginTop: '1rem'}}>Simulate Best XI</button>
          </>
        )}
        {simulationResult.length > 0 && (
            <table>
                <thead><tr><th>Slot</th><th>Role</th><th>Player</th><th>Fit</th><th>Label</th></tr></thead>
                <tbody>
                {simulationResult.map((row) => (
                    <tr key={`${row.slot}-${row.player_id}`}><td>{row.slot}</td><td>{row.assigned_role}</td><td>{row.player_name || '—'}</td><td>{row.fit_score ?? ''}</td><td>{row.fit_label ?? ''}</td></tr>
                ))}
                </tbody>
            </table>
        )}
      </section>

      {isModalOpen && <AddPlayerModal onAdd={handleAddPlayers} onCancel={() => setIsModalOpen(false)} clubRosterIds={rosterIds} />}
    </div>
  );
}