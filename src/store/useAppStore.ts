import { create } from 'zustand';
import { AppData, DayPlan, FoodEntry, PhotoMeta } from '../types';
import { loadData, saveData } from '../storage/localStore';

const createId = () => crypto.randomUUID();

type AppState = {
  data: AppData;
  setData: (data: AppData) => void;
  updateData: (updater: (data: AppData) => AppData) => void;
  addFoodEntry: (date: string, entry: FoodEntry) => void;
  addActivityMinutes: (minutes: number, type: 'stairs' | 'march' | 'workout') => void;
  addSmoking: (count: number, trigger: string) => void;
  addWeight: (weightKg: number) => void;
  addDayPlan: (plan: DayPlan) => void;
  addPhotoMeta: (meta: PhotoMeta) => void;
  removePhotoMeta: (id: string) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  data: loadData(),
  setData: data => {
    saveData(data);
    set({ data });
  },
  updateData: updater => {
    const updated = updater(get().data);
    saveData(updated);
    set({ data: updated });
  },
  addFoodEntry: (date, entry) => {
    get().updateData(data => {
      const existing = data.logs.foodDays.find(day => day.date === date);
      if (existing) {
        existing.entries.push({ ...entry, id: createId() });
      } else {
        data.logs.foodDays.push({ date, entries: [{ ...entry, id: createId() }] });
      }
      return { ...data };
    });
  },
  addActivityMinutes: (minutes, type) => {
    get().updateData(data => {
      data.logs.activity.push({
        id: createId(),
        dateTime: new Date().toISOString(),
        type,
        minutes,
        blocks: Math.max(1, Math.round(minutes / 10))
      });
      return { ...data };
    });
  },
  addSmoking: (count, trigger) => {
    get().updateData(data => {
      data.logs.smoking.push({
        id: createId(),
        dateTime: new Date().toISOString(),
        count,
        trigger,
        stressLevel1to5: 3,
        ruleApplied: false
      });
      return { ...data };
    });
  },
  addWeight: weightKg => {
    get().updateData(data => {
      data.logs.weight.push({ id: createId(), dateTime: new Date().toISOString(), weightKg });
      return { ...data };
    });
  },
  addDayPlan: plan => {
    get().updateData(data => {
      data.planner.dayPlans.push(plan);
      return { ...data };
    });
  },
  addPhotoMeta: meta => {
    get().updateData(data => {
      data.logs.photos.push(meta);
      return { ...data };
    });
  },
  removePhotoMeta: id => {
    get().updateData(data => {
      data.logs.photos = data.logs.photos.filter(photo => photo.id !== id);
      return { ...data };
    });
  }
}));
