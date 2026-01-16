import { create } from 'zustand';
import {
  ActivityLog,
  AppData,
  DayPlan,
  FoodEntry,
  PhotoMeta,
  SmokingLog,
  TaskInstance,
  WaistLog,
  WeightLog,
  SleepLog
} from '../types';
import { loadData, saveData } from '../storage/localStore';

const createId = () => crypto.randomUUID();

type AppState = {
  data: AppData;
  setData: (data: AppData) => void;
  updateData: (updater: (data: AppData) => AppData) => void;
  addFoodEntry: (date: string, entry: FoodEntry) => void;
  updateFoodEntry: (date: string, entry: FoodEntry) => void;
  deleteFoodEntry: (date: string, entryId: string) => void;
  addActivityLog: (log: ActivityLog) => void;
  updateActivityLog: (log: ActivityLog) => void;
  deleteActivityLog: (id: string) => void;
  addSmokingLog: (log: SmokingLog) => void;
  updateSmokingLog: (log: SmokingLog) => void;
  deleteSmokingLog: (id: string) => void;
  addWeightLog: (log: WeightLog) => void;
  updateWeightLog: (log: WeightLog) => void;
  deleteWeightLog: (id: string) => void;
  addWaistLog: (log: WaistLog) => void;
  updateWaistLog: (log: WaistLog) => void;
  deleteWaistLog: (id: string) => void;
  addSleepLog: (log: SleepLog) => void;
  updateSleepLog: (log: SleepLog) => void;
  deleteSleepLog: (id: string) => void;
  createOrGetDayPlan: (date: string, periodId?: string) => DayPlan;
  setTaskStatus: (date: string, taskId: string, status: TaskInstance['status']) => void;
  updateTaskActual: (date: string, taskId: string, actual?: Record<string, number | string>) => void;
  updateTaskRefsTarget: (
    date: string,
    taskId: string,
    payload: Pick<TaskInstance, 'assignedRefs' | 'target' | 'notes' | 'timeOfDay'>
  ) => void;
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
  updateFoodEntry: (date, entry) => {
    get().updateData(data => {
      const existing = data.logs.foodDays.find(day => day.date === date);
      if (!existing) return { ...data };
      existing.entries = existing.entries.map(item => (item.id === entry.id ? entry : item));
      return { ...data };
    });
  },
  deleteFoodEntry: (date, entryId) => {
    get().updateData(data => {
      const existing = data.logs.foodDays.find(day => day.date === date);
      if (!existing) return { ...data };
      existing.entries = existing.entries.filter(entry => entry.id !== entryId);
      return { ...data };
    });
  },
  addActivityLog: log => {
    get().updateData(data => {
      data.logs.activity.push({ ...log, id: createId() });
      return { ...data };
    });
  },
  updateActivityLog: log => {
    get().updateData(data => {
      data.logs.activity = data.logs.activity.map(item => (item.id === log.id ? log : item));
      return { ...data };
    });
  },
  deleteActivityLog: id => {
    get().updateData(data => {
      data.logs.activity = data.logs.activity.filter(item => item.id !== id);
      return { ...data };
    });
  },
  addSmokingLog: log => {
    get().updateData(data => {
      data.logs.smoking.push({ ...log, id: createId() });
      return { ...data };
    });
  },
  updateSmokingLog: log => {
    get().updateData(data => {
      data.logs.smoking = data.logs.smoking.map(item => (item.id === log.id ? log : item));
      return { ...data };
    });
  },
  deleteSmokingLog: id => {
    get().updateData(data => {
      data.logs.smoking = data.logs.smoking.filter(item => item.id !== id);
      return { ...data };
    });
  },
  addWeightLog: log => {
    get().updateData(data => {
      data.logs.weight.push({ ...log, id: createId() });
      return { ...data };
    });
  },
  updateWeightLog: log => {
    get().updateData(data => {
      data.logs.weight = data.logs.weight.map(item => (item.id === log.id ? log : item));
      return { ...data };
    });
  },
  deleteWeightLog: id => {
    get().updateData(data => {
      data.logs.weight = data.logs.weight.filter(item => item.id !== id);
      return { ...data };
    });
  },
  addWaistLog: log => {
    get().updateData(data => {
      data.logs.waist.push({ ...log, id: createId() });
      return { ...data };
    });
  },
  updateWaistLog: log => {
    get().updateData(data => {
      data.logs.waist = data.logs.waist.map(item => (item.id === log.id ? log : item));
      return { ...data };
    });
  },
  deleteWaistLog: id => {
    get().updateData(data => {
      data.logs.waist = data.logs.waist.filter(item => item.id !== id);
      return { ...data };
    });
  },
  addSleepLog: log => {
    get().updateData(data => {
      data.logs.sleep.push({ ...log, id: createId() });
      return { ...data };
    });
  },
  updateSleepLog: log => {
    get().updateData(data => {
      data.logs.sleep = data.logs.sleep.map(item => (item.id === log.id ? log : item));
      return { ...data };
    });
  },
  deleteSleepLog: id => {
    get().updateData(data => {
      data.logs.sleep = data.logs.sleep.filter(item => item.id !== id);
      return { ...data };
    });
  },
  createOrGetDayPlan: (date, periodId) => {
    let plan = get().data.planner.dayPlans.find(item => item.date === date);
    if (!plan) {
      plan = {
        id: createId(),
        date,
        periodId,
        tasks: [],
        mealsPlan: { breakfast: [], lunch: [], dinner: [], snack: [] },
        workoutsPlan: [],
        requirements: { requireWeight: false, requireWaist: false, requirePhotos: [] }
      };
      get().updateData(data => {
        data.planner.dayPlans.push(plan as DayPlan);
        return { ...data };
      });
    } else {
      get().updateData(data => {
        const existing = data.planner.dayPlans.find(item => item.date === date);
        if (!existing) return { ...data };
        existing.mealsPlan ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
        existing.workoutsPlan ??= [];
        existing.requirements ??= { requireWeight: false, requireWaist: false, requirePhotos: [] };
        existing.tasks ??= [];
        return { ...data };
      });
    }
    return plan;
  },
  setTaskStatus: (date, taskId, status) => {
    get().updateData(data => {
      const plan = data.planner.dayPlans.find(item => item.date === date);
      if (!plan) return { ...data };
      plan.tasks = (plan.tasks ?? []).map(task =>
        task.id === taskId ? { ...task, status } : task
      );
      return { ...data };
    });
  },
  updateTaskActual: (date, taskId, actual) => {
    get().updateData(data => {
      const plan = data.planner.dayPlans.find(item => item.date === date);
      if (!plan) return { ...data };
      plan.tasks = (plan.tasks ?? []).map(task =>
        task.id === taskId ? { ...task, actual } : task
      );
      return { ...data };
    });
  },
  updateTaskRefsTarget: (date, taskId, payload) => {
    get().updateData(data => {
      const plan = data.planner.dayPlans.find(item => item.date === date);
      if (!plan) return { ...data };
      plan.tasks = (plan.tasks ?? []).map(task =>
        task.id === taskId ? { ...task, ...payload } : task
      );
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
