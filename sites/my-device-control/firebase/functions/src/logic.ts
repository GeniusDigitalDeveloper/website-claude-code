// Logik tulen (tanpa Firebase) supaya boleh diuji unit.

export const ROLES = ['SUPER_ADMIN', 'ORG_ADMIN', 'DEVICE_MANAGER', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const COMMAND_TYPES = ['LOCK', 'UNLOCK', 'REBOOT', 'SYNC_POLICY'] as const;
export type CommandType = (typeof COMMAND_TYPES)[number];

export type CommandStatus =
  | 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'EXECUTED' | 'FAILED' | 'EXPIRED';

const NEXT: Record<CommandStatus, CommandStatus[]> = {
  PENDING: ['SENT', 'EXPIRED'],
  SENT: ['ACKNOWLEDGED', 'EXECUTED', 'FAILED', 'EXPIRED'],
  ACKNOWLEDGED: ['EXECUTED', 'FAILED'],
  EXECUTED: [],
  FAILED: [],
  EXPIRED: [],
};

export function canTransition(from: CommandStatus, to: CommandStatus): boolean {
  return NEXT[from]?.includes(to) ?? false;
}

export function roleRank(role: string | undefined): number {
  switch (role) {
    case 'SUPER_ADMIN': return 4;
    case 'ORG_ADMIN': return 3;
    case 'DEVICE_MANAGER': return 2;
    case 'VIEWER': return 1;
    default: return 0;
  }
}

export function hasAtLeast(role: string | undefined, min: Role): boolean {
  return roleRank(role) >= roleRank(min);
}

export function isCommandType(v: unknown): v is CommandType {
  return typeof v === 'string' && (COMMAND_TYPES as readonly string[]).includes(v);
}

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v);
}

export function isExpired(expiresAtMs: number, nowMs: number): boolean {
  return expiresAtMs <= nowMs;
}

/** Peranti dianggap OFFLINE jika tiada heartbeat dalam tempoh `timeoutMs`. */
export function isStale(lastSeenMs: number | null, nowMs: number, timeoutMs: number): boolean {
  return lastSeenMs === null || nowMs - lastSeenMs > timeoutMs;
}

export function validDeviceName(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 80;
}

export const COMMAND_TTL_MS = 24 * 60 * 60 * 1000;
export const ENROLLMENT_TTL_MS = 24 * 60 * 60 * 1000;
export const OFFLINE_AFTER_MS = 10 * 60 * 1000;
