type League = {
  id: number;
  name: string;
  inviteCode: string;
  maxMembers: number;
  status: string;
};

const leagues: League[] = []; // el "array-base de datos"
let nextId = 1; // contador para generar IDs únicos

export function getAllLeagues() {
  return leagues;
}

export function getLeagueById(id: number) {
  return leagues.find((league) => league.id === id);
}

export function createLeague(data: {
  name: string;
  inviteCode: string;
  maxMembers: number;
  status: string;
}) {
  const newLeague = { id: nextId++, ...data };
  leagues.push(newLeague);
  return newLeague;
}

export function updateLeague(
  id: number,
  data: Partial<{
    name: string;
    inviteCode: string;
    maxMembers: number;
    status: string;
  }>,
) {
  const league = getLeagueById(id);
  if (!league) {
    return null;
  } else {
    Object.assign(league, data);
    return league;
  }
}

export function deleteLeague(id: number) {
  const index = leagues.findIndex((league) => league.id === id);
  if (index === -1) {
    return false;
  } else {
    leagues.splice(index, 1);
    return true;
  }
}
