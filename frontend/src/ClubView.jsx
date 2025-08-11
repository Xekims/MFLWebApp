// file: frontend/src/ClubView.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "./api";

// ---------- Small helpers ----------
const normaliseTierList = (tiersPayload) => {
  // backend returns { tiers: {Iron: [...], Bronze: [...] } } or { tiers: ["Iron", ...] }
  const mapOrArr = tiersPayload?.tiers;
  if (Array.isArray(mapOrArr)) return mapOrArr;
  if (mapOrArr && typeof mapOrArr === "object") return Object.keys(mapOrArr);
  return [];
};

// Turn "RCB", "LCM", "RAM", "DM", "AM", "CB2" into the role key we store in roles.json
const canonPos = (p) => {
  let x = String(p || "").toUpperCase().replace(/\s+/g, "");
  x = x.replace(/\d+$/,""); // strip trailing numbers like "CB1"
  const BASE = new Set(["GK","CB","LB","RB","LWB","RWB","CDM","CM","CAM","LM","RM","LW","RW","CF","ST"]);
  if (BASE.has(x)) return x;
  // strip leading side markers
  if ((x.startsWith("L") || x.startsWith("R")) && BASE.has(x.slice(1))) return x.slice(1);
  // common synonyms
  if (x === "DM") return "CDM";
  if (x === "AM") return "CAM";
  // side + mid combos
  const sideStripped = (x.startsWith("L") || x.startsWith("R")) ? x.slice(1) : x;
  if (BASE.has(sideStripped)) return sideStripped;
  return x; // fallback
};

const normaliseFormationsList = (formationsPayload) => {
  // backend returns a mapping of name -> slots
  if (Array.isArray(formationsPayload)) return formationsPayload;
  if (formationsPayload && typeof formationsPayload === "object") return Object.keys(formationsPayload);
  return [];
};

const getSlotPosition = (slotVal) => {
  if (!slotVal) return "";
  return (
    slotVal.position ||
    slotVal.Position ||
    slotVal.pos ||
    slotVal.rolePosition ||
    ""
  );
};

const getSlotDefaultRole = (slotVal) => {
  if (!slotVal) return "";
  return slotVal.role || slotVal.Role || slotVal.defaultRole || "";
};

