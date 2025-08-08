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

export async function fetchPlayerById(playerId) {
  const res = await fetch(`${API_URL}/player/${playerId}/analysis`);
  if (!res.ok) {
    throw new Error(`Failed to fetch player data: ${res.status}`);
  }
  return res.json();
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

export async function createClub(clubName, tier) {
  const res = await fetch(`${API_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ club_name: clubName, tier: tier, roster: [] }),
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

// In your api.js file
export async function fetchClubByName(clubName) {
    // Use the existing API_URL constant defined at the top of this file.
    const response = await fetch(`${API_URL}/clubs/${encodeURIComponent(clubName)}`);
    if (!response.ok) {
        // Return null for 404 so the component can handle it gracefully
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch club ${clubName}`);
    }
    return response.json();
}

// Add this function to your d:\MFL\WebApp\frontend\src\api.js file

export async function deleteClub(clubName) {
  const response = await fetch(`${API_URL}/clubs/${encodeURIComponent(clubName)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    // Try to get a more specific error message from the backend
    const errorData = await response.json().catch(() => ({ detail: 'Failed to delete club.' }));
    throw new Error(errorData.detail);
  }
  // The backend returns a success message which we can return or ignore
  return response.json();
}
// This function should be added to your api.js file
export async function updatePlayerAssignment(assignmentData) {
  const response = await fetch(`${API_URL}/players/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignmentData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || 'Failed to assign player');
  }
  return await response.json();
}
