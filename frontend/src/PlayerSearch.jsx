import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from './api';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Helper function to determine point color based on value
const getPointColor = (value) => {
  if (value >= 95) return '#ffc300'; // Gold
  if (value >= 85) return '#7209b7'; // Purple
  if (value >= 75) return '#00296b'; // Blue
  if (value >= 65) return '#386641'; // Green
  if (value >= 55) return '#ffc300'; // Gold
  return '#f2e9e4'; // Light Gray
};

const getAttributeStyle = (value) => {
  let backgroundColor, color;
  if (value >= 95) { backgroundColor = '#000814'; color = '#ffc300'; }
  else if (value >= 85) { backgroundColor = '#7209b7'; color = '#fffffc'; }
  else if (value >= 75) { backgroundColor = '#00296b'; color = '#fffffc'; }
  else if (value >= 65) { backgroundColor = '#386641'; color = '#000814'; }
  else if (value >= 55) { backgroundColor = '#ffc300'; color = '#000814'; }
  else { backgroundColor = '#f2e9e4'; color = '#000814'; }
  return { backgroundColor, color, fontWeight: 'bold', textAlign: 'center', borderRadius: '8px', padding: '0.5rem 1rem', display: 'inline-block' };
};

const PlayerCard = ({ playerData, analysisTier, setAnalysisTier, orderedTiers }) => {
  const { id, metadata, activeContract, listing, overall_best_role, all_positive_roles_by_tier } = playerData;
  const photoUrl = `https://d13e14gtps4iwl.cloudfront.net/players/v2/${id}/photo.webp`;

  const chartData = useMemo(() => {
    if (!metadata) return null;
    const labels = ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defense', 'Physical'];
    const dataPoints = [
      metadata.pace,
      metadata.shooting,
      metadata.passing,
      metadata.dribbling,
      metadata.defense,
      metadata.physical,
    ];
    const pointColors = dataPoints.map(value => getPointColor(value));

    return {
      labels,
      datasets: [
        {
          label: 'Core Stats',
          data: dataPoints,
          backgroundColor: 'rgba(3, 56, 96, 0.6)',
          borderColor: 'rgba(193, 223, 240, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: pointColors,
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: (context) => getPointColor(context.raw)
        },
      ],
    };
  }, [metadata]);

  const chartOptions = {
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
        grid: { color: 'rgba(255, 255, 255, 0.2)' },
        pointLabels: { color: '#c1dff0', font: { size: 14, family: 'Kanit, sans-serif', weight: '500' } },
        ticks: { display: false },
        suggestedMin: 40,
        suggestedMax: 100,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true, callbacks: { label: (context) => `${context.label}: ${context.raw}` } }
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="player-card-container">
      <div className="player-card">
        <div className="player-card-left">
          <img src={photoUrl} alt={`${metadata.firstName} ${metadata.lastName}`} className="player-photo" />
        </div>
        <div className="player-card-center">
          <div className="overall-rating">
            <span style={getAttributeStyle(metadata.overall)}>{metadata.overall}</span>
          </div>
          <div className="player-details">
            <h2>{`${metadata.firstName} ${metadata.lastName}`}</h2>
            <p>{(metadata.nationalities || []).join(', ')}</p>
            <p>{activeContract?.club?.name || 'Free Agent'}</p>
          </div>
          <div className="positions">
            {(metadata.positions || []).map(pos => <span key={pos} className="position-pill">{pos}</span>)}
          </div>
        </div>
        <div className="player-card-right">
          <div className="radar-chart-container">
            {chartData && <Radar data={chartData} options={chartOptions} />}
          </div>
          {listing && (
            <div className="market-listing">
              <p><strong>Market Price:</strong> {listing.price.toLocaleString()}</p>
              <p><strong>Seller:</strong> {listing.sellerName}</p>
            </div>
          )}
        </div>
      </div>
      {overall_best_role && all_positive_roles_by_tier && (
        <div className="role-analysis-section">
          <div className="role-analysis-header">
            <h4>Role Analysis</h4>
            <select value={analysisTier} onChange={(e) => setAnalysisTier(e.target.value)}>
              {orderedTiers.map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          {overall_best_role.tier === analysisTier && (
            <p className="best-role-display"><strong>Best Role:</strong> {overall_best_role.role} <span>({overall_best_role.score})</span></p>
          )}
          <h5>All Positive Roles for {analysisTier} Tier:</h5>
          <ul className="positive-roles-list">
            {all_positive_roles_by_tier[analysisTier] && all_positive_roles_by_tier[analysisTier].length > 0 ? (
              all_positive_roles_by_tier[analysisTier]
                .filter(role => !(overall_best_role && role.role === overall_best_role.role && role.tier === overall_best_role.tier))
                .map((role, index) => (
                  <li key={index}>{role.role} <span>{role.score} ({role.label})</span></li>
                ))
            ) : (
              <li>No positive roles found for this tier.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default function PlayerSearch() {
  const { playerId: urlPlayerId } = useParams();
  const navigate = useNavigate();

  const [playerId, setPlayerId] = useState(urlPlayerId || '');
  const [playerData, setPlayerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderedTiers, setOrderedTiers] = useState([]);
  const [analysisTier, setAnalysisTier] = useState('Iron');

  useEffect(() => {
    api.fetchTiers().then(data => {
      const tiers = data.tiers ?? [];
      setOrderedTiers(tiers);
      if (tiers.length > 0) setAnalysisTier(tiers[0]);
    }).catch(err => console.error("Failed to load tiers", err));
  }, []);

  const handleSearch = useCallback(async (idToSearch) => {
    if (!idToSearch) {
      setError('Please provide a Player ID.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setPlayerData(null);
    
    try {
      const [cardData, roleData] = await Promise.all([
        api.fetchPlayerCardAnalysis(idToSearch),
        api.fetchPlayerRoleAnalysis(idToSearch),
      ]);
      const combinedData = { ...cardData, ...roleData };
      setPlayerData(combinedData);
      if (combinedData.overall_best_role) {
        setAnalysisTier(combinedData.overall_best_role.tier);
      }
      navigate(`/player-search/${idToSearch}`, { replace: true });
    } catch (err) {
      console.error(err);
      setError(`Player with ID '${idToSearch}' not found.`);
      setPlayerData(null);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (urlPlayerId) {
      handleSearch(urlPlayerId);
    }
  }, [urlPlayerId, handleSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(playerId);
  };

  return (
    <div className="player-search-page">
      <form onSubmit={handleSubmit} className="player-search-form-page">
        <input
          type="text"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          placeholder="Enter Player ID"
          className="player-search-input-page"
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {isLoading && <div className="loading-spinner">Loading...</div>}
      {error && <div className="error-message">{error}</div>}
      {playerData && 
        <PlayerCard 
          playerData={playerData} 
          analysisTier={analysisTier} 
          setAnalysisTier={setAnalysisTier} 
          orderedTiers={orderedTiers} 
        />
      }
    </div>
  );
}