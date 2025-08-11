// frontend/src/Config.jsx
import React, { useState, useEffect } from 'react';
import * as api from './api';

const RoleEditor = ({ role, onSave, onCancel, onDelete, attributes }) => {
  const [formData, setFormData] = useState(role);
  const isNew = !role.originalName;
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid var(--yale-blue)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
      <h3>{isNew ? 'Add New Role' : `Editing: ${role.originalName}`}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <label>Role Name: <input name="Role" value={formData.Role} onChange={handleChange} required /></label>
        <label>Position: <input name="Position" value={formData.Position} onChange={handleChange} required /></label>
        {[1, 2, 3, 4].map(i => (
          <label key={i}>Attribute {i}:
            <select name={`Attribute${i}`} value={formData[`Attribute${i}`] || ''} onChange={handleChange}>
              <option value="">None</option>
              {attributes.map(attr => <option key={attr} value={attr}>{attr}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
        <div>
          <button type="submit">Save Role</button>
          <button type="button" onClick={onCancel} style={{ marginLeft: '10px' }}>Cancel</button>
        </div>
        {!isNew && <button type="button" onClick={() => onDelete(role.originalName)}>Delete Role</button>}
      </div>
    </form>
  );
};

const FormationEditor = ({ formationName, formationData, allRoles, onSave, onCancel, onDelete, isNew = false }) => {
  const [name, setName] = useState(formationName);
  const [slots, setSlots] = useState(formationData);

  const handleRoleChange = (slotName, newRole) => {
    setSlots(prev => ({ ...prev, [slotName]: newRole })); // <-- fixed spread
  };

  const handleSubmit = (e) => { e.preventDefault(); onSave(name, slots); };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid var(--yale-blue)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
      <h3>{isNew ? `Configure Roles for "${name}"` : `Editing: ${formationName}`}</h3>
      {isNew && <p>Assign a role to each slot for your new formation.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {Object.entries(slots).map(([slotName, currentRole]) => (
          <label key={slotName}>{slotName}:
            <select value={currentRole || ''} onChange={(e) => handleRoleChange(slotName, e.target.value)}>
              <option value="">- Unassigned -</option>
              {allRoles.map(r => <option key={r.Role} value={r.Role}>{r.Role}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
        <div>
          <button type="submit">Save Formation</button>
          <button type="button" onClick={onCancel} style={{ marginLeft: '10px' }}>Cancel</button>
        </div>
        {!isNew && <button type="button" onClick={() => onDelete(formationName)}>Delete Formation</button>}
      </div>
    </form>
  );
};

const NewFormationCreator = ({ onContinue, onCancel }) => {
  const [formationName, setFormationName] = useState('');
  const [slotInput, setSlotInput] = useState('');
  const [slots, setSlots] = useState([]);

  const handleAddSlot = () => {
    const trimmed = slotInput.trim().toUpperCase();
    if (trimmed && !slots.includes(trimmed)) {
      setSlots(prev => [...prev, trimmed]);
      setSlotInput('');
    }
  };
  const handleRemoveSlot = (s) => setSlots(prev => prev.filter(x => x !== s));
  const handleContinue = () => {
    if (!formationName || slots.length === 0) return alert('Please provide a formation name and add at least one slot.');
    const map = Object.fromEntries(slots.map(s => [s, ""]));
    onContinue(formationName, map);
  };

  return (
    <div style={{ border: '1px solid var(--yale-blue)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
      <h3>Add New Formation</h3>
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        <label>Formation Name: <input value={formationName} onChange={(e) => setFormationName(e.target.value)} placeholder="e.g., 4-4-2" /></label>
        <div>
          <label>Add Slot Name:
            <div style={{display: 'flex', gap: '10px'}}>
              <input value={slotInput} onChange={(e) => setSlotInput(e.target.value)} placeholder="e.g., GK" />
              <button type="button" onClick={handleAddSlot}>Add Slot</button>
            </div>
          </label>
        </div>
        <div>
          <strong>Slots:</strong>
          {slots.length === 0 ? <p style={{opacity: 0.7, margin: '10px 0 0 0'}}>No slots added yet.</p> :
            <ul style={{listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px'}}>
              {slots.map(slot => (
                <li key={slot} style={{backgroundColor: 'var(--yale-blue)', color: '#fff', padding: '5px 10px', borderRadius: '5px', fontWeight: 'bold'}}>
                  {slot} <span onClick={() => handleRemoveSlot(slot)} style={{cursor: 'pointer', marginLeft: '5px', color: 'var(--mikado-yellow)'}}>X</span>
                </li>
              ))}
            </ul>
          }
        </div>
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <button type="button" onClick={handleContinue}>Continue to Assign Roles</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default function Config() {
  const [roles, setRoles] = useState([]);
  const [formations, setFormations] = useState({});
  const [attributes, setAttributes] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [editingFormation, setEditingFormation] = useState(null);
  const [isAddingFormation, setIsAddingFormation] = useState(false);

  const reload = async () => {
    const [r, fL, aD] = await Promise.all([
      api.fetchRoles(),
      api.fetchFormations(),  // { formations: [...] }
      api.fetchAttributes()
    ]);
    setRoles(r.map(rr => ({ ...rr, originalName: rr.Role || rr.RoleType })));
    setAttributes(aD.attributes || []);
    const maps = {};
    for (const fm of (fL.formations || [])) {
      maps[fm] = await api.fetchFormationMap(fm);
    }
    setFormations(maps);
  };

  useEffect(() => { reload().catch(console.error); }, []);

  // ----- Role handlers -----
  const handleSaveRole = async (data) => {
    const isNew = !data.originalName;
    const payload = {
      Role: data.Role,
      Position: data.Position,
      Attribute1: data.Attribute1 || "",
      Attribute2: data.Attribute2 || "",
      Attribute3: data.Attribute3 || "",
      Attribute4: data.Attribute4 || "",
    };
    try {
      if (isNew) {
        await fetch(`${API_URL}/roles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        await fetch(`${API_URL}/roles/${encodeURIComponent(data.originalName)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      setEditingRole(null);
      await reload();
    } catch (e) {
      alert(e.message || "Failed to save role");
    }
  };

  const handleDeleteRole = async (name) => {
    if (!window.confirm(`Delete role "${name}"?`)) return;
    try {
      await fetch(`${API_URL}/roles/${encodeURIComponent(name)}`, { method: 'DELETE' });
      await reload();
    } catch (e) {
      alert(e.message || "Failed to delete role");
    }
  };

  // ----- Formation handlers -----
  const handleCreateFormation = (name, slotsMap) => {
    setEditingFormation({ name, data: slotsMap, isNew: true });
    setIsAddingFormation(false);
  };

  const handleSaveFormation = async (name, slots) => {
    try {
      const method = formations[name] ? 'PUT' : 'POST';
      const url = method === 'POST' ? `${API_URL}/formations` : `${API_URL}/formations/${encodeURIComponent(name)}`;
      const body = method === 'POST'
        ? JSON.stringify({ formationName: name, roles: slots })
        : JSON.stringify(slots);
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body });
      setEditingFormation(null);
      await reload();
    } catch (e) {
      alert(e.message || "Failed to save formation");
    }
  };

  const handleDeleteFormation = async (name) => {
    if (!window.confirm(`Delete formation "${name}"?`)) return;
    try {
      await fetch(`${API_URL}/formations/${encodeURIComponent(name)}`, { method: 'DELETE' });
      await reload();
    } catch (e) {
      alert(e.message || "Failed to delete formation");
    }
  };

  const API_URL = "http://localhost:8000"; // local constant for fetch in this file

  return (
    <div className="container">
      <section>
        <h1>Config</h1>

        {/* Roles */}
        <div style={{ marginTop: '2rem' }}>
          <h2>Roles</h2>
          {!editingRole ? (
            <>
              <button onClick={() => setEditingRole({ Role: '', Position: '', Attribute1: '', Attribute2: '', Attribute3: '', Attribute4: '' })}>
                Add New Role
              </button>
              <ul style={{ marginTop: '1rem' }}>
                {roles.map(r => (
                  <li key={r.originalName} style={{ margin: '6px 0' }}>
                    <strong>{r.Role}</strong> — {r.Position}
                    <button style={{ marginLeft: 10 }} onClick={() => setEditingRole(r)}>Edit</button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <RoleEditor
              role={editingRole}
              onSave={handleSaveRole}
              onCancel={() => setEditingRole(null)}
              onDelete={handleDeleteRole}
              attributes={attributes}
            />
          )}
        </div>

        {/* Formations */}
        <div style={{ marginTop: '2rem' }}>
          <h2>Formations</h2>
          {!editingFormation ? (
            <>
              <button onClick={() => setIsAddingFormation(true)}>Add New Formation</button>
              {isAddingFormation && (
                <NewFormationCreator
                  onContinue={handleCreateFormation}
                  onCancel={() => setIsAddingFormation(false)}
                />
              )}
              <ul style={{ marginTop: '1rem' }}>
                {Object.keys(formations).map(name => (
                  <li key={name} style={{ margin: '6px 0' }}>
                    <strong>{name}</strong>
                    <button style={{ marginLeft: 10 }} onClick={() => setEditingFormation({ name, data: formations[name], isNew: false })}>
                      Edit
                    </button>
                    <button style={{ marginLeft: 10 }} onClick={() => handleDeleteFormation(name)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <FormationEditor
              formationName={editingFormation.name}
              formationData={editingFormation.data}
              allRoles={roles}
              onSave={handleSaveFormation}
              onCancel={() => setEditingFormation(null)}
              onDelete={handleDeleteFormation}
              isNew={editingFormation.isNew}
            />
          )}
        </div>
      </section>
    </div>
  );
}
