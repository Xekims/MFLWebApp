// file: frontend/src/Marketplace.jsx
import React, { useState, useEffect } from "react";
import * as api from "./api";
import PlayerDetailModal from "./PlayerDetailModal";

const attributeMap = {
  PAC: { label: "PAC", key: "pace" },
  SHO: { label: "SHO", key: "shooting" },
  PAS: { label: "PAS", key: "passing" },
  DRI: { label: "DRI", key: "dribbling" },
  DEF: { label: "DEF", key: "defense" },
  PHY: { label: "PHY", key: "physical" },
  GK:  { label: "GK",  key: "goalkeeping" },
};
const defaultAttributeOrder = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY", "GK"];
const ATTR_WEIGHTS = [4, 3, 2, 1]; // to mirror backend scoring

const getAttributeStyle = (value) => {
  let backgroundColor, color;
  if (value >= 95) { backgroundColor = "#000814"; color = "#ffc300"; }
  else if (value >= 85) { backgroundColor = "#7209b7"; color = "#fffffc"; }
  else if (value >= 75) { backgroundColor = "#00296b"; color = "#fffffc"; }
  else if (value >= 65) { backgroundColor = "#386641"; color = "#000814"; }
  else if (value >= 55) { backgroundColor = "#ffc300"; color = "#000814"; }
  else { backgroundColor = "#f2e9e4"; color = "#000814"; }
  return { backgroundColor, color, fontWeight: "bold", textAlign: "center", borderRadius: "4px", padding: "2px 6px" };
};

