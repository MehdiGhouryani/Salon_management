/**
 * Environment & Security Governance
 * 
 * IMPORTANT SECURITY RULES:
 * 1. Runtime environment mode (demo vs production) is strictly server / build configured.
 * 2. It MUST NEVER be mutable by client-side browser controls (sessionStorage, localStorage, URL params, or UI toggles).
 * 3. In production builds (import.meta.env.PROD or VITE_APP_MODE === 'production'), safe production posture is ALWAYS enforced.
 * 4. Client-side flags are UI presentation hints ONLY and NEVER serve as authorization boundaries.
 */

export type AppMode = 'development' | 'production' | 'test';

export const getAppMode = (): AppMode => {
  if (import.meta.env.PROD || import.meta.env.VITE_APP_MODE === 'production') {
    return 'production';
  }
  if (import.meta.env.MODE === 'test' || import.meta.env.VITE_APP_MODE === 'test') {
    return 'test';
  }
  return 'development';
};

export const getIsDemoMode = (): boolean => {
  // Production posture: If built for production or VITE_APP_MODE is production, demo is strictly disabled
  if (
    import.meta.env.PROD ||
    import.meta.env.VITE_APP_MODE === 'production' ||
    import.meta.env.VITE_DEMO_MODE === 'false'
  ) {
    return false;
  }

  // Development posture: Permitted in development mode unless explicitly set to false
  return import.meta.env.DEV;
};
