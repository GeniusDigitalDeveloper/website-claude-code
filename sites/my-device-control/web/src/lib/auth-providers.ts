import { GoogleAuthProvider, OAuthProvider, type AuthProvider } from 'firebase/auth';

/**
 * Senarai kaedah log masuk SOKONGAN UI. Untuk tambah penyedia lain (Microsoft, GitHub, SAML...):
 *  1) Aktifkan di Firebase Console > Authentication > Sign-in method
 *  2) Tambah satu entri di sini.
 * Tiada perubahan lain: peranan diberikan melalui Custom Claims (function `assignUser`),
 * jadi Security Rules & backend berfungsi untuk semua penyedia.
 */
export interface LoginProvider { id: string; label: string; create: () => AuthProvider }

export const LOGIN_PROVIDERS: LoginProvider[] = [
  { id: 'google.com', label: 'Log masuk dengan Google', create: () => new GoogleAuthProvider() },
  // { id: 'microsoft.com', label: 'Log masuk dengan Microsoft', create: () => new OAuthProvider('microsoft.com') },
];
void OAuthProvider;
