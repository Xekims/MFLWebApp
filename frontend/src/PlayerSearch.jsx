// frontend/src/PlayerSearch.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from './api';
import PlayerCard from './PlayerCard';

export default function PlayerSearch() {
  const { playerId: urlPlayerId } = useParams();
  const navigate = useNavigate();

  const [playerId, setPlayerId] = useState(urlPlayerId || '');
  const [playerData, setPlayerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderedTiers, setOrderedTiers] = useState([]);
  const [analysisTier, setAnalysisTier] = useState('Iron');

  // ---------- helpers (local to this page) ----------
  const toPercent = (energy = 0) =>
    Math.max(0, Math.min(100, Math.round(energy / 100)));

  const energyBucket = (e = 0) => {
    if (e >= 9000) return { label: 'Fresh', tone: 'good' };
    if (e >= 7000) return { label: 'OK', tone: 'ok' };
    if (e >= 5000) return { label: 'Tiring', tone: 'warn' };
    return { label: 'Low', tone: 'bad' };
  };

  const seasonEnd = (startSeason, nbSeasons) =>
    typeof startSeason === 'number' && typeof nbSeasons === 'number'
      ? startSeason + nbSeasons - 1
      : null;

  const percentFromBasisPoints = (bp = 0) => `${(bp / 100).toFixed(0)}%`;

  const ago = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (d >= 365) return `${Math.floor(d / 365)}y ago`;
    if (d >= 30) return `${Math.floor(d / 30)}mo ago`;
    if (d >= 7) return `${Math.floor(d / 7)}w ago`;
    return `${d}d ago`;
  };

  const prettyClause = (c) => {
    if (!c?.type) return '';
    switch (c.type) {
      case 'MINIMUM_PLAYING_TIME':
        return `Min. playing time: ${c.nbMatches ?? '-'} matches (−${percentFromBasisPoints(
          c.revenueSharePenalty || 0
        )})`;
      default:
        return c.type
          .split('_')
          .map((w) => w[0] + w.slice(1).toLowerCase())
          .join(' ');
    }
  };
  // --------------------------------------------------

  // Load available tiers once (for tab order on PlayerCard)
  useEffect(() => {
    (async () => {
      try {
        const data = await api.fetchTiers?.();
        const tiers = data?.tiers ? Object.keys(data.tiers) : [];
        if (tiers.length) {
          setOrderedTiers(tiers);
          setAnalysisTier(tiers[0]);
        }
      } catch {
        // non-fatal; PlayerCard will still render
      }
    })();
  }, []);

  const handleSearch = useCallback(
    async (idToSearch) => {
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
        const combined = { ...cardData, ...roleData };
        setPlayerData(combined);

        // Default tier tab to “best” if API returns it
        if (combined?.overall_best_role?.tier) {
          setAnalysisTier(combined.overall_best_role.tier);
        }

        navigate(`/player-search/${idToSearch}`, { replace: true });
      } catch (e) {
        console.error(e);
        setError(`Player with ID '${idToSearch}' not found.`);
        setPlayerData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate]
  );

  // Fetch if URL already has an ID
  useEffect(() => {
    if (urlPlayerId) handleSearch(urlPlayerId);
  }, [urlPlayerId, handleSearch]);

  const onSubmit = (e) => {
    e.preventDefault();
    handleSearch(playerId.trim());
  };

  // ---------- derived fields for the extra info cards ----------
  const md = playerData?.metadata || {};
  const ac = playerData?.activeContract || {};
  const club = ac?.club || {};
  const owner = playerData?.ownedBy || {};
  const energyPct = toPercent(playerData?.energy || 0);
  const { label: energyText, tone: energyTone } = energyBucket(playerData?.energy || 0);
  const seasonEndVal = seasonEnd(ac.startSeason, ac.nbSeasons);
  // ------------------------------------------------------------

  return (
    <div className="player-search-page v2 compact">
      <div className="container">
        <section>
          <h1 style={{ marginBottom: '1rem' }}>Player Search</h1>

          <form onSubmit={onSubmit} className="ui-form" style={{ maxWidth: 520 }}>
            <div className="ui-field">
              <label htmlFor="playerId">Player ID</label>
              <div className="search-controls">
                <input
                  id="playerId"
                  type="text"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  placeholder="Enter Player ID"
                  className="ui-input"
                  autoComplete="off"
                  inputMode="numeric"
                />
                <button
                  type="submit"
                  className="ui-btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Searching…' : 'Search'}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div style={{ color: '#ffb136', marginTop: '0.75rem' }}>{error}</div>
          )}
        </section>

        {playerData && (
          <>
            {/* Main reusable player card (unchanged, used by other pages/modals) */}
            <div style={{ marginTop: '1rem' }}>
              <PlayerCard
                playerData={playerData}
                analysisTier={analysisTier}
                setAnalysisTier={setAnalysisTier}
                orderedTiers={orderedTiers}
                isLoading={isLoading}
              />
            </div>

            {/* Extras that appear ONLY on the Player Search page */}
            <div className="ps-grid" style={{ marginTop: 12 }}>
              {/* Profile */}
              <div className="ps-card">
                <h3 style={{ marginBottom: 8 }}>Profile</h3>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div><strong>Age:</strong> {md.age ?? '—'}</div>
                  <div><strong>Height:</strong> {md.height ? `${md.height} cm` : '—'}</div>
                  <div>
                    <strong>Preferred Foot:</strong>{' '}
                    {md.preferredFoot
                      ? md.preferredFoot[0] + md.preferredFoot.slice(1).toLowerCase()
                      : '—'}
                  </div>
                  <div><strong>Positions:</strong> {(md.positions || []).join(', ') || '—'}</div>
                </div>
              </div>

              {/* Contract */}
              <div className="ps-card contract-card">
                <h3 style={{ marginBottom: 8 }}>Contract</h3>

                {club?.name ? (
                  <div
                    className="club-chip"
                    style={{
                      border: '1px solid var(--border-color)',
                      background: '#0c1730',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: club.mainColor || '#1e5cff',
                      }}
                    />
                    <span>
                      {club.name.trim()} · Div {club.division ?? '—'}
                    </span>
                  </div>
                ) : (
                  <div className="club-chip" style={{ opacity: 0.8 }}>
                    Free Agent
                  </div>
                )}

                <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                  <div><strong>Status:</strong> {ac.status || '—'}</div>
                  <div>
                    <strong>Seasons:</strong>{' '}
                    {typeof ac.startSeason === 'number' && typeof ac.nbSeasons === 'number'
                      ? `${ac.startSeason}–${seasonEndVal}`
                      : '—'}
                    {ac.autoRenewal ? ' · Auto-renewal' : ''}
                  </div>
                  <div>
                    <strong>Revenue Share:</strong>{' '}
                    {percentFromBasisPoints(ac.revenueShare || 0)}
                    {ac.totalRevenueShareLocked
                      ? ` (${percentFromBasisPoints(ac.totalRevenueShareLocked)} locked)`
                      : ''}
                  </div>

                  {(ac.clauses || []).slice(0, 2).map((c) => (
                    <div key={c.id}>
                      <strong>Clause:</strong> {prettyClause(c)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ownership & Status */}
              <div className="ps-card">
                <h3 style={{ marginBottom: 8 }}>Ownership & Status</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div>
                    <strong>Owner:</strong> {owner.name || '—'}
                    {owner.walletAddress ? ` · ${owner.walletAddress.slice(0, 10)}…` : ''}
                  </div>

                  <div>
                    <strong>Owned Since:</strong>{' '}
                    {playerData.ownedSince
                      ? `${new Date(playerData.ownedSince).toLocaleDateString()} (${ago(
                          playerData.ownedSince
                        )})`
                      : '—'}
                  </div>

                  <div>
                    <strong>Energy:</strong> {energyPct}%
                    <div className={`energy-bar energy--${energyTone}`} style={{ marginTop: 6 }}>
                      <span style={{ width: `${energyPct}%` }} />
                    </div>
                    <div style={{ fontSize: '.85rem', opacity: 0.8, marginTop: 4 }}>
                      {energyText}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div><strong>Yellows (season):</strong> {playerData.nbSeasonYellows ?? 0}</div>
                    {'offerStatus' in playerData && (
                      <div><strong>Offer Status:</strong> {playerData.offerStatus}</div>
                    )}
                    {'hasPreContract' in playerData && (
                      <div><strong>Pre-contract:</strong> {playerData.hasPreContract ? 'Yes' : 'No'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
