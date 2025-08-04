// file: frontend/src/Config.jsx
import React, { useState, useEffect } from 'react';
import * as api from './api';

// --- Reusable Editor for a single Role (no changes) ---
const RoleEditor = ({ role, onSave, onCancel, onDelete, attributes }) => {
  const [formData, setFormData] = useState(role);
  const isNew = !role.originalName;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid var(--yale-blue)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
      <h3>{isNew ? 'Add New Role' : `Editing: ${role.originalName}`}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <label>Role Name: <input name="Role" value={formData.Role} onChange={handleChange} required /></label>
        <label>Position: <input name="Position" value={formData.Position} onChange={handleChange} required /></label>
        {[1, 2, 3, 4].map(i => (
          <label key={i}>Attribute {i}:
            <select name={`Attribute${i}`} value={formData[`Attribute${i}`]} onChange={handleChange}>
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

// --- Reusable Editor for a single Formation (no changes) ---
const FormationEditor = ({ formationName, formationData, allRoles, onSave, onCancel, onDelete, isNew = false }) => {
  const [name, setName] = useState(formationName);
  const [slots, setSlots] = useState(formationData);

  const handleRoleChange = (slotName, newRole) => {
    setSlots(prevSlots => ({ ...prevSlots, [slotName]: newRole }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(name, slots);
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid var(--yale-blue)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
      <h3>{isNew ? `Configure Roles for "${name}"` : `Editing: ${formationName}`}</h3>
      {isNew && <p>Assign a role to each slot for your new formation.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {Object.entries(slots).map(([slotName, currentRole]) => (
          <label key={slotName}>{slotName}:
            <select value={currentRole} onChange={(e) => handleRoleChange(slotName, e.target.value)}>
              <option value="">- Unassigned -</option>
              {allRoles.map(role => <option key={role.Role} value={role.Role}>{role.Role}</option>)}
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

// --- Component for the initial creation of a formation (no changes) ---
const NewFormationCreator = ({ onContinue, onCancel }) => {
  const [formationName, setFormationName] = useState('');
  const [slotInput, setSlotInput] = useState('');
  const [slots, setSlots] = useState([]);

  const handleAddSlot = () => {
    const trimmedSlot = slotInput.trim().toUpperCase();
    if (trimmedSlot && !slots.includes(trimmedSlot)) {
      setSlots([...slots, trimmedSlot]);
      setSlotInput('');
    }
  };
  
  const handleRemoveSlot = (slotToRemove) => {
    setSlots(slots.filter(slot => slot !== slotToRemove));
  };
  
  const handleContinue = () => {
    if (formationName && slots.length > 0) {
      onContinue(formationName, slots);
    } else {
      alert('Please provide a formation name and add at least one slot.');
    }
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
  
  // This can be simplified, but for now we leave the functions inside
  const fetchData = async () => { try { const r = await api.fetchRoles(); const fL = await api.fetchFormations(); const aD = await api.fetchAttributes(); setRoles(r); setAttributes(aD.attributes); const aF = {}; for (const fm of fL.formations) { aF[fm] = await api.fetchFormationMap(fm); } setFormations(aF); } catch (err) { console.error("Failed to load config data:", err); }};
  useEffect(() => { fetchData(); }, []);
  const handleSelectRoleToEdit = (roleName) => { if (!roleName) { setEditingRole(null); return; } const r = roles.find(r => r.Role === roleName); setEditingRole({ ...r, originalName: r.Role }); };
  const handleAddNewRole = () => setEditingRole({ Role: '', Position: '', Attribute1: '', Attribute2: '', Attribute3: '', Attribute4: '' });
  const handleSaveRole = async (roleData) => { try { if (editingRole.originalName) { await api.updateRole(editingRole.originalName, roleData); } else { await api.createRole(roleData); } setEditingRole(null); fetchData(); } catch (e) { console.error(e); alert(e.message); }};
  const handleDeleteRole = async (roleName) => { if (window.confirm(`Are you sure you want to delete "${roleName}"?`)) { try { await api.deleteRole(roleName); setEditingRole(null); fetchData(); } catch (e) { console.error(e); alert(e.message); }}};
  const handleSelectFormationToEdit = (formationName) => { if (!formationName) { setEditingFormation(null); return; } setEditingFormation({ name: formationName, data: formations[formationName], isNew: false }); };
  const handleStartNewFormation = (name, slotList) => { const nFD = {}; slotList.forEach(s => { nFD[s] = ""; }); setEditingFormation({ name, data: nFD, isNew: true }); setIsAddingFormation(false); };
  const handleSaveFormation = async (formationName, slots) => { try { if (editingFormation.isNew) { await api.createFormation(formationName, slots); } else { await api.updateFormation(formationName, slots); } setEditingFormation(null); fetchData(); } catch (e) { console.error(e); alert(e.message); }};
  const handleDeleteFormation = async (formationName) => { if (window.confirm(`Are you sure you want to delete the "${formationName}" formation?`)) { try { await api.deleteFormation(formationName); setEditingFormation(null); fetchData(); } catch (e) { console.error(e); alert(e.message); }}};

  return (
    <div>
      <h1>Configuration</h1>
      <section>
        <h2>Manage Roles</h2>
        {/* --- THIS LOGIC IS NOW CORRECTED TO ALWAYS BE VISIBLE --- */}
        {!editingRole && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <select onChange={(e) => handleSelectRoleToEdit(e.target.value)} value={''}>
                    <option value="">Select a role to edit...</option>
                    {roles.map(role => <option key={role.Role} value={role.Role}>{role.Role}</option>)}
                </select>
                <button onClick={handleAddNewRole}>Add New Role</button>
            </div>
        )}
        {editingRole && <RoleEditor role={editingRole} onSave={handleSaveRole} onCancel={() => setEditingRole(null)} onDelete={handleDeleteRole} attributes={attributes} />}
      </section>

      <section style={{marginTop: '3rem'}}>
        <h2>Manage Formations</h2>
        {!editingFormation && !isAddingFormation && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <select onChange={(e) => handleSelectFormationToEdit(e.target.value)} value={''}>
              <option value="">Select a formation to edit...</option>
              {Object.keys(formations).map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <button onClick={() => setIsAddingFormation(true)}>Add New Formation</button>
          </div>
        )}
        
        {isAddingFormation && <NewFormationCreator onContinue={handleStartNewFormation} onCancel={() => setIsAddingFormation(false)} />}
        
        {editingFormation && <FormationEditor 
            formationName={editingFormation.name} 
            formationData={editingFormation.data} 
            allRoles={roles} 
            onSave={handleSaveFormation} 
            onCancel={() => setEditingFormation(null)} 
            onDelete={handleDeleteFormation}
            isNew={editingFormation.isNew}
        />}
      </section>
    </div>
  );
}