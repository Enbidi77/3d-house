const APP_NAME_KEY = '3d-house-app-name';
const DEV_MODE_KEY = '3d-house-dev-mode';
const COLLISION_WARNINGS_KEY = '3d-house-collision-warnings';

export function getStoredAppName(): string {
  if (typeof window === 'undefined') return 'ArchStudio 3D';
  return localStorage.getItem(APP_NAME_KEY) || 'ArchStudio 3D';
}

export function setStoredAppName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(APP_NAME_KEY, name.trim() || 'ArchStudio 3D');
  window.dispatchEvent(new Event('app-settings-changed'));
}

export function getStoredDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEV_MODE_KEY) === 'true';
}

export function setStoredDevMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_MODE_KEY, String(enabled));
  window.dispatchEvent(new Event('app-settings-changed'));
}

export function getStoredCollisionWarnings(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(COLLISION_WARNINGS_KEY);
  return raw === null ? true : raw === 'true';
}

export function setStoredCollisionWarnings(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COLLISION_WARNINGS_KEY, String(enabled));
  window.dispatchEvent(new Event('app-settings-changed'));
}
