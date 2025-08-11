import React, { useState, useEffect } from 'react';
import * as api from './api';
import PlayerCard from './PlayerCard';  // Reusable component extracted from PlayerSearch

function PlayerDetailModal({ playerId, orderedTiers, onClose }) {
  const [playerData, setPlayerData] = useState(null);
  const [analysisTier, setAnalysisTier] = useState(orderedTiers?.[0] || 'Iron');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setError('');
    // Fetch full player details (card info and role analysis)
    Promise.all([
      api.fetchPlayerCardAnalysis(playerId),
      api.fetchPlayerRoleAnalysis(playerId)
    ]).then(([cardData, roleData]) => {
      const combinedData = { ...cardData, ...roleData };
      setPlayerData(combinedData);
      // Set default tier to player's best tier if available
      if (combinedData.overall_best_role?.tier) {
        setAnalysisTier(combinedData.overall_best_role.tier);
      }
    }).catch(err => {
      console.error('Failed to load player details:', err);
      setError('Failed to load player details.');
    }).finally(() => {
      setLoading(false);
    });
  }, [playerId]);

  if (!playerId) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>X</button>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--mikado-yellow)' }}>
            {error}
          </div>
        ) : (
          /* Render full player details card */
          <PlayerCard 
            playerData={playerData} 
            analysisTier={analysisTier} 
            setAnalysisTier={setAnalysisTier} 
            orderedTiers={orderedTiers} 
            isLoading={false} 
          />
        )}
      </div>
    </div>
  );
}

export default PlayerDetailModal;
