// file: frontend/src/SquadPicker.jsx

import React, { useEffect, useState } from "react";
import * as api from "./api";

export default function SquadPicker() {
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [tier, setTier] = useState("Iron");
  const [roleMap, setRoleMap] = useState({});
  const [squad, setSquad] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.fetchFormations();
        setFormations(list?.formations ?? []);
      } catch (err) {
        console.error("Failed to load formations", err);
      }
    })();
  }, []);

  // Simplified handler using the new api.fetchFormationMap function
  async function handleFormationChange(e) {
    const name = e.target.value;
    setSelectedFormation(name);

    if (!name) {
      setRoleMap({});
      return;
    }

    try {
      const map = await api.fetchFormationMap(name);
      setRoleMap(map || {});
    } catch (err) {
      console.error(err);
      setRoleMap({}); // Clear map on error
    }
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

  return (
    <div className="container">
      <h1>MFL Squad Picker</h1>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <label>
          Formation:&nbsp;
          <select value={selectedFormation} onChange={handleFormationChange}>
            <option value="">Select…</option>
            {formations.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tier:&nbsp;
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option>Iron</option>
            <option>Stone</option>
            <option>Bronze</option>
            <option>Silver</option>
            <option>Gold</option>
            <option>Platinum</option>
            <option>Diamond</option>
          </select>
        </label>
      </div>

      <br />
      <button onClick={handleAssign} disabled={!selectedFormation}>
        Assign Squad
      </button>

      {/* This table for displaying roles remains the same */}
      {Object.keys(roleMap).length > 0 && (
        <>
          <h3 style={{marginTop: '20px'}}>Roles for {selectedFormation}</h3>
          <table>
            <thead>
              <tr><th>Slot</th><th>Role</th></tr>
            </thead>
            <tbody>
              {Object.entries(roleMap).map(([slot, role]) => (
                <tr key={slot}><td>{slot}</td><td>{role}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* This table for the final squad has an improved key */}
      {squad.length > 0 && (
        <>
          <h3 style={{marginTop: '20px'}}>Assigned Squad</h3>
          <table>
            <thead>
              <tr><th>Slot</th><th>Role</th><th>Player</th><th>Fit</th><th>Label</th></tr>
            </thead>
            <tbody>
              {squad.map((row, i) => (
                <tr key={`${row.slot}-${row.player_id || i}`}>
                  <td>{row.slot}</td>
                  <td>{row.assigned_role}</td>
                  <td>{row.player_name || '—'}</td>
                  <td>{row.fit_score ?? ''}</td>
                  <td>{row.fit_label ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}