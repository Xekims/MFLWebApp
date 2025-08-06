// file: frontend/src/api.js

const API_URL = "http://localhost:8000";

// --- Core Fetch Functions ---

export async function fetchFormations() {
  const res = await fetch(`${API_URL}/formations`);
  if (!res.ok) throw new Error('Failed to fetch formations');
  return res.json();
}

export async function fetchFormationMap(formationName) {
  const res = await fetch(`${API_URL}/formation/${encodeURIComponent(formationName)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch formation map: ${res.status}`);
  }
  return res.json();
}

export async function fetchRoles() {
  const res = await fetch(`${API_URL}/roles`);
  if (!res.ok) throw new Error('Failed to fetch roles');
  return res.json();
}

export async function assignSquad(payload) {
  const res = await fetch(`${API_URL}/squad/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to assign squad');
  return res.json();
}

export async function searchMarketplace(payload) {
  const res = await fetch(`${API_URL}/market/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const detail = data.detail?.message || data.detail || 'An unknown error occurred.';
    throw new Error(detail);
  }
  return data;
}

export async function fetchPlayerAnalysis(playerId, tier) {
  const res = await fetch(`${API_URL}/player/${playerId}/analysis?tier=${tier}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch player analysis: ${res.status}`);
  }
  return res.json();
}

// --- Agency/Club Functions ---

export async function fetchOwnedPlayers() {
  const res = await fetch(`${API_URL}/players/owned`);
  if (!res.ok) throw new Error('Failed to fetch owned players');
  return res.json();
}

export async function fetchPlayersByIds(playerIds) {
  const res = await fetch(`${API_URL}/players/by_ids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_ids: playerIds }),
  });
  if (!res.ok) throw new Error('Failed to fetch players by IDs');
  return res.json();
}

export async function runSimulation(payload) {
  const res = await fetch(`${API_URL}/squads/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to run simulation');
  return res.json();
}

export async function fetchClubs() {
  const res = await fetch(`${API_URL}/clubs`);
  if (!res.ok) throw new Error('Failed to fetch clubs');
  return res.json();
}

export async function createClub(clubName) {
  const res = await fetch(`${API_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ club_name: clubName, roster: [] }),
  });
  if (!res.ok) throw new Error('Failed to create club');
  return res.json();
}

export async function updateClubRoster(clubName, roster) {
  const res = await fetch(`${API_URL}/clubs/${encodeURIComponent(clubName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roster),
  });
  if (!res.ok) throw new Error('Failed to update roster');
  return res.json();
}

export async function deleteClub(clubName) {
  const res = await fetch(`${API_URL}/clubs/${encodeURIComponent(clubName)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete club');
  return res;
}


// --- CRUD for Roles & Formations ---

export async function createRole(role) {
  const res = await fetch(`${API_URL}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(role),
  });
  if (!res.ok) throw new Error('Failed to create role');
  return res.json();
}

export async function updateRole(originalRoleName, role) {
  const res = await fetch(`${API_URL}/roles/${encodeURIComponent(originalRoleName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(role),
  });
  if (!res.ok) throw new Error('Failed to update role');
  return res.json();
}

export async function deleteRole(roleName) {
  const res = await fetch(`${API_URL}/roles/${encodeURIComponent(roleName)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete role');
  return res;
}

export async function fetchAttributes() {
  const res = await fetch(`${API_URL}/attributes`);
  return res.json();
}

export async function createFormation(formationName, roles) {
  const res = await fetch(`${API_URL}/formations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [formationName]: roles }),
  });
  if (!res.ok) throw new Error('Failed to create formation');
  return res.json();
}

export async function updateFormation(formationName, roles) {
  const res = await fetch(`${API_URL}/formations/${encodeURIComponent(formationName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roles),
  });
  if (!res.ok) throw new Error('Failed to update formation');
  return res.json();
}

export async function deleteFormation(formationName) {
  const res = await fetch(`${API_URL}/formations/${encodeURIComponent(formationName)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete formation');
  return res;
}