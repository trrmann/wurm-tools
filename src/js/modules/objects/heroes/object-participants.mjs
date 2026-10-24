export function normalizeObjectParticipants(type, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source))
    throw new TypeError('Object participants must be an account selection');
  const participants = {};
  for (const field of ['gameMasterId', 'playerId']) {
    const value = source[field] ?? '';
    if (typeof value !== 'string' || value.length > 120 || value.trim() !== value)
      throw new TypeError('Select a registered GM or Player account');
    participants[field] = value;
  }
  if (type === 'player-character' && !participants.playerId)
    throw new RangeError('Select a Player account for this player character');
  if (type === 'non-player-character' && participants.playerId)
    throw new RangeError('Non-player characters cannot have a Player assignment');
  if (!['player-character', 'non-player-character'].includes(type) && !participants.gameMasterId)
    throw new RangeError('Select a Game Master account for this object');
  return participants;
}