export default function Marketplace() {
  // --- mode toggle ---
  const [mode, setMode] = useState("buy"); // 'buy' | 'loan'

  const [roles, setRoles] = useState([]);
  const [allTiers, setAllTiers] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [currentRoleDetails, setCurrentRoleDetails] = useState(null);

  const [authToken, setAuthToken] = useState("");
  const [tier, setTier] = useState("Iron");
  const [tierThresholds, setTierThresholds] = useState({});

  const [attributeOrder, setAttributeOrder] = useState(defaultAttributeOrder);

  const [results, setResults] = useState([]);
  const [lastQuery, setLastQuery] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [openPlayerId, setOpenPlayerId] = useState(null);

  // -------- init (roles/tiers) --------
  useEffect(() => {
    (async () => {
      try {
        const [rolesData, tiersResp] = await Promise.all([
          api.fetchRoles(),
          fetch("http://127.0.0.1:8000/tiers").then((r) => r.json()),
        ]);
        setRoles(rolesData);
        const tiers = tiersResp.tiers ? Object.keys(tiersResp.tiers) : [];
        setTierThresholds(tiersResp.tiers || {});
        setAllTiers(tiers);
        if (!tiers.includes("Iron") && tiers.length > 0) setTier(tiers[0]);
      } catch (err) {
        console.error(err);
        setError("Could not load roles and tiers.");
      }
    })();
  }, []);

  // -------- derive attr order from role --------
  useEffect(() => {
    if (selectedRole && roles.length > 0) {
      const details = roles.find((r) => (r.Role || r.RoleType) === selectedRole);
      setCurrentRoleDetails(details || null);
      if (details) {
        const keyAttrs = [details.Attribute1, details.Attribute2, details.Attribute3, details.Attribute4].filter(Boolean);
        const other = defaultAttributeOrder.filter((a) => !keyAttrs.includes(a));
        setAttributeOrder([...keyAttrs, ...other]);
      } else {
        setAttributeOrder(defaultAttributeOrder);
      }
    } else {
      setCurrentRoleDetails(null);
      setAttributeOrder(defaultAttributeOrder);
    }
  }, [selectedRole, roles]);

  // -------- helpers --------
  const roleCodeToKey = (code) => attributeMap[code]?.key;

  const computeFitForLoan = (meta) => {
    if (!currentRoleDetails || !meta) return { score: 0, label: "—" };
    const needPos = (currentRoleDetails.Position || "").trim().toUpperCase();
    const playerPos = new Set((meta.positions || []).map((p) => (p || "").trim().toUpperCase()));
    if (needPos && !playerPos.has(needPos)) return { score: -999, label: "Unusable" };

    const thresholds = tierThresholds[tier] || [80, 77, 74, 70];
    let score = 0;
    ["Attribute1", "Attribute2", "Attribute3", "Attribute4"].forEach((field, i) => {
      const code = (currentRoleDetails[field] || "").trim().toUpperCase();
      if (!code) return;
      const key = roleCodeToKey(code);
      const val = (meta[key] ?? 0);
      score += (val - (thresholds[i] ?? 0)) * (ATTR_WEIGHTS[i] ?? 1);
    });

    const label =
      score >= 50 ? "Elite" :
      score >= 20 ? "Strong" :
      score >= 0  ? "Natural" :
      score >= -20 ? "Weak" : "Unusable";
    return { score, label };
  };

  const getMinRevenueShareBps = (p) => {
    const prefs = p.offerPreferences || [];
    const mins = prefs.map((x) => x?.minRevenueShare).filter((n) => n !== undefined && n !== null);
    if (!mins.length) return null;
    return Math.min(...mins);
  };

  const getPlayingTimeClause = (p) => {
    const clauses = p.offerClauses || p.clauses || [];
    const c = clauses.find((x) => x?.type === "MINIMUM_PLAYING_TIME");
    return c ? { nbMatches: c.nbMatches ?? null, penaltyBps: c.revenueSharePenalty ?? null } : { nbMatches: null, penaltyBps: null };
  };

  // -------- search --------
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!selectedRole || !currentRoleDetails) {
      setError("Please select a role.");
      return;
    }
    setIsLoading(true);
    setError("");
    setResults([]);

    try {
      const thresholds = tierThresholds[tier] || [];
      const attrMins = {};
      const map = { PAC: "pace", SHO: "shooting", PAS: "passing", DRI: "dribbling", DEF: "defense", PHY: "physical", GK: "goalkeeping" };
      [currentRoleDetails.Attribute1, currentRoleDetails.Attribute2, currentRoleDetails.Attribute3, currentRoleDetails.Attribute4]
        .filter(Boolean)
        .forEach((code, i) => { const k = map[code]; if (k) attrMins[`${k}Min`] = thresholds[i] ?? 0; });

      const positions = currentRoleDetails.Position ? [String(currentRoleDetails.Position).trim().toUpperCase()] : [];
      const common = { positions, ...attrMins };

      if (mode === "buy") {
        const q = {
          role_name: selectedRole,
          auth_token: authToken,
          tier,
          ...common,
          sortBy: "listing.price",
          sortOrder: "ASC",
        };
        setLastQuery(q);
        const data = await api.searchMarketplace(q);
        setResults(data ?? []);
      } else {
        const q = {
          // loan: sort by OVR desc by default
          sortBy: "metadata.overall",
          sortOrder: "DESC",
          ...common,
        };
        setLastQuery(q);
        const data = await api.searchLoans(q);
        // annotate each with client-side fit for consistent UX
        const enriched = (data || []).map((p) => {
          const f = computeFitForLoan(p.metadata);
          return { ...p, _fit: f };
        });
        setResults(enriched);
      }
    } catch (err) {
      console.error(err);
      setError("Search failed. Check the token or console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortByPrice = async () => {
    if (!lastQuery || mode !== "buy") return;
    const data = await api.searchMarketplace({
      ...lastQuery,
      sortBy: "listing.price",
      sortOrder: "ASC",
    });
    setResults(data ?? []);
  };

  const handleSortByRevShare = () => {
    if (mode !== "loan") return;
    const sorted = [...results].sort((a, b) => {
      const A = getMinRevenueShareBps(a) ?? Number.MAX_SAFE_INTEGER;
      const B = getMinRevenueShareBps(b) ?? Number.MAX_SAFE_INTEGER;
      return A - B;
    });
    setResults(sorted);
  };

  const handlePlayerClickBuy = (listing) => {
    const id = listing?.player?.id;
    if (id) setOpenPlayerId(id);
  };
  const handlePlayerClickLoan = (p) => {
    const id = p?.id || p?.player?.id;
    if (id) setOpenPlayerId(id);
  };

  // -------- UI --------
  return (
    <div className="container">
      <section>
        <h1>Marketplace Player Search</h1>
        <p>Find players that fit a specific role & tier. Switch between buying and loaning.</p>

        <div className="segmented" style={{ marginBottom: 12 }}>
          <button className={mode === "buy" ? "active" : ""} onClick={() => setMode("buy")}>Buy</button>
          <button className={mode === "loan" ? "active" : ""} onClick={() => setMode("loan")}>Loan</button>
        </div>

        <form onSubmit={handleSearch} className="ui-form">
          {mode === "buy" && (
            <div className="ui-field">
              <label htmlFor="auth">Authentication Token</label>
              <input
                id="auth"
                type="text"
                className="ui-input"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Enter your Bearer Token here"
              />
            </div>
          )}

          <div className="ui-grid">
            <div className="ui-field">
              <label htmlFor="role">Select Role</label>
              <select
                id="role"
                className="ui-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">Select...</option>
                {roles.map((r) => {
                  const rN = r.RoleType || r.Role;
                  return (
                    <option key={rN} value={rN}>{rN}</option>
                  );
                })}
              </select>
            </div>

            <div className="ui-field">
              <label htmlFor="tier">Tier</label>
              <select
                id="tier"
                className="ui-select"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
              >
                {allTiers.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="ui-btn-primary" disabled={isLoading}>
            {isLoading ? "Searching…" : (mode === "buy" ? "Search Market" : "Search Loans")}
          </button>
        </form>

        {error && <p style={{ color: "var(--mikado-yellow)", marginTop: 15 }}>{error}</p>}
      </section>

      {/* -------- BUY RESULTS -------- */}
      {mode === "buy" && results.length > 0 && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>Buy Results</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleSortByPrice}>Sort by Price (Lowest)</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th>Fit</th><th>Name</th><th>Age</th><th>Overall</th><th>Price ($)</th><th>Positions</th>
                  {attributeOrder.map((attrCode) => (
                    <th key={attrCode}>{attributeMap[attrCode].label}</th>
                  ))}
                  <th>Retirement</th>
                </tr>
              </thead>
              <tbody>
                {results.map((listing) => {
                  const p = listing.player.metadata;
                  const rowStyle = { borderTop: "1px solid var(--border-color)", backgroundColor: p.retirementYears ? "rgba(251, 133, 0, 0.15)" : "transparent", cursor: "pointer" };
                  return (
                    <tr key={listing.listingResourceId} style={rowStyle} onClick={() => handlePlayerClickBuy(listing)}>
                      <td style={{ fontWeight: "bold" }}>{p.fit_label}</td>
                      <td>{p.firstName} {p.lastName}</td>
                      <td>{p.age}</td>
                      <td style={{ fontWeight: "bold" }}>{p.overall}</td>
                      <td>{listing.price ? `${listing.price.toLocaleString()}` : "N/A"}</td>
                      <td>{(p.positions || []).join(", ")}</td>
                      {attributeOrder.map((attrCode) => (
                        <td key={attrCode} style={{ padding: "6px 8px" }}>
                          <span style={getAttributeStyle(p[attributeMap[attrCode].key])}>
                            {p[attributeMap[attrCode].key]}
                          </span>
                        </td>
                      ))}
                      <td style={{ fontWeight: "bold", color: "var(--ut-orange)" }}>{p.retirementYears || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* -------- LOAN RESULTS -------- */}
      {mode === "loan" && results.length > 0 && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>Loan Results</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleSortByRevShare}>Sort by Rev Share (Lowest)</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th>Fit</th><th>Name</th><th>Age</th><th>Overall</th>
                  <th>Min Rev Share</th><th>Positions</th>
                  {attributeOrder.map((attrCode) => (<th key={attrCode}>{attributeMap[attrCode].label}</th>))}
                  <th>Min Matches</th><th>Penalty</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => {
                  const meta = p.metadata || {};
                  const fit = p._fit || { label: "—" };
                  const minBps = getMinRevenueShareBps(p);
                  const { nbMatches, penaltyBps } = getPlayingTimeClause(p);
                  const rowStyle = { borderTop: "1px solid var(--border-color)", cursor: "pointer" };
                  return (
                    <tr key={p.id} style={rowStyle} onClick={() => handlePlayerClickLoan(p)}>
                      <td style={{ fontWeight: "bold" }}>{fit.label}</td>
                      <td>{meta.firstName} {meta.lastName}</td>
                      <td>{meta.age}</td>
                      <td style={{ fontWeight: "bold" }}>{meta.overall}</td>
                      <td>{minBps === null ? "—" : `${(minBps / 100).toFixed(0)}%`}</td>
                      <td>{(meta.positions || []).join(", ")}</td>
                      {attributeOrder.map((attrCode) => (
                        <td key={attrCode} style={{ padding: "6px 8px" }}>
                          <span style={getAttributeStyle(meta[attributeMap[attrCode].key])}>
                            {meta[attributeMap[attrCode].key]}
                          </span>
                        </td>
                      ))}
                      <td>{nbMatches ?? "—"}</td>
                      <td>{penaltyBps === null ? "—" : `${(penaltyBps / 100).toFixed(0)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {openPlayerId && (
        <PlayerDetailModal
          playerId={openPlayerId}
          orderedTiers={allTiers}
          onClose={() => setOpenPlayerId(null)}
        />
      )}
    </div>
  );
}
