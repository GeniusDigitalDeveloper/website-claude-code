export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'DEVICE_MANAGER' | 'VIEWER';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'LOCKED' | 'ENROLLMENT_PENDING' | 'ERROR';
export type CommandStatus = 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'EXECUTED' | 'FAILED' | 'EXPIRED';

export interface Device {
  id: string; deviceId: string; deviceName: string; deviceType: 'ANDROID' | 'WINDOWS';
  deviceModel: string; osVersion: string; status: DeviceStatus; isLocked?: boolean;
  enrollmentStatus: string; assignedUserId: string | null; groupId: string | null;
  batteryLevel: number | null; lastSeen?: { toMillis(): number } | null; createdAt?: { toMillis(): number } | null;
}
export interface Group { id: string; name: string; description?: string }
export interface Command {
  id: string; commandId: string; deviceId: string; commandType: string; status: CommandStatus;
  createdBy: string; createdAt?: { toMillis(): number } | null; executedAt?: { toMillis(): number } | null;
  errorMessage: string | null;
}
export interface LogEntry {
  id: string; type: string; message: string; actorId: string | null; deviceId: string | null;
  createdAt?: { toMillis(): number } | null;
}
export interface OrgUser { id: string; uid: string; email: string | null; displayName: string | null; role: Role; provider: string | null }

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin', ORG_ADMIN: 'Org Admin', DEVICE_MANAGER: 'Device Manager', VIEWER: 'Viewer',
};
export const ROLE_RANK: Record<Role, number> = { SUPER_ADMIN: 4, ORG_ADMIN: 3, DEVICE_MANAGER: 2, VIEWER: 1 };
