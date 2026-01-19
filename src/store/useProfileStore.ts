import { create } from 'zustand';
import { UserProfile } from '../types';
import {
  getActiveProfileId,
  loadProfiles,
  saveProfiles,
  setActiveProfileId
} from '../storage/profileStorage';

const createId = () => crypto.randomUUID();

type RegisterPayload = {
  login: string;
  password: string;
  name?: string;
};

type ProfileState = {
  profiles: UserProfile[];
  activeProfileId: string;
  registerProfile: (payload: RegisterPayload) => { ok: boolean; error?: string };
  login: (login: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  replaceProfile: (profile: UserProfile) => void;
};

const buildEmptyProfile = (payload: RegisterPayload): UserProfile => {
  const now = new Date().toISOString();
  return {
    id: createId(),
    login: payload.login,
    password: payload.password,
    name: payload.name?.trim() || undefined,
    metrics: {},
    readinessLevel: 'beginner',
    currentState: {},
    goals: {
      longTerm: [],
      shortTerm: []
    },
    access: {
      activity: [],
      homeEquipment: [],
      gymEquipment: [],
      customEquipment: []
    },
    setupCompleted: false,
    createdAt: now,
    updatedAt: now
  };
};

export const useProfileStore = create<ProfileState>(set => ({
  profiles: loadProfiles(),
  activeProfileId: getActiveProfileId(),
  registerProfile: payload => {
    const current = loadProfiles();
    if (current.some(profile => profile.login === payload.login)) {
      return { ok: false, error: 'Логин уже используется.' };
    }
    const profile = buildEmptyProfile(payload);
    const updated = [...current, profile];
    saveProfiles(updated);
    setActiveProfileId(profile.id);
    set({ profiles: updated, activeProfileId: profile.id });
    return { ok: true };
  },
  login: (login, password) => {
    const current = loadProfiles();
    const match = current.find(profile => profile.login === login && profile.password === password);
    if (!match) {
      return { ok: false, error: 'Неверный логин или пароль.' };
    }
    setActiveProfileId(match.id);
    set({ profiles: current, activeProfileId: match.id });
    return { ok: true };
  },
  logout: () => {
    setActiveProfileId(undefined);
    set({ activeProfileId: '' });
  },
  replaceProfile: profile => {
    const current = loadProfiles();
    const updated = current.map(item => (item.id === profile.id ? profile : item));
    saveProfiles(updated);
    set({ profiles: updated });
  }
}));
