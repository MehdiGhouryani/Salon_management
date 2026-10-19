/**
 * Environment & Security Controls
 * 
 * IMPORTANT SECURITY GOVERNANCE:
 * Client-side flags are strictly UI presentation controls.
 * They MUST NEVER be treated as server-side authorization or security guarantees.
 */

// Check if running in demo/development simulation mode
export const getIsDemoMode = (): boolean => {
  // Check if user manually toggled production simulation mode in session storage for testing
  if (typeof window !== 'undefined') {
    const override = sessionStorage.getItem('nobatara_simulate_prod');
    if (override === 'true') return false;
    if (override === 'false') return true;
  }

  // By default, if VITE_DEMO_MODE is explicitly 'false' or VITE_APP_MODE is 'production', treat as production
  if (import.meta.env.VITE_DEMO_MODE === 'false' || import.meta.env.VITE_APP_MODE === 'production') {
    return false;
  }

  // Otherwise default to demo preview in development environments
  return true;
};

export const setSimulateProductionMode = (simulateProd: boolean): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('nobatara_simulate_prod', simulateProd ? 'true' : 'false');
    window.location.reload();
  }
};
