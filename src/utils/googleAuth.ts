import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/presentations',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// In-memory cache for access token (MANDATORY per security guidelines)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token might have expired or reloaded in memory; sign-in pop up can refresh it
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export interface GoogleSignInResult {
  user: User;
  accessToken: string;
}

export interface GoogleAuthErrorInfo {
  code: string;
  message: string;
  domain: string;
  isUnauthorizedDomain: boolean;
}

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<GoogleSignInResult | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('未取得 Google 存取金鑰 (Access Token)');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const code = error?.code || '';
    const domain = typeof window !== 'undefined' ? window.location.hostname : '';
    const isUnauthorizedDomain = 
      code === 'auth/unauthorized-domain' || 
      error?.message?.includes('unauthorized-domain') ||
      error?.message?.includes('authorized domain');

    console.error('Google Sign in error:', error);

    const err = new Error(
      isUnauthorizedDomain
        ? `未授權網域 (auth/unauthorized-domain)：您的 Vercel 部署網址「${domain}」尚未加入 Firebase 控制台的 Authorized Domains 清單中。`
        : (error?.message || 'Google 帳號連線失敗')
    ) as any;
    err.code = code;
    err.domain = domain;
    err.isUnauthorizedDomain = isUnauthorizedDomain;
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
};
