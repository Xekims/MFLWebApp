import React, { useEffect, useState } from "react";
import * as api from "./api"; // keep as star import

const API_URL = "http://localhost:8000"; // for the fallback

export default function SquadPicker() {
  const [formations, setFormations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [tier, setTier] = useState("Iron");
  const [roleMap, setRoleMap] = useState({});
  const [squad, setSquad] = useState([]);

  // fallback if api.fetchFormationMap is missing
  async function fetchFormationMapFallback(name) {
    const res = await fetch(`${API_URL}/formation/${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  useEffect(() => {
    (async () => {
      console.log("[api module keys]", Object.keys(api));
      const list = await api.fetchFormations();
      setFormations(Array.isArray(list) ? list : (list?.formations ?? []));
      const allRoles = await api.fetchRoles();
      setRoles(allRoles);
    })();
  }, []);

  async function handleFormationChange(e) {
    const name = e.target.value;
    setSelectedFormation(name);
    if (!name) {
      setRoleMap({});
      return;
    }
    const loader =
      typeof api.fetchFormationMap === "function"
        ? api.fetchFormationMap
        : fetchFormationMapFallback;

    const map = await loader(name); // { GK: "GK-Sweeper", ... }
    setRoleMap(map || {});
  }




// Corrected code for App.jsx
async function handleAssign(e) {
  e.preventDefault();
  try {
    // Call assignSquad on the 'api' object
    // and use the correct 'tier' state variable
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
            {(Array.isArray(formations) ? formations : []).map((f) => (
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
      <button onClick={handleAssign}>Assign Squad</button>

      {Object.keys(roleMap).length > 0 && (
        <>
          <h3>Roles for {selectedFormation}</h3>
          <table>
            <thead>
              <tr>
                <th>Slot</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(roleMap).map(([slot, role]) => (
                <tr key={slot}>
                  <td>{slot}</td>
                  <td>{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {Array.isArray(squad) && squad.length > 0 && (
  <table>
    <thead>
      <tr>
        <th>Slot</th>
        <th>Role</th>
        <th>Player</th>
        <th>Fit</th>
        <th>Label</th>
      </tr>
    </thead>
    <tbody>
      {squad.map((row, i) => (
        <tr key={i}>
          <td>{row.slot}</td>
          <td>{row.assigned_role}</td>
          <td>{row.player_name || '—'}</td>
          <td>{row.fit_score ?? ''}</td>
          <td>{row.fit_label ?? ''}</td>
        </tr>
      ))}
    </tbody>
  </table>
)}

    </div>
  );
}
