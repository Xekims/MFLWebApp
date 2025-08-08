// file: frontend/src/PlayerSearch.jsx

import React, { useState, useEffect, useMemo } from 'react';
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

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function PlayerSearch() {
  const { playerId: urlPlayerId } = useParams();
  const navigate = useNavigate();

  const [playerId, setPlayerId] = useState(urlPlayerId || '');
  const [playerData, setPlayerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [allTiers, setAllTiers] = useState([]);
  const [selectedTier, setSelectedTier] = useState('Iron'); // Default to 'Iron' or first available tier

  useEffect(() => {
    (async () => {
      try {
        const tiersResponse = await fetch('http://127.0.0.1:8000/tiers');
        const tiersData = await tiersResponse.json();
        const tiers = tiersData.tiers ?? [];
        setAllTiers(tiers);
        if (!tiers.includes('Iron') && tiers.length > 0) {
          setSelectedTier(tiers[0]);
        }
      } catch (err) {
        console.error('Could not load tiers.', err);
      }
    })();
  }, []);

  const searchForPlayer = async (idToSearch) => {
    if (!idToSearch) return;
    
    setIsLoading(true);
    setError('');
    setPlayerData(null);
    try {
      const data = await api.fetchPlayerAnalysis(idToSearch, selectedTier);
      if (data) {
        setPlayerData(data);
        if (data.overall_best_role) {
          setSelectedTier(data.overall_best_role.tier);
        } else if (allTiers.length > 0) {
          setSelectedTier(allTiers[0]);
        }
      } else {
        setError('Player not found.');
      }
    } catch (err) {
      setError('Player not found or an error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (urlPlayerId) {
      setPlayerId(urlPlayerId);
    }
  }, [urlPlayerId]);

  useEffect(() => {
    if (playerId && allTiers.length > 0) { // Only search if playerId and tiers are loaded
      searchForPlayer(playerId);
    }
  }, [playerId, allTiers, selectedTier]); // Added selectedTier to dependencies

  const handleSearch = (e) => {
    e.preventDefault();
    if (playerId) {
      navigate(`/player-search/${playerId}`);
      // searchForPlayer will be triggered by the useEffect due to playerId change
    } else {
        setError('Please enter a player ID.');
    }
  };

  const handleTierChange = (e) => {
    const newTier = e.target.value;
    setSelectedTier(newTier);
    // searchForPlayer will be triggered by the useEffect due to selectedTier change
  };

  const radarChartData = useMemo(() => {
    if (!playerData) return { labels: [], datasets: [] };

    const attributes = playerData;
    const dataValues = [
      attributes.pace,
      attributes.shooting,
      attributes.passing,
      attributes.dribbling,
      attributes.defense,
      attributes.physical,
    ];

    return {
      labels: ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defense', 'Physical'],
      datasets: [
        {
          label: 'Player Stats',
          data: dataValues,
          backgroundColor: 'rgba(3, 56, 96, 0.4)', // var(--accent-primary) with opacity
          borderColor: 'rgba(3, 56, 96, 1)',
          borderWidth: 1,
          pointBackgroundColor: 'rgba(193, 223, 240, 1)', // var(--text-primary)
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(193, 223, 240, 1)',
        },
      ],
    };
  }, [playerData]);

  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          color: 'rgba(193, 223, 240, 0.2)', // var(--text-primary) with opacity
        },
        grid: {
          color: 'rgba(193, 223, 240, 0.2)',
        },
        pointLabels: {
          color: 'var(--text-primary)',
          font: {
            size: 12,
          },
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          display: false, // Hide the numbers on the scale
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.r !== null) {
              label += context.parsed.r;
            }
            return label;
          }
        }
      }
    },
  };

  const clubMainColor = playerData?.activeContract?.club?.mainColor || 'var(--accent-primary)';
  const clubSecondaryColor = playerData?.activeContract?.club?.secondaryColor || 'var(--accent-primary-hover)';

  return (
    <div className="container">
      <section>
        <h1>Player Search</h1>
        <p>Enter a player ID to view their details.</p>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '15px' }}>
          <input
            type="text"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            placeholder="Enter player ID"
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && <p style={{ color: 'var(--mikado-yellow)', marginTop: '15px' }}>{error}</p>}
      </section>

      {isLoading && <p>Loading player data...</p>}

      {playerData && (
        <div className={`player-card-container ${playerData.activeContract?.club ? 'club-themed' : ''}`}
             style={{
               '--club-main-color': clubMainColor,
               '--club-secondary-color': clubSecondaryColor,
             }}>
          <div className="player-image-pane">
            <img src={`https://d13e14gtps4iwl.cloudfront.net/players/v2/${playerData.player_attributes.id}/photo.webp`} alt={`${playerData.player_attributes.firstName} ${playerData.player_attributes.lastName}`} />
          </div>

          <div className="player-info-pane">
            <div className="player-details">
              <div className="player-overall">{playerData.player_attributes.overall}</div>
              <h2>{playerData.player_attributes.firstName} {playerData.player_attributes.lastName}</h2>
              <p>Nationality: {playerData.player_attributes.nationalities?.join(', ') || 'N/A'}</p>
              <p>Club: {playerData.activeContract?.club?.name || 'N/A'}</p>
              {playerData.player_attributes.positions && playerData.player_attributes.positions.length > 0 && (
                <div className="player-positions">
                  {playerData.player_attributes.positions.map((pos, index) => (
                    <span key={index} className="position-tag">{pos}</span>
                  ))}
                </div>
              )}
            </div>

            {playerData.overall_best_role && playerData.overall_best_role.tier === selectedTier && (
              <div className="player-best-role">
                <h3>Best Role: {playerData.overall_best_role.role}</h3>
                <p>Score: {playerData.overall_best_role.score} &nbsp;&bull;&nbsp; {playerData.overall_best_role.label}</p>
              </div>
            )}

            <div className="player-roles-section">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <h3>Player Roles</h3>
                <select value={selectedTier} onChange={handleTierChange}>
                  {allTiers.map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              {playerData.all_positive_roles_by_tier && playerData.all_positive_roles_by_tier[selectedTier] && playerData.all_positive_roles_by_tier[selectedTier].length > 0 ? (
                <ul>
                  {playerData.all_positive_roles_by_tier[selectedTier]
                    .filter(role => !(playerData.overall_best_role && role.role === playerData.overall_best_role.role && role.tier === playerData.overall_best_role.tier)) // Exclude overall_best_role if it's already displayed
                    .map((role, index) => (
                      <li key={index}>{role.role} ({role.label})</li>
                    ))}
                </ul>
              ) : (
                <p>No positive roles found for the selected tier.</p>
              )}
            </div>
          </div>

          <div className="player-stats-market-pane">
            <h3>Player Stats</h3>
            <div style={{ height: '250px', width: '100%' }}>
              <Radar data={radarChartData} options={radarChartOptions} />
            </div>

            {playerData.listing && (
              <div className="market-listing-info">
                <h3>Market Listing</h3>
                <p>Price: ${playerData.listing.price ? playerData.listing.price.toLocaleString() : 'N/A'}</p>
                <p>Seller: {playerData.listing.sellerName || 'N/A'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
