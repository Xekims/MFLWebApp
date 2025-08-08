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
    const [sortConfig, setSortConfig] = useState({ key: 'overall', direction: 'descending' });

    useEffect(() => {
        (async () => {
            const allOwned = await api.fetchOwnedPlayers();
            // Filter for players who are unassigned OR already in the current roster
            const available = allOwned.filter(p => p.assigned_club === "Unassigned" || clubRosterIds.includes(p.id));
            setAgencyPlayers(available);
            setIsLoading(false);
        })();
    }, [clubRosterIds]);

    const sortedAgencyPlayers = useMemo(() => {
        let sortablePlayers = [...players];
        if (sortConfig.key) {
            sortablePlayers.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortablePlayers;
    }, [agencyPlayers, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

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
            <div className="modal modal-md">
                <div className="modal-header">
                    <h3>Add Players to Roster</h3>
                </div>
                <div className="modal-body">
                    {isLoading ? <p>Loading available players...</p> : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Select</th>
                                    <th>Name</th>
                                    <th onClick={() => requestSort('overall')} style={{cursor: 'pointer'}}>
                                        Overall{getSortIndicator('overall')}
                                    </th>
                                    <th>Positions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAgencyPlayers.map(p => (
                                    <tr key={p.id}>
                                        <td><input type="checkbox" checked={selectedPlayers.includes(p.id)} onChange={() => handleSelectPlayer(p.id)} /></td>
                                        <td>{p.firstName} {p.lastName}</td>
                                        <td>{p.overall}</td>
                                        <td>{p.positions.join(', ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="modal-footer">
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
  const [allTiers, setAllTiers] = useState([]);
  const [formations, setFormations] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [tier, setTier] = useState("Iron");
  const [roleMap, setRoleMap] = useState({});
  const [simulationResult, setSimulationResult] = useState([]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch all data concurrently for better performance
      const [clubData, formList, rolesList, tiersResponse] = await Promise.all([
        api.fetchClubByName(clubName),
        api.fetchFormations(),
        api.fetchRoles(),
        fetch('http://127.0.0.1:8000/tiers')
      ]);

      const tiersData = await tiersResponse.json();
      const availableTiers = tiersData.tiers ?? [];
      setAllTiers(availableTiers);

      if (clubData) {
        const roster = clubData.roster || [];
        setRosterPlayers(roster);
        setRosterIds(roster.map(p => p.id));
        // Set the tier from the club, but validate it against the available tiers
        if (clubData.tier && availableTiers.includes(clubData.tier)) {
          setTier(clubData.tier);
        } else if (availableTiers.length > 0) {
          setTier(availableTiers[0]); // Default to the first available tier
        }
      } else {
        setRosterPlayers([]);
        setRosterIds([]);
        setError(`Club "${clubName}" not found.`);
      }

      setFormations(formList?.formations ?? []);
      setAllRoles(rolesList ?? []);
    } catch(err) {
      console.error("Failed to load club data", err);
      setError("Could not load club data. It may have been deleted or the server is unavailable.");
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
          <label>Tier:
            <select value={tier} onChange={(e) => setTier(e.target.value)}>
              {allTiers.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        {Object.keys(roleMap).length > 0 && (
          <>
            <table><thead><tr><th>Slot</th><th>Role</th></tr></thead><tbody>
              {Object.entries(roleMap).map(([slot, slotData]) => {
                const position = slotData.position;
                const validRolesForSlot = position ? rolesByPosition[position] || [] : [];
                return (
                  <tr key={slot}><td>{slot}</td><td><select value={slotData.role} onChange={(e) => handleRoleChange(slot, e.target.value)} className="role-select">{validRolesForSlot.length > 0 ? (validRolesForSlot.map(roleOption => (<option key={roleOption} value={roleOption}>{roleOption}</option>))) : (<option value="N/A">No roles for {position}</option>)}</select></td></tr>
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