'use client';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const call = <I, O>(name: string) => (data: I) => httpsCallable<I, O>(functions, name)(data).then((r) => r.data);

export const api = {
  bootstrapOrganization: call<{ name: string }, { orgId: string }>('bootstrapOrganization'),
  assignUser: call<{ email?: string; uid?: string; role: string }, { uid: string }>('assignUser'),
  removeUser: call<{ uid: string }, { ok: boolean }>('removeUser'),
  createEnrollment: call<
    { deviceType: 'ANDROID' | 'WINDOWS'; deviceName: string; groupId?: string },
    { enrollmentId: string; token: string; qrPayload: string }
  >('createEnrollment'),
  removeDevice: call<{ deviceId: string }, { ok: boolean }>('removeDevice'),
  createCommand: call<
    { commandType: string; deviceIds?: string[]; groupId?: string; all?: boolean },
    { count: number }
  >('createCommand'),
};

export function errMsg(e: unknown): string {
  const m = (e as { message?: string })?.message ?? 'Ralat tidak diketahui';
  return m.replace(/^.*?:\s*/, '');
}