// ---------- Add Players Modal ----------
const AddPlayerModal = ({ onAdd, onCancel, existingIds, clubName }) => {
  const [agencyPlayers, setAgencyPlayers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: "overall", direction: "descending" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const owned = await api.fetchOwnedPlayers();
        // exclude already in roster
        const available = (owned || []).filter(p => !existingIds.includes(p.id));
        if (mounted) setAgencyPlayers(available);
      } catch (e) {
        if (mounted) setErr(e?.message || "Failed to load players");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [existingIds]);

  const requestSort = (key) => {
    setSortConfig(prev => {
      const direction = prev.key === key && prev.direction === "ascending" ? "descending" : "ascending";
      return { key, direction };
    });
  };

  const sortedAgencyPlayers = useMemo(() => {
    const arr = [...agencyPlayers];
    const { key, direction } = sortConfig;
    arr.sort((a, b) => {
      const av = a?.[key];
      const bv = b?.[key];
      if (typeof av === "number" && typeof bv === "number") {
        return direction === "ascending" ? av - bv : bv - av;
      }
      const as = String(av ?? "").toLowerCase();
      const bs = String(bv ?? "").toLowerCase();
      if (as < bs) return direction === "ascending" ? -1 : 1;
      if (as > bs) return direction === "ascending" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [agencyPlayers, sortConfig]);

  const visiblePlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedAgencyPlayers;
    return sortedAgencyPlayers.filter(p =>
      (`${p.firstName} ${p.lastName}`).toLowerCase().includes(q)
      || (p.positions || []).join(",").toLowerCase().includes(q)
    );
  }, [sortedAgencyPlayers, search]);

  const toggle = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onConfirm = async () => {
    await onAdd(Array.from(selectedIds));
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <header className="modal-header">
          <h3>Add players to {clubName}</h3>
          <button onClick={onCancel} className="icon-btn" aria-label="Close">✕</button>
        </header>

        <div className="modal-body">
          <div className="modal-toolbar">
            <input
              placeholder="Search players…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 240 }}
            />
            <div style={{ marginLeft: "auto" }}>
              <button onClick={() => setSelectedIds(new Set(visiblePlayers.map(p => p.id)))}>Select all</button>
              <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: 8 }}>Clear</button>
            </div>
          </div>

          {loading ? (
            <div className="skeleton-table" />
          ) : err ? (
            <div className="error">{err}</div>
          ) : (
            <table className="table-compact table-sticky">
              <thead>
                <tr>
                  <th></th>
                  <th onClick={() => requestSort("lastName")} style={{ cursor: "pointer" }}>Name</th>
                  <th onClick={() => requestSort("overall")} style={{ cursor: "pointer" }}>Ovr</th>
                  <th>Pos</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlayers.map(p => {
                  const name = `${p.firstName} ${p.lastName}`;
                  const checked = selectedIds.has(p.id);
                  return (
                    <tr key={p.id} onClick={() => toggle(p.id)} style={{ cursor: "pointer" }}>
                      <td><input type="checkbox" checked={checked} onChange={() => toggle(p.id)} /></td>
                      <td>{name}</td>
                      <td>{p.overall ?? ""}</td>
                      <td>{(p.positions || []).join(", ")}</td>
                      <td>{p.assigned_club || "Unassigned"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <footer className="modal-footer">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm} disabled={selectedIds.size === 0}>Add {selectedIds.size || ""}</button>
        </footer>
      </div>
    </div>
  );
};

// ---------- Main Club View ----------
export default function ClubView() {
  const params = useParams();
  const clubName = decodeURIComponent(params.club_name || params.name || params.clubName || "");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [clubTier, setClubTier] = useState("Iron");
  const [allTiers, setAllTiers] = useState([]);

  const [ownedPlayers, setOwnedPlayers] = useState([]);
  const [rosterIds, setRosterIds] = useState([]);
  const rosterPlayers = useMemo(
    () => ownedPlayers.filter(p => rosterIds.includes(p.id)),
    [ownedPlayers, rosterIds]
  );

  const [roles, setRoles] = useState([]); // from /roles
  const rolesByPosition = useMemo(() => {
    const map = {};
    for (const r of roles || []) {
      const pos = canonPos(r.Position);
      const name = r.Role || r.RoleType || "";
      if (!pos || !name) continue;
      if (!map[pos]) map[pos] = [];
      map[pos].push(name);
    }
    Object.keys(map).forEach(k => map[k].sort());
    return map;
  }, [roles]);

  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [slotMeta, setSlotMeta] = useState({});   // slot -> position
  const [roleMap, setRoleMap] = useState({});     // slot -> role

  const [activeTab, setActiveTab] = useState("roster");
  const [nameFilter, setNameFilter] = useState("");
  const [posFilter, setPosFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [simLoading, setSimLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState([]);

  // derived filtered roster
  const filteredRoster = useMemo(() => {
    const nameQ = nameFilter.trim().toLowerCase();
    return rosterPlayers.filter(p => {
      const nameOK = (`${p.firstName} ${p.lastName}`).toLowerCase().includes(nameQ);
      const posOK = !posFilter || (p.positions || []).includes(posFilter);
      return nameOK && posOK;
    });
  }, [rosterPlayers, nameFilter, posFilter]);

  // load initial data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        const [club, tiersPayload, owned, rolesPayload, formationsPayload] = await Promise.all([
          api.fetchClubByName(clubName),
          api.fetchTiers(),
          api.fetchOwnedPlayers(),
          api.fetchRoles(),
          api.fetchFormations(),
        ]);

        if (!club) throw new Error("Club not found");

        const tierList = normaliseTierList(tiersPayload);
        const clubTierInit = tierList.includes(club.tier) ? club.tier : (tierList[0] || "Iron");
        if (mounted) {
          setAllTiers(tierList);
          setClubTier(clubTierInit);
          setOwnedPlayers(owned || []);
          setRosterIds(Array.isArray(club.roster) ? club.roster.map(Number) : []);
          setRoles(Array.isArray(rolesPayload) ? rolesPayload : []);
          setFormations(normaliseFormationsList(formationsPayload));
        }
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load club data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [clubName]);

  // when formation changes, fetch its map and seed roleMap and slotMeta
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedFormation) {
        setRoleMap({});
        setSlotMeta({});
        return;
      }
      try {
        const fm = await api.fetchFormationMap(selectedFormation);
        // fm is an object: slot -> { position, role? }
        const meta = {};
        const initialRoleMap = {};
        Object.entries(fm || {}).forEach(([slot, val]) => {
          const pos = canonPos(getSlotPosition(val));
          meta[slot] = pos;
          const defaultRole = getSlotDefaultRole(val);
          const fallback = (rolesByPosition[pos] && rolesByPosition[pos][0]) || "";
          initialRoleMap[slot] = defaultRole || fallback || "";
        });
        if (mounted) {
          setSlotMeta(meta);
          setRoleMap(initialRoleMap);
        }
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load formation map");
      }
    })();
  }, [selectedFormation, rolesByPosition]);

  // ----- handlers -----
  const handleRemovePlayer = async (playerId) => {
    try {
      await api.updatePlayerAssignment({
        player_id: playerId,
        old_club_name: clubName,
        new_club_name: "Unassigned",
      });
      setRosterIds(prev => prev.filter(id => id !== playerId));
    } catch (e) {
      setError(e?.message || "Failed to remove player");
    }
  };

  const handleAddPlayers = async (playerIds) => {
    try {
      await Promise.all(playerIds.map(pid => {
        const player = ownedPlayers.find(p => p.id === pid);
        const oldClub = player?.assigned_club || "Unassigned";
        return api.updatePlayerAssignment({
          player_id: pid,
          old_club_name: oldClub,
          new_club_name: clubName,
        });
      }));
      setRosterIds(prev => Array.from(new Set(prev.concat(playerIds))));
      setIsModalOpen(false);
    } catch (e) {
      setError(e?.message || "Failed to add players");
    }
  };

  const handleRoleChange = (slot, value) => {
    setRoleMap(prev => ({ ...prev, [slot]: value }));
  };

  const handleRunSimulation = async () => {
    try {
      setSimLoading(true);
      setSimulationResult([]);
      const payload = {
        player_ids: rosterIds,
        role_map: roleMap,
        tier: clubTier,
      };
      const res = await api.runSimulation(payload);
      setSimulationResult(res?.squad || []);
    } catch (e) {
      setError(e?.message || "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  };

  // ----- render -----
  if (loading) {
    return (
      <div className="page">
        <h1>{clubName}</h1>
        <div className="skeleton-table" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="page">
        <h1>{clubName}</h1>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{clubName}</h1>

      <div className="tabs">
        <button className={activeTab === "roster" ? "active" : ""} onClick={() => setActiveTab("roster")}>Roster</button>
        <button className={activeTab === "tactics" ? "active" : ""} onClick={() => setActiveTab("tactics")}>Tactics</button>
      </div>

      <div className="sticky-toolbar">
        <div className="toolbar-left" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {activeTab === "roster" && (
            <>
              <input
                placeholder="Search name…"
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                style={{ maxWidth: 220 }}
              />
              <select value={posFilter} onChange={e => setPosFilter(e.target.value)}>
                <option value="">All positions</option>
                {Object.keys(rolesByPosition).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </>
          )}

          {activeTab === "tactics" && (
            <>
              <label>Formation:{" "}
                <select value={selectedFormation} onChange={e => setSelectedFormation(e.target.value)}>
                  <option value="">Select…</option>
                  {formations.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>

              <label style={{ marginLeft: 8 }}>Tier:{" "}
                <select value={clubTier} onChange={e => setClubTier(e.target.value)}>
                  {allTiers.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </>
          )}
        </div>

        <div className="toolbar-right" style={{ display: "flex", gap: 8 }}>
          {activeTab === "roster" && (
            <button onClick={() => setIsModalOpen(true)}>Add players</button>
          )}
          {activeTab === "tactics" && (
            <button onClick={handleRunSimulation} disabled={!selectedFormation || rosterIds.length === 0 || simLoading}>
              {simLoading ? "Running…" : "Run simulation"}
            </button>
          )}
        </div>
      </div>

      <div className="two-col">
        {activeTab === "roster" && (
          <section className="col">
            <h2>Roster ({filteredRoster.length} / 25)</h2>
            {filteredRoster.length === 0 ? (
              <p>No players in this view.</p>
            ) : (
              <table className="table-compact table-sticky">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Ovr</th>
                    <th>Pos</th>
                    <th>Best tier</th>
                    <th>Best role</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map(p => (
                    <tr key={p.id}>
                      <td>{p.firstName} {p.lastName}</td>
                      <td>{p.age ?? ""}</td>
                      <td>{p.overall ?? ""}</td>
                      <td>{(p.positions || []).join(", ")}</td>
                      <td>{p.bestTier || ""}</td>
                      <td>{p.bestRole || ""}</td>
                      <td>
                        <button className="icon-btn" title="Remove" onClick={() => handleRemovePlayer(p.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === "tactics" && (
          <section className="col">
            <h2>Tactics simulator</h2>

            {!selectedFormation ? (
              <p>Select a formation to configure roles.</p>
            ) : (
              <>
                <details open className="accordion">
                  <summary>Edit roles</summary>
                  <table className="table-compact">
                    <thead><tr><th>Slot</th><th>Position</th><th>Role</th></tr></thead>
                    <tbody>
                      {Object.entries(slotMeta).map(([slot, pos]) => {
                        const options = rolesByPosition[pos] || [];
                        return (
                          <tr key={slot}>
                            <td>{slot}</td>
                            <td>{pos || "—"}</td>
                            <td>
                              <select value={roleMap[slot] || ""} onChange={e => handleRoleChange(slot, e.target.value)}>
                                {options.length === 0 && <option value="">No roles</option>}
                                {options.map(rn => <option key={rn} value={rn}>{rn}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </details>

                <div style={{ marginTop: 12 }}>
                  <h3>Simulation result</h3>
                  {simulationResult.length === 0 ? (
                    <p>{simLoading ? "Calculating…" : "Run a simulation to see suggested lineup."}</p>
                  ) : (
                    <table className="table-compact table-sticky">
                      <thead><tr><th>Slot</th><th>Role</th><th>Player</th><th>Fit</th><th>Label</th></tr></thead>
                      <tbody>
                        {simulationResult.map(row => (
                          <tr key={`${row.slot}-${row.player_id || "none"}`}>
                            <td>{row.slot}</td>
                            <td>{row.assigned_role}</td>
                            <td>{row.player_name || "—"}</td>
                            <td>{row.fit_score ?? ""}</td>
                            <td>{row.fit_label ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {isModalOpen && (
        <AddPlayerModal
          onAdd={handleAddPlayers}
          onCancel={() => setIsModalOpen(false)}
          existingIds={rosterIds}
          clubName={clubName}
        />
      )}
    </div>
  );
}
