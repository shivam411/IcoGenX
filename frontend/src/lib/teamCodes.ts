const TEAM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TEAM_CODE_LENGTH = 6;

export function normalizeTeamJoinCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateTeamJoinCode(): string {
  const bytes = new Uint8Array(TEAM_CODE_LENGTH);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => TEAM_CODE_ALPHABET[byte % TEAM_CODE_ALPHABET.length]).join('');
}