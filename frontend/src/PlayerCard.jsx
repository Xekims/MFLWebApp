import React, { useMemo } from 'react';
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

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

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

const formatNationality = (nationality) =>
  (nationality || '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

export default function PlayerCard({ playerData, analysisTier, setAnalysisTier, orderedTiers, isLoading }) {
  const { id, metadata = {}, activeContract = {}, listing, overall_best_role, all_positive_roles_by_tier, country_code } = playerData || {};
  const photoUrl = id ? `https://d13e14gtps4iwl.cloudfront.net/players/v2/${id}/photo.webp` : '';
  const flagUrl = country_code ? `https://flagcdn.com/w40/${country_code}.png` : '';

  const chartData = useMemo(() => {
    if (!metadata) return null;
    const labels = ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defense', 'Physical'];
    const dataPoints = [
      metadata.pace, metadata.shooting, metadata.passing,
      metadata.dribbling, metadata.defense, metadata.physical
    ];
    return {
      labels,
      datasets: [
        {
          label: 'Attributes',
          data: dataPoints,
          fill: true,
        }
      ],
    };
  }, [metadata]);

  const chartOptions = useMemo(() => ({
    elements: {
      line: { borderWidth: 2 }
    },
    scales: {
      r: {
        beginAtZero: true,
        suggestedMax: 100,
        ticks: { display: true, stepSize: 10 },
        grid: { circular: true }
      }
    },
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
  }), []);

  return (
    <div className="player-card-container">
      <div className="player-card">
        {/* Left */}
        <div className="player-card-left">
          {photoUrl && <img src={photoUrl} alt={`${metadata.firstName} ${metadata.lastName}`} className="player-photo" />}
          {flagUrl && <img src={flagUrl} alt="Nationality Flag" className="player-flag" />}
          <div className="positions">
            {(metadata.positions || []).map(pos => <span key={pos} className="position-pill">{pos}</span>)}
          </div>
          {overall_best_role?.tier && (
            <span className={`tier-badge tier-${(overall_best_role.tier || '').toLowerCase()}`}>
              {overall_best_role.tier}
            </span>
          )}
        </div>

        {/* Center */}
        <div className="player-card-center">
          <div className="overall-rating">
            <span style={getAttributeStyle(metadata.overall)}>{metadata.overall}</span>
          </div>
          <div className="player-details">
            <h2>{`${metadata.firstName || ''} ${metadata.lastName || ''}`.trim()}</h2>
            <p>{(metadata.nationalities || []).map(formatNationality).join(', ')}</p>
            <p>{activeContract?.club?.name || 'Free Agent'}</p>
          </div>
        </div>

        {/* Right */}
        <div className="player-card-right">
          <div className="radar-chart-container">
            {chartData && <Radar data={chartData} options={chartOptions} />}
          </div>
          {listing && (
            <div className="market-listing">
              <p><strong>Market Price:</strong> {Number(listing.price || 0).toLocaleString()}</p>
              {listing.sellerName && <p><strong>Seller:</strong> {listing.sellerName}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Roles Section */}
      <div className="role-analysis-section">
        <div className="role-analysis-header">
          <h4>Role Analysis</h4>
          <div className="segmented-control">
            {(orderedTiers || []).map(t => (
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
          roles={(all_positive_roles_by_tier && all_positive_roles_by_tier[analysisTier]) ? all_positive_roles_by_tier[analysisTier] : []}
          isLoading={!!isLoading}
          selectedTier={analysisTier}
          onSelect={() => {}}
        />
      </div>
    </div>
  );
}
