import { create } from 'zustand';
import {
  ActivityLog,
  AppData,
  DayPlan,
  DrinkLog,
  FoodEntry,
  PhotoMeta,
  SmokingLog,
  WaterLog,
  TaskInstance,
  WaistLog,
  WeightLog,
  SleepLog,
  MovementDayLog,
  MovementSessionLog
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
  addTrainingLog: (log: ActivityLog) => void;
  updateTrainingLog: (log: ActivityLog) => void;
  deleteTrainingLog: (id: string) => void;
  addMovementSessionLog: (log: MovementSessionLog) => void;
  updateMovementSessionLog: (log: MovementSessionLog) => void;
  deleteMovementSessionLog: (id: string) => void;
  setMovementDayLog: (log: MovementDayLog) => void;
  addSmokingLog: (log: SmokingLog) => void;
  updateSmokingLog: (log: SmokingLog) => void;
  deleteSmokingLog: (id: string) => void;
  addDrinkLog: (log: DrinkLog) => void;
  updateDrinkLog: (log: DrinkLog) => void;
  deleteDrinkLog: (id: string) => void;
  addWaterLog: (log: WaterLog) => void;
  updateWaterLog: (log: WaterLog) => void;
  deleteWaterLog: (id: string) => void;
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
  addTrainingLog: log => {
    get().updateData(data => {
      data.logs.training.push({ ...log, id: createId() });
      return { ...data };
    });
  },
  updateTrainingLog: log => {
    get().updateData(data => {
      data.logs.training = data.logs.training.map(item => (item.id === log.id ? log : item));
      return { ...data };
    });
  },
  deleteTrainingLog: id => {
    get().updateData(data => {
      data.logs.training = data.logs.training.filter(item => item.id !== id);
      return { ...data };
    });
  },
  addMovementSessionLog: log => {
    get().updateData(data => {
      data.logs.movementSessions.push({ ...log, id: createId() });
      return { ...data };
    });
  },
  updateMovementSessionLog: log => {
    get().updateData(data => {
      data.logs.movementSessions = data.logs.movementSessions.map(item =>
        item.id === log.id ? log : item
      );
      return { ...data };
    });
  },
  deleteMovementSessionLog: id => {
    get().updateData(data => {
      data.logs.movementSessions = data.logs.movementSessions.filter(item => item.id !== id);
      return { ...data };
    });
  },
  setMovementDayLog: log => {
    get().updateData(data => {
      const existing = data.logs.movementDays.find(item => item.date === log.date);
      if (existing) {
        existing.steps = log.steps;
      } else {
        data.logs.movementDays.push(log);
      }
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
  addDrinkLog: log => {
    get().updateData(data => {
      data.logs.drinks.push({ ...log, id: createId() });
      return { ...data };
    });
  },
  updateDrinkLog: log => {
    get().updateData(data => {
      data.logs.drinks = data.logs.drinks.map(item => (item.id === log.id ? log : item));
      return { ...data };
    });
  },
  deleteDrinkLog: id => {
    get().updateData(data => {
      data.logs.drinks = data.logs.drinks.filter(item => item.id !== id);
      return { ...data };
    });
  },
  addWaterLog: log => {
    get().updateData(data => {
      data.logs.water.push({ ...log, id: createId() });
      return { ...data };
    });
  },
  updateWaterLog: log => {
    get().updateData(data => {
      data.logs.water = data.logs.water.map(item => (item.id === log.id ? log : item));
      return { ...data };
    });
  },
  deleteWaterLog: id => {
    get().updateData(data => {
      data.logs.water = data.logs.water.filter(item => item.id !== id);
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
        mealComponents: { breakfast: [], lunch: [], dinner: [], snack: [] },
        mealTimes: { breakfast: '', lunch: '', dinner: '', snack: '' },
        workoutsPlan: [],
        plannedSteps: undefined,
        activityTargets: {},
        nutritionTargets: { meals: 3 },
        requirements: {
          requireWeight: false,
          requireWaist: false,
          requirePhotos: [],
          sleepWakeTarget: '07:30',
          sleepDurationTargetMinutes: 450
        }
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
        existing.mealComponents ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
        existing.mealTimes ??= { breakfast: '', lunch: '', dinner: '', snack: '' };
        existing.workoutsPlan ??= [];
        existing.plannedSteps ??= undefined;
        existing.activityTargets ??= {};
        existing.nutritionTargets ??= { meals: 3 };
        existing.requirements ??= {
          requireWeight: false,
          requireWaist: false,
          requirePhotos: [],
          sleepWakeTarget: '07:30',
          sleepDurationTargetMinutes: 450
        };
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
