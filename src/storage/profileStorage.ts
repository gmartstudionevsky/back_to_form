import { UserProfile } from '../types';

const PROFILE_STORAGE_KEY = 'btf-profiles';
const ACTIVE_PROFILE_KEY = 'btf-active-profile';

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures (private mode, quota, etc.)
  }
};

const safeRemoveItem = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage removal failures.
  }
};

export const loadProfiles = (): UserProfile[] => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UserProfile[];
  } catch {
    safeRemoveItem(PROFILE_STORAGE_KEY);
    return [];
  }
};

export const saveProfiles = (profiles: UserProfile[]) => {
  safeSetItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
};

export const getActiveProfileId = () => localStorage.getItem(ACTIVE_PROFILE_KEY) ?? '';

export const setActiveProfileId = (profileId?: string) => {
  if (!profileId) {
    safeRemoveItem(ACTIVE_PROFILE_KEY);
    return;
  }
  safeSetItem(ACTIVE_PROFILE_KEY, profileId);
};
