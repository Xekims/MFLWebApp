// file: frontend/src/Agency.jsx
import React, { useState, useEffect, useMemo } from 'react';
import * as api from './api';

const SquadTable = ({ squadData }) => {
  const { totalFitScore, averageFitScore } = useMemo(() => {
    if (!squadData || squadData.length === 0) return { totalFitScore: 0, averageFitScore: 0 };
    const players = squadData.filter(p => p.player_id);
    const total = players.reduce((sum, p) => sum + (p.fit_score || 0), 0);
    const avg = total / (players.length || 1);
    return { totalFitScore: total, averageFitScore: avg.toFixed(1) };
  }, [squadData]);

  return (
    <div>
        <div style={{textAlign: 'right', marginBottom: '1rem'}}>
            <div>Total Fit Score: <span style={{color: 'var(--mikado-yellow)', fontWeight: 'bold'}}>{totalFitScore}</span></div>
            <div>Average Fit Score: <span style={{color: 'var(--mikado-yellow)', fontWeight: 'bold'}}>{averageFitScore}</span></div>
        </div>
      <table>
        <thead><tr><th>Slot</th><th>Role</th><th>Player</th><th>Fit</th><th>Label</th></tr></thead>
        <tbody>
          {squadData.map(row => (
            <tr key={row.slot}>
              <td>{row.slot}</td>
              <td>{row.assigned_role}</td>
              <td>{row.player_name || '—'}</td>
              <td>{row.fit_score ?? ''}</td>
              <td>{row.fit_label ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function Agency() {
  const [savedSquads, setSavedSquads] = useState({});
  const [expandedSquad, setExpandedSquad] = useState(null);

  const fetchData = async () => {
    const data = await api.fetchSavedSquads();
    setSavedSquads(data);
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const handleDelete = async (squadName) => {
      if (window.confirm(`Are you sure you want to delete the squad "${squadName}"?`)) {
          try {
              await api.deleteSquad(squadName);
              fetchData(); // Refresh
          } catch(err) {
              alert("Failed to delete squad.");
          }
      }
  };

  return (
    <div className="container">
      <section>
        <h1>My Agency - Saved Squads</h1>
        {Object.keys(savedSquads).length === 0 ? (
          <p>You have not saved any squads yet. Go to the Squad Picker to create and save one.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {Object.entries(savedSquads).map(([name, squad]) => (
              <div key={name} style={{border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} onClick={() => setExpandedSquad(expandedSquad === name ? null : name)}>
                  <h3 style={{margin: 0}}>{name}</h3>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={(e) => { e.stopPropagation(); alert('Editing not implemented yet.'); }}>Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(name); }}>Delete</button>
                  </div>
                </div>
                {expandedSquad === name && <SquadTable squadData={squad.squad_data} />}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}