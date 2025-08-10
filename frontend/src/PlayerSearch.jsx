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
import RoleGrid from './RoleGrid';

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
  if (value >= 95) return '#186e5dff'; // Gold
  if (value >= 85) return '#7209b7'; // Purple
  if (value >= 75) return '#00296b'; // Blue
  if (value >= 65) return '#386641'; // Green
  if (value >= 55) return '#ffc300'; // Gold
  return '#f2e9e4'; // Light Gray
};

const getAttributeStyle = (value) => {
  let backgroundColor, color;
  if (value >= 95) { backgroundColor = '#186e5dff'; color = '#ffc300'; }
  else if (value >= 85) { backgroundColor = '#7209b7'; color = '#fffffc'; }
  else if (value >= 75) { backgroundColor = '#00296b'; color = '#fffffc'; }
  else if (value >= 65) { backgroundColor = '#386641'; color = '#000814'; }
  else if (value >= 55) { backgroundColor = '#ffc300'; color = '#000814'; }
  else { backgroundColor = '#f2e9e4'; color = '#000814'; }
  return { backgroundColor, color, fontWeight: 'bold', textAlign: 'center', borderRadius: '8px', padding: '0.5rem 1rem', display: 'inline-block' };
};

const formatNationality = (nationality) => {
  if (!nationality) return '';
  return nationality
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const PlayerCard = ({ playerData, analysisTier, setAnalysisTier, orderedTiers, isLoading }) => {
  const { id, metadata, activeContract, listing, overall_best_role, all_positive_roles_by_tier, country_code } = playerData;
  const photoUrl = `https://d13e14gtps4iwl.cloudfront.net/players/v2/${id}/photo.webp`;
  const flagUrl = country_code ? `https://flagcdn.com/w40/${country_code}.png` : '';
  const clubBadgeUrl = activeContract?.club?.id && activeContract?.club?.logoVersion 
    ? `https://d13e14gtps4iwl.cloudfront.net/clubs/${activeContract.club.id}/badge.webp` // Assuming badge.webp exists
    : '';

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

  const clubThemeStyle = useMemo(() => {
    if (activeContract?.club?.mainColor && activeContract?.club?.secondaryColor) {
      return {
        '--club-main-color': activeContract.club.mainColor,
        '--club-secondary-color': activeContract.club.secondaryColor,
      };
    }
    return {};
  }, [activeContract]);

  return (
    <div className="player-card-container" style={clubThemeStyle}>
      <div className="player-card">
        {/* Left Column: Player Image, Flag, Team Badge, Positions, Tier Badge */}
        <div className="player-card-left club-themed">
          <img src={photoUrl} alt={`${metadata.firstName} ${metadata.lastName}`} className="player-photo" />
          {flagUrl && <img src={flagUrl} alt="Nationality Flag" className="player-flag" />}
          <div className="positions">
            {(metadata.positions || []).map(pos => <span key={pos} className="position-pill club-themed">{pos}</span>)}
          </div>
          {overall_best_role?.tier && (
            <span className={`tier-badge tier-${overall_best_role.tier.toLowerCase()}`}>
              {overall_best_role.tier}
            </span>
          )}
        </div>

        {/* Center Pane: Core Info (now main info) */}
        <div className="player-card-center">
          <div className="overall-rating">
            <span style={getAttributeStyle(metadata.overall)}>{metadata.overall}</span>
          </div>
          <div className="player-details">
            <h2>{`${metadata.firstName} ${metadata.lastName}`}</h2>
            <p>{(metadata.nationalities || []).map(formatNationality).join(', ')}</p>
            <p>{activeContract?.club?.name || 'Free Agent'}</p>
          </div>
        </div>

        {/* Right Pane: Stats & Market */}
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

      {/* Roles Section */}
      <div className="role-analysis-section">
        <div className="role-analysis-header">
          <h4>Role Analysis</h4>
          <div className="segmented-control">
            {orderedTiers.map(t => (
              <button
                key={t}
                className={analysisTier === t ? 'active' : ''}
                onClick={() => setAnalysisTier(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <RoleGrid
          roles={all_positive_roles_by_tier ? all_positive_roles_by_tier[analysisTier] : []}
          isLoading={isLoading}
          selectedTier={analysisTier}
          onSelect={(role) => console.log('Selected Role:', role)}
        />
      </div>
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
      const tiers = data.tiers ? Object.keys(data.tiers) : [];
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

      {isLoading && !playerData && <div className="loading-spinner">Loading...</div>}
      {error && <div className="error-message">{error}</div>}
      {playerData && 
        <PlayerCard 
          playerData={playerData} 
          analysisTier={analysisTier} 
          setAnalysisTier={setAnalysisTier} 
          orderedTiers={orderedTiers}
          isLoading={isLoading}
        />
      }
    </div>
  );
}