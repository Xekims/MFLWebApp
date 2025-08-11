import React, { useState, useEffect } from 'react';
import * as api from './api';
import PlayerCard from './PlayerCard';

function PlayerDetailModal({ playerId, orderedTiers, onClose }) {
  const [playerData, setPlayerData] = useState(null);
  const [analysisTier, setAnalysisTier] = useState(orderedTiers?.[0] || 'Iron');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!playerId) return;
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const [cardData, roleData] = await Promise.all([
          api.fetchPlayerCardAnalysis(playerId),
          api.fetchPlayerRoleAnalysis(playerId),
        ]);

        const combinedData = { ...cardData, ...roleData };
        if (!mounted) return;

        setPlayerData(combinedData);
        if (combinedData.overall_best_role?.tier) {
          setAnalysisTier(combinedData.overall_best_role.tier);
        }
      } catch (e) {
        if (!mounted) return;
        console.error('Failed to load player details:', e);
        setError('Failed to load player details.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // ✅ JS boolean
    return () => {
      mounted = false;
    };
  }, [playerId]);

  if (!playerId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--mikado-yellow)' }}>
            {error}
          </div>
        ) : (
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
