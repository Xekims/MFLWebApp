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

  useEffect(() => {
    (async () => {
      try {
        const formList = await api.fetchFormations();
        setFormations(formList?.formations ?? []);
        const rolesList = await api.fetchRoles();
        setAllRoles(rolesList ?? []);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    })();
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
      [slot]: newRole
    }));
  }

  async function handleAssign(e) {
    e.preventDefault();
    try {
      const res = await api.assignSquad({
        formation_name: selectedFormation,
        tier: tier,
        role_map: roleMap
      });
      setSquad(res?.squad ?? []);
    } catch (err) {
      console.error(err);
      setSquad([]);
    }
  }

  // --- NEW: CALCULATE SQUAD SCORES ---
  const { totalFitScore, averageFitScore } = useMemo(() => {
    if (!squad || squad.length === 0) {
      return { totalFitScore: 0, averageFitScore: 0 };
    }
    const playersInSquad = squad.filter(row => row.player_id);
    const total = playersInSquad.reduce((sum, row) => sum + (row.fit_score || 0), 0);
    const average = total / (playersInSquad.length || 1);
    
    return {
      totalFitScore: total,
      averageFitScore: average.toFixed(1) // Rounded to one decimal place
    };
  }, [squad]);

  return (
    <div className="container">
      <h1>MFL Squad Picker</h1>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: 'wrap' }}>
        <label>
          Formation:&nbsp;
          <select value={selectedFormation} onChange={handleFormationChange}>
            <option value="">Select…</option>
            {formations.map((f) => (<option key={f} value={f}>{f}</option>))}
          </select>
        </label>
        <label>
          Tier:&nbsp;
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option>Iron</option><option>Stone</option><option>Bronze</option>
            <option>Silver</option><option>Gold</option><option>Platinum</option>
            <option>Diamond</option>
          </select>
        </label>
      </div>

      {Object.keys(roleMap).length > 0 && (
        <>
          <h3 style={{marginTop: '20px'}}>Customize Roles for {selectedFormation}</h3>
          <table>
            <thead>
              <tr><th>Slot</th><th>Role</th></tr>
            </thead>
            <tbody>
              {Object.entries(roleMap).map(([slot, currentRole]) => {
                const roleInfo = allRoles.find(r => (r.Role || r.RoleType) === currentRole);
                const position = roleInfo ? roleInfo.Position : null;
                const validRolesForSlot = position ? rolesByPosition[position] : [];
                return (
                  <tr key={slot}>
                    <td>{slot}</td>
                    <td>
                      <select 
                        value={currentRole}
                        onChange={(e) => handleRoleChange(slot, e.target.value)}
                        style={{width: '100%', backgroundColor: 'transparent', border: 'none'}}
                      >
                        {validRolesForSlot.map(roleOption => (
                          <option key={roleOption} value={roleOption}>{roleOption}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      <br />
      <button onClick={handleAssign} disabled={!selectedFormation}>
        Assign Squad
      </button>

      {/* --- UPDATED SQUAD RESULTS SECTION --- */}
      {squad.length > 0 && (
        <>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderBottom: '1px solid var(--blue-green)', paddingBottom: '10px'}}>
            <h3>Assigned Squad</h3>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '1.2em'}}>Total Fit Score: <span style={{color: 'var(--selective-yellow)', fontWeight: 'bold'}}>{totalFitScore}</span></div>
              <div style={{fontSize: '1.0em'}}>Average Fit Score: <span style={{color: 'var(--selective-yellow)', fontWeight: 'bold'}}>{averageFitScore}</span></div>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Slot</th><th>Role</th><th>Player</th><th>Fit</th><th>Label</th></tr>
            </thead>
            <tbody>
              {squad.map((row, i) => {
                const isNegativeFit = row.fit_score < 0;
                const rowStyle = { color: isNegativeFit ? 'var(--ut-orange)' : 'inherit' };
                return (
                  <tr key={`${row.slot}-${row.player_id || i}`} style={rowStyle}>
                    <td>{row.slot}</td>
                    <td>{row.assigned_role}</td>
                    <td>{row.player_name || '—'}</td>
                    <td>{row.fit_score ?? ''}</td>
                    <td>{row.fit_label ?? ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}