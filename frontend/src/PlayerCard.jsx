// frontend/src/PlayerCard.jsx
import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import RoleGrid from "./RoleGrid";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Order is important: labels and values follow this sequence
const ATTR_ORDER = [
  { key: "pace",      short: "PAC", long: "Pace" },
  { key: "shooting",  short: "SHO", long: "Shooting" },
  { key: "passing",   short: "PAS", long: "Passing" },
  { key: "dribbling", short: "DRI", long: "Dribbling" },
  { key: "defense",   short: "DEF", long: "Defense" },
  { key: "physical",  short: "PHY", long: "Physical" },
];

const ATTR_LABELS = ATTR_ORDER.map(a => a.long);

// Your quick-glance palette
const getAttributeStyle = (value) => {
  let backgroundColor, color;
  if (value >= 95) { backgroundColor = "#186e5dff"; color = "#ffc300"; }
  else if (value >= 85) { backgroundColor = "#7209b7"; color = "#fffffc"; }
  else if (value >= 75) { backgroundColor = "#00296b"; color = "#fffffc"; }
  else if (value >= 65) { backgroundColor = "#386641"; color = "#000814"; }
  else if (value >= 55) { backgroundColor = "#ffc300"; color = "#000814"; }
  else { backgroundColor = "#f2e9e4"; color = "#000814"; }
  return {
    backgroundColor,
    color,
    fontWeight: "bold",
    textAlign: "center",
    borderRadius: "8px",
    padding: "0.5rem 1rem",
    display: "inline-block",
  };
};

const countryToFlagCode = (code) =>
  (code || "").trim().toLowerCase().slice(0, 2);

const formatNationality = (nat) =>
  (nat || "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

export default function PlayerCard({
  playerData,
  analysisTier,
  setAnalysisTier,
  orderedTiers = [],
  isLoading = false,
}) {
  const {
    id,
    metadata = {},
    activeContract = {},
    listing,
    overall_best_role,
    all_positive_roles_by_tier,
  } = playerData || {};

  const photoUrl = id
    ? `https://d13e14gtps4iwl.cloudfront.net/players/v2/${id}/photo.webp`
    : "";

  const flagCode =
    playerData?.country_code ||
    metadata?.country_code ||
    (metadata?.nationalities?.[0] ? metadata.nationalities[0].slice(0, 2) : "");
  const flagUrl = countryToFlagCode(flagCode)
    ? `https://flagcdn.com/w40/${countryToFlagCode(flagCode)}.png`
    : "";

  // Build radar labels & values together to ensure alignment
  const radarLabels = useMemo(() => ATTR_ORDER.map(a => a.short), []);
  const radarValues = useMemo(
    () => ATTR_ORDER.map(a => metadata?.[a.key] ?? 0),
    [metadata]
  );
  const perPointColors = useMemo(
    () => radarValues.map(v => getAttributeStyle(v).backgroundColor),
    [radarValues]
  );

  const chartData = useMemo(
    () => ({
      labels: radarLabels,
      datasets: [
        {
          label: "Attributes",
          data: radarValues,
          backgroundColor: (ctx) => {
            const { chartArea, ctx: g } = ctx.chart;
            if (!chartArea) return "rgba(30,92,255,0.10)";
            const x = (chartArea.left + chartArea.right) / 2;
            const y = (chartArea.top + chartArea.bottom) / 2;
            const r = Math.max(chartArea.width, chartArea.height) / 2;
            const grad = g.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, "rgba(30,92,255,0.22)");
            grad.addColorStop(1, "rgba(30,92,255,0.06)");
            return grad;
          },
          borderColor: "rgba(232,238,248,0.95)",
          borderWidth: 2.5,
          pointBackgroundColor: perPointColors,
          pointBorderColor: perPointColors,
          pointHoverBackgroundColor: perPointColors,
          pointHoverBorderColor: perPointColors,
          pointRadius: 2.5,
          pointHoverRadius: 4,
          fill: true,
        },
      ],
    }),
    [radarLabels, radarValues, perPointColors]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 8 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ATTR_ORDER[ctx.dataIndex].long}: ${ctx.parsed.r}`,
          },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          beginAtZero: true,
          ticks: { display: false },
          grid: {
            circular: true,
            color: "rgba(255,255,255,0.08)",
            lineWidth: 1.2,
          },
          angleLines: { display: false },
          pointLabels: {
            color: "#a8b3cc",
            font: { size: 12, weight: "600" },
          },
          // PAC at top, then clockwise matches ATTR_ORDER order
          startAngle: -90, // degrees; puts the first label (PAC) at the top
        },
      },
      elements: { line: { borderWidth: 2.5 } },
    }),
    []
  );

  return (
    <div className="player-card-container">
      <div className="player-card">
        {/* Left */}
        <div className="player-card-left">
          {photoUrl && (
            <img
              src={photoUrl}
              alt={`${metadata.firstName || ""} ${metadata.lastName || ""}`}
              className="player-photo"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
          )}

          {flagUrl && (
            <img
              src={flagUrl}
              alt="Nationality Flag"
              className="player-flag"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}

          <div className="positions">
            {(metadata.positions || []).map((pos) => (
              <span key={pos} className="position-pill">
                {pos}
              </span>
            ))}
          </div>

          {overall_best_role?.tier && (
            <span
              className={`tier-badge tier-${String(
                overall_best_role.tier
              ).toLowerCase()}`}
            >
              {overall_best_role.tier}
            </span>
          )}
        </div>

        {/* Middle */}
        <div className="player-card-center">
          <div className="overall-rating">
            <span style={getAttributeStyle(metadata.overall ?? 0)}>
              {metadata.overall ?? 0}
            </span>
          </div>

          <div className="player-details">
            <h2>{`${metadata.firstName || ""} ${
              metadata.lastName || ""
            }`.trim()}</h2>
            <p>
              {(metadata.nationalities || [])
                .map(formatNationality)
                .join(", ")}
            </p>
            <p>{activeContract?.club?.name || "Free Agent"}</p>
          </div>
        </div>

        {/* Right */}
        <div className="player-card-right">
          <div className="radar-chart-container">
            {!isLoading && <Radar data={chartData} options={chartOptions} />}
          </div>

          <div className="attr-legend">
            {ATTR_ORDER.map((attr, i) => {
              const val = radarValues[i] ?? 0;
              const bg = getAttributeStyle(val).backgroundColor;
              return (
                <div className="attr-chip" key={attr.key}>
                  <span className="label">
                    <span className="dot" style={{ background: bg }} />
                    {attr.long}
                  </span>
                  <span className="val">{val}</span>
                </div>
              );
            })}
          </div>

          {listing && (
            <div className="market-listing">
              <p>
                <strong>Market Price:</strong>{" "}
                {Number(listing.price || 0).toLocaleString()}
              </p>
              {listing.sellerName && (
                <p>
                  <strong>Seller:</strong> {listing.sellerName}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role Analysis */}
      <div className="role-analysis-section">
        <div className="role-analysis-header">
          <h4>Role Analysis</h4>
          <div className="segmented-control">
            {orderedTiers.map((t) => (
              <button
                key={t}
                className={analysisTier === t ? "active" : ""}
                onClick={() => setAnalysisTier(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <RoleGrid
          roles={
            all_positive_roles_by_tier?.[analysisTier]
              ? all_positive_roles_by_tier[analysisTier]
              : []
          }
          isLoading={!!isLoading}
          selectedTier={analysisTier}
          onSelect={() => {}}
        />
      </div>
    </div>
  );
}
