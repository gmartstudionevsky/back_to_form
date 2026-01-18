import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import {
  FoodEntry,
  MealPlanItem,
  NutritionTag,
  NutritionTargets,
  Period,
  WorkoutPlanItem
} from '../types';
import { calcMealPlanItem } from '../utils/nutrition';
import {
  getDefaultMealTime,
  getDefaultTimeForTimeOfDay,
  getTimeOfDayFromTime,
  timeOfDayLabels
} from '../utils/timeOfDay';

const tabs = ['Периоды', 'Рацион'] as const;

type Tab = (typeof tabs)[number];

type MealDraft = {
  meal: FoodEntry['meal'];
  kind: MealPlanItem['kind'];
  refId?: string;
  title: string;
  grams: number;
  servings: number;
  cheatCategory: MealPlanItem['cheatCategory'];
  nutritionTags: NutritionTag[];
  plannedKcal: string;
  plannedProtein: string;
  plannedFat: string;
  plannedCarb: string;
};

type WorkoutDraft = {
  timeOfDay: WorkoutPlanItem['timeOfDay'];
  kind: WorkoutPlanItem['kind'];
  protocolRef: string;
  plannedTime: string;
  plannedMinutes: number;
  isRequired: boolean;
  movementActivityRef: string;
};

const mealLabels: Record<FoodEntry['meal'], string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const nutritionTagLabels: Record<NutritionTag, string> = {
  snack: 'Перекус',
  cheat: 'Читмил',
  healthy: 'Правильное питание'
};

const PlanPage = () => {
  const { data, updateData, createOrGetDayPlan } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('Периоды');
  const [name, setName] = useState('Новый период');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [editorDate, setEditorDate] = useState<string | null>(null);
  const [mealSheet, setMealSheet] = useState<MealDraft | null>(null);
  const [workoutSheet, setWorkoutSheet] = useState<WorkoutDraft | null>(null);
  const [menuCopy, setMenuCopy] = useState({
    sourceDate: '',
    startDate: '',
    endDate: ''
  });
  const canAddPeriod = Boolean(startDate && endDate && startDate <= endDate);
  const canCopyMenu = Boolean(
    menuCopy.sourceDate && menuCopy.startDate && menuCopy.endDate && menuCopy.startDate <= menuCopy.endDate
  );

  const addPeriod = () => {
    if (!canAddPeriod) return;
    updateData(state => {
      const period: Period = {
        id: crypto.randomUUID(),
        name,
        startDate,
        endDate,
        goals: [],
        notes: ''
      };
      return { ...state, planner: { ...state.planner, periods: [...state.planner.periods, period] } };
    });
    setName('Новый период');
    setStartDate('');
    setEndDate('');
  };

  const dayList = useMemo(() => {
    if (!selectedPeriod) return [] as string[];
    const dates: string[] = [];
    const start = new Date(selectedPeriod.startDate);
    const end = new Date(selectedPeriod.endDate);
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().slice(0, 10));
    }
    return dates;
  }, [selectedPeriod]);

  const openDayEditor = (date: string) => {
    createOrGetDayPlan(date, selectedPeriod?.id);
    setEditorDate(date);
  };

  const dayPlan = editorDate
    ? data.planner.dayPlans.find(plan => plan.date === editorDate)
    : undefined;
  const mealTimes = dayPlan?.mealTimes ?? {
    breakfast: '',
    lunch: '',
    dinner: '',
    snack: ''
  };
  const nutritionTargets = dayPlan?.nutritionTargets ?? {};

  const plannedNutrition = (planDate: string) => {
    const plan = data.planner.dayPlans.find(item => item.date === planDate);
    if (!plan?.mealsPlan) return { kcal: 0, protein: 0, fat: 0, carb: 0 };
    return Object.values(plan.mealsPlan)
      .flat()
      .reduce(
        (sum, item) => {
          const nutrition = calcMealPlanItem(item, data.library);
          return {
            kcal: sum.kcal + nutrition.kcal,
            protein: sum.protein + nutrition.protein,
            fat: sum.fat + nutrition.fat,
            carb: sum.carb + nutrition.carb
          };
        },
        { kcal: 0, protein: 0, fat: 0, carb: 0 }
      );
  };

  const addMealToPlan = () => {
    if (!mealSheet || !editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      const resolveTags = () => {
        const tags = mealSheet.nutritionTags.length ? [...mealSheet.nutritionTags] : [];
        if (mealSheet.kind === 'product' && mealSheet.refId) {
          const product = state.library.products.find(item => item.id === mealSheet.refId);
          if (product?.nutritionTags?.length) {
            tags.push(...product.nutritionTags);
          }
        }
        if (mealSheet.kind === 'dish' && mealSheet.refId) {
          const recipe = state.library.recipes.find(item => item.id === mealSheet.refId);
          if (recipe?.nutritionTags?.length) {
            tags.push(...recipe.nutritionTags);
          }
        }
        if (mealSheet.kind === 'cheat') {
          tags.push('cheat');
        }
        if (mealSheet.meal === 'snack') {
          tags.push('snack');
        }
        return Array.from(new Set(tags));
      };
      const entry: MealPlanItem = {
        id: crypto.randomUUID(),
        kind: mealSheet.kind,
        refId:
          mealSheet.kind === 'product' || mealSheet.kind === 'dish' ? mealSheet.refId : undefined,
        plannedGrams: mealSheet.kind === 'product' ? mealSheet.grams : undefined,
        plannedServings: mealSheet.kind === 'dish' ? mealSheet.servings : undefined,
        title: mealSheet.kind === 'free' || mealSheet.kind === 'cheat' ? mealSheet.title : undefined,
        plannedKcal:
          mealSheet.kind === 'free' || mealSheet.kind === 'cheat'
            ? Number(mealSheet.plannedKcal) || undefined
            : undefined,
        plannedProtein:
          mealSheet.kind === 'free' || mealSheet.kind === 'cheat'
            ? Number(mealSheet.plannedProtein) || undefined
            : undefined,
        plannedFat:
          mealSheet.kind === 'free' || mealSheet.kind === 'cheat'
            ? Number(mealSheet.plannedFat) || undefined
            : undefined,
        plannedCarb:
          mealSheet.kind === 'free' || mealSheet.kind === 'cheat'
            ? Number(mealSheet.plannedCarb) || undefined
            : undefined,
        cheatCategory: mealSheet.kind === 'cheat' ? mealSheet.cheatCategory : undefined,
        nutritionTags: resolveTags()
      };
      plan.mealsPlan[mealSheet.meal].push(entry);
      return { ...state };
    });
    setMealSheet(null);
  };

  const defaultMovementActivityId = data.library.movementActivities[0]?.id ?? '';

  const addWorkoutToPlan = () => {
    if (!workoutSheet || !editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      const plannedTime = workoutSheet.plannedTime?.trim() || undefined;
      const timeOfDay = plannedTime
        ? getTimeOfDayFromTime(plannedTime)
        : workoutSheet.timeOfDay;
      plan.workoutsPlan.push({
        id: crypto.randomUUID(),
        timeOfDay,
        plannedTime,
        kind: workoutSheet.kind,
        protocolRef: workoutSheet.protocolRef || undefined,
        plannedMinutes: workoutSheet.kind === 'movement' ? workoutSheet.plannedMinutes : undefined,
        isRequired: workoutSheet.isRequired,
        movementActivityRef:
          workoutSheet.kind === 'movement' && workoutSheet.movementActivityRef
            ? workoutSheet.movementActivityRef
            : workoutSheet.kind === 'movement'
              ? defaultMovementActivityId
              : undefined
      });
      return { ...state };
    });
    setWorkoutSheet(null);
  };

  const updateMealTime = (meal: FoodEntry['meal'], time: string) => {
    if (!editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.mealTimes ??= { breakfast: '', lunch: '', dinner: '', snack: '' };
      plan.mealTimes[meal] = time;
      return { ...state };
    });
  };

  const updateNutritionTarget = (field: keyof NutritionTargets, value: number | undefined) => {
    if (!editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.nutritionTargets ??= {};
      plan.nutritionTargets[field] = value;
      return { ...state };
    });
  };

  const updateWorkoutTime = (id: string, time: string) => {
    if (!editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.workoutsPlan = plan.workoutsPlan.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          plannedTime: time || undefined,
          timeOfDay: time ? getTimeOfDayFromTime(time) : item.timeOfDay
        };
      });
      return { ...state };
    });
  };

  const updateWorkoutTimeOfDay = (id: string, timeOfDay: WorkoutPlanItem['timeOfDay']) => {
    if (!editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.workoutsPlan = plan.workoutsPlan.map(item =>
        item.id === id ? { ...item, timeOfDay } : item
      );
      return { ...state };
    });
  };

  const toggleMealSheetTag = (tag: NutritionTag) => {
    setMealSheet(prev => {
      if (!prev) return prev;
      const exists = prev.nutritionTags.includes(tag);
      return {
        ...prev,
        nutritionTags: exists
          ? prev.nutritionTags.filter(item => item !== tag)
          : [...prev.nutritionTags, tag]
      };
    });
  };

  const copyMenuRange = () => {
    if (!canCopyMenu) return;
    updateData(state => {
      const sourcePlan = state.planner.dayPlans.find(item => item.date === menuCopy.sourceDate);
      if (!sourcePlan) return { ...state };
      const start = new Date(menuCopy.startDate);
      const end = new Date(menuCopy.endDate);
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const iso = date.toISOString().slice(0, 10);
        let plan = state.planner.dayPlans.find(item => item.date === iso);
        if (!plan) {
          plan = {
            id: crypto.randomUUID(),
            date: iso,
            periodId: selectedPeriod?.id,
            tasks: [],
            mealsPlan: { breakfast: [], lunch: [], dinner: [], snack: [] },
            workoutsPlan: [],
            nutritionTargets: sourcePlan.nutritionTargets ?? {},
            requirements: { requireWeight: false, requireWaist: false, requirePhotos: [] }
          };
          state.planner.dayPlans.push(plan);
        }
        plan.mealsPlan = JSON.parse(JSON.stringify(sourcePlan.mealsPlan));
        plan.nutritionTargets = sourcePlan.nutritionTargets ?? plan.nutritionTargets;
      }
      return { ...state };
    });
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">План</h1>
        <div className="control-row">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'Периоды' && (
        <>
          <div className="card p-4 space-y-3">
            <h2 className="section-title">Создать период</h2>
            <input
              className="input"
              placeholder="Название"
              value={name}
              onChange={event => setName(event.target.value)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className="input"
                type="date"
                value={startDate}
                onChange={event => setStartDate(event.target.value)}
              />
              <input
                className="input"
                type="date"
                value={endDate}
                onChange={event => setEndDate(event.target.value)}
              />
            </div>
            <button className="btn-primary w-full" onClick={addPeriod} disabled={!canAddPeriod}>
              Добавить период
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="section-title">Периоды</h2>
            {data.planner.periods.map(period => (
              <button
                key={period.id}
                className={`card flex w-full items-center justify-between p-4 text-left ${
                  selectedPeriod?.id === period.id ? 'border border-slate-900' : ''
                }`}
                onClick={() => setSelectedPeriod(period)}
              >
                <div>
                  <h3 className="text-lg font-semibold">{period.name}</h3>
                  <p className="text-sm text-slate-500">
                    {period.startDate} → {period.endDate}
                  </p>
                </div>
                <span className="text-slate-400">Открыть</span>
              </button>
            ))}
          </div>

          {selectedPeriod ? (
            <div className="card p-4 space-y-3">
              <h2 className="section-title">Дни периода</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {dayList.map(date => (
                  <button
                    key={date}
                    className={`btn-secondary w-full ${
                      editorDate === date ? 'border border-slate-900' : ''
                    }`}
                    onClick={() => openDayEditor(date)}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {dayPlan ? (
            <div className="card p-4 space-y-4">
              <h2 className="section-title">Редактор дня · {editorDate}</h2>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Требования</h3>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={dayPlan.requirements.requireWeight}
                      onChange={event =>
                        updateData(state => {
                          const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                          if (!plan) return { ...state };
                          plan.requirements.requireWeight = event.target.checked;
                          return { ...state };
                        })
                      }
                    />
                    Вес
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={dayPlan.requirements.requireWaist}
                      onChange={event =>
                        updateData(state => {
                          const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                          if (!plan) return { ...state };
                          plan.requirements.requireWaist = event.target.checked;
                          return { ...state };
                        })
                      }
                    />
                    Талия
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={dayPlan.requirements.requirePhotos.includes('front')}
                      onChange={event =>
                        updateData(state => {
                          const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                          if (!plan) return { ...state };
                          plan.requirements.requirePhotos = event.target.checked
                            ? Array.from(new Set([...plan.requirements.requirePhotos, 'front']))
                            : plan.requirements.requirePhotos.filter(photo => photo !== 'front');
                          return { ...state };
                        })
                      }
                    />
                    Фото front
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={dayPlan.requirements.requirePhotos.includes('side')}
                      onChange={event =>
                        updateData(state => {
                          const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                          if (!plan) return { ...state };
                          plan.requirements.requirePhotos = event.target.checked
                            ? Array.from(new Set([...plan.requirements.requirePhotos, 'side']))
                            : plan.requirements.requirePhotos.filter(photo => photo !== 'side');
                          return { ...state };
                        })
                      }
                    />
                    Фото side
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    className="input"
                    type="number"
                    placeholder="Лимит сигарет"
                    value={dayPlan.requirements.smokingTargetMax ?? ''}
                    onChange={event =>
                      updateData(state => {
                        const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                        if (!plan) return { ...state };
                        plan.requirements.smokingTargetMax = Number(event.target.value) || undefined;
                        return { ...state };
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Цели КБЖУ и приемы пищи</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    className="input"
                    type="number"
                    placeholder="Ккал"
                    value={nutritionTargets.kcal ?? ''}
                    onChange={event =>
                      updateNutritionTarget(
                        'kcal',
                        event.target.value ? Number(event.target.value) : undefined
                      )
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Белки"
                    value={nutritionTargets.protein ?? ''}
                    onChange={event =>
                      updateNutritionTarget(
                        'protein',
                        event.target.value ? Number(event.target.value) : undefined
                      )
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Жиры"
                    value={nutritionTargets.fat ?? ''}
                    onChange={event =>
                      updateNutritionTarget(
                        'fat',
                        event.target.value ? Number(event.target.value) : undefined
                      )
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Углеводы"
                    value={nutritionTargets.carb ?? ''}
                    onChange={event =>
                      updateNutritionTarget(
                        'carb',
                        event.target.value ? Number(event.target.value) : undefined
                      )
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Приемы пищи"
                    value={nutritionTargets.meals ?? ''}
                    onChange={event =>
                      updateNutritionTarget(
                        'meals',
                        event.target.value ? Number(event.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold">Питание</h3>
                  <button
                    className="btn-secondary w-full sm:w-auto"
                    onClick={() =>
                      setMealSheet({
                        meal: 'breakfast',
                        kind: 'dish',
                        refId: '',
                        title: '',
                        grams: 150,
                        servings: 1,
                        cheatCategory: 'pizza',
                        nutritionTags: [],
                        plannedKcal: '',
                        plannedProtein: '',
                        plannedFat: '',
                        plannedCarb: ''
                      })
                    }
                  >
                    Добавить блюдо/продукт
                  </button>
                </div>
                {(Object.keys(mealLabels) as FoodEntry['meal'][]).map(meal => (
                  <div key={meal} className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {mealLabels[meal]}
                      </p>
                      <label className="text-[11px] text-slate-500">
                        Время
                        <input
                          type="time"
                          className="input input-time mt-1 w-32"
                          value={mealTimes[meal] || getDefaultMealTime(meal)}
                          onChange={event => updateMealTime(meal, event.target.value)}
                        />
                      </label>
                    </div>
                    {dayPlan.mealsPlan[meal].length === 0 ? (
                      <p className="text-xs text-slate-500">Нет позиций</p>
                    ) : (
                      dayPlan.mealsPlan[meal].map(item => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-2 rounded-xl border p-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="text-sm">
                            {item.kind === 'dish'
                              ? data.library.recipes.find(dish => dish.id === item.refId)?.name
                              : item.kind === 'product'
                              ? data.library.products.find(product => product.id === item.refId)?.name
                              : item.title}
                          </div>
                          <button
                            className="btn-secondary w-full text-red-500 sm:w-auto"
                            onClick={() =>
                              updateData(state => {
                                const plan = state.planner.dayPlans.find(
                                  itemPlan => itemPlan.date === editorDate
                                );
                                if (!plan) return { ...state };
                                plan.mealsPlan[meal] = plan.mealsPlan[meal].filter(
                                  itemPlan => itemPlan.id !== item.id
                                );
                                return { ...state };
                              })
                            }
                          >
                            Удалить
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold">Тренировки</h3>
                  <button
                    className="btn-secondary w-full sm:w-auto"
                    onClick={() =>
                      setWorkoutSheet({
                        timeOfDay: 'morning',
                        kind: 'workout',
                        protocolRef: '',
                        plannedTime: '',
                        plannedMinutes: 10,
                        isRequired: true,
                        movementActivityRef: data.library.movementActivities[0]?.id ?? ''
                      })
                    }
                  >
                    Добавить сессию
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    className="input"
                    type="number"
                    placeholder="Шаги по плану"
                    value={dayPlan.plannedSteps ?? ''}
                    onChange={event =>
                      updateData(state => {
                        const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                        if (!plan) return { ...state };
                        plan.plannedSteps = Number(event.target.value) || undefined;
                        return { ...state };
                      })
                    }
                  />
                </div>
                {dayPlan.workoutsPlan.length === 0 ? (
                  <p className="text-xs text-slate-500">Нет тренировок</p>
                ) : (
                  dayPlan.workoutsPlan.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-xl border p-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-sm">
                        {item.kind === 'movement'
                          ? `Движение · ${
                              data.library.movementActivities.find(
                                activity => activity.id === item.movementActivityRef
                              )?.name ?? 'Активность'
                            } · ${item.plannedMinutes ?? 10} мин`
                          : data.library.protocols.find(proto => proto.id === item.protocolRef)?.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <label>
                          Время
                          <input
                            type="time"
                            className="input input-time mt-1 w-32"
                            value={item.plannedTime ?? getDefaultTimeForTimeOfDay(item.timeOfDay)}
                            onChange={event => updateWorkoutTime(item.id, event.target.value)}
                          />
                        </label>
                        <label>
                          Время суток
                          <select
                            className="input input-time mt-1"
                            value={item.timeOfDay}
                            onChange={event =>
                              updateWorkoutTimeOfDay(
                                item.id,
                                event.target.value as WorkoutPlanItem['timeOfDay']
                              )
                            }
                          >
                            {(Object.keys(timeOfDayLabels) as WorkoutPlanItem['timeOfDay'][]).map(
                              option => (
                                <option key={option} value={option}>
                                  {timeOfDayLabels[option]}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                      </div>
                      <button
                        className="btn-secondary w-full text-red-500 sm:w-auto"
                        onClick={() =>
                          updateData(state => {
                            const plan = state.planner.dayPlans.find(
                              itemPlan => itemPlan.date === editorDate
                            );
                            if (!plan) return { ...state };
                            plan.workoutsPlan = plan.workoutsPlan.filter(
                              itemPlan => itemPlan.id !== item.id
                            );
                            return { ...state };
                          })
                        }
                      >
                        Удалить
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </>
      )}

      {activeTab === 'Рацион' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-2">
            <h2 className="section-title">Меню на период</h2>
            {selectedPeriod ? (
              <p className="text-sm text-slate-500">
                {selectedPeriod.name}: {selectedPeriod.startDate} → {selectedPeriod.endDate}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Выберите период в разделе «Периоды».</p>
            )}
          </div>

          {selectedPeriod ? (
            <div className="space-y-2">
              {dayList.map(date => {
                const plan = data.planner.dayPlans.find(item => item.date === date);
                if (!plan) return null;
                const nutrition = plannedNutrition(date);
                return (
                  <div key={date} className="card p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{date}</h3>
                        <p className="text-xs text-slate-500">
                          План: {nutrition.kcal.toFixed(0)} ккал · Б {nutrition.protein.toFixed(0)} /
                          Ж {nutrition.fat.toFixed(0)} / У {nutrition.carb.toFixed(0)}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">
                        Цель: {plan.nutritionTargets?.kcal ?? '—'} ккал · приёмов{' '}
                        {plan.nutritionTargets?.meals ?? '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Скопировать меню на диапазон</h3>
            <input
              className="input"
              type="date"
              value={menuCopy.sourceDate}
              onChange={event => setMenuCopy(prev => ({ ...prev, sourceDate: event.target.value }))}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                className="input"
                type="date"
                value={menuCopy.startDate}
                onChange={event => setMenuCopy(prev => ({ ...prev, startDate: event.target.value }))}
              />
              <input
                className="input"
                type="date"
                value={menuCopy.endDate}
                onChange={event => setMenuCopy(prev => ({ ...prev, endDate: event.target.value }))}
              />
            </div>
            <button className="btn-secondary w-full" onClick={copyMenuRange} disabled={!canCopyMenu}>
              Скопировать меню
            </button>
          </div>
        </div>
      )}

      <BottomSheet
        open={Boolean(mealSheet)}
        title="Добавить в меню"
        onClose={() => setMealSheet(null)}
      >
        {mealSheet && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-600">Приём пищи</label>
            <select
              className="input"
              value={mealSheet.meal}
              onChange={event =>
                setMealSheet(prev =>
                  prev ? { ...prev, meal: event.target.value as FoodEntry['meal'] } : prev
                )
              }
            >
              {Object.entries(mealLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Тип</label>
            <select
              className="input"
              value={mealSheet.kind}
              onChange={event =>
                setMealSheet(prev =>
                  prev ? { ...prev, kind: event.target.value as MealPlanItem['kind'] } : prev
                )
              }
            >
              <option value="dish">Блюдо</option>
              <option value="product">Продукт</option>
              <option value="free">Свободно</option>
              <option value="cheat">Читмил</option>
            </select>

            {(mealSheet.kind === 'dish' || mealSheet.kind === 'product') && (
              <>
                <label className="text-sm font-semibold text-slate-600">Справочник</label>
                <select
                  className="input"
                  value={mealSheet.refId ?? ''}
                  onChange={event =>
                    setMealSheet(prev => {
                      if (!prev) return prev;
                      const refId = event.target.value;
                      const tags =
                        prev.kind === 'dish'
                          ? data.library.recipes.find(item => item.id === refId)?.nutritionTags ?? []
                          : data.library.products.find(item => item.id === refId)?.nutritionTags ?? [];
                      return { ...prev, refId, nutritionTags: tags };
                    })
                  }
                >
                  <option value="">Выберите</option>
                  {(mealSheet.kind === 'dish' ? data.library.recipes : data.library.products).map(
                    item => (
                      <option key={item.id} value={item.id}>
                        {'name' in item ? item.name : 'Название'}
                      </option>
                    )
                  )}
                </select>
              </>
            )}

            {mealSheet.kind === 'dish' ? (
              <input
                className="input"
                type="number"
                placeholder="Порции"
                value={mealSheet.servings}
                onChange={event =>
                  setMealSheet(prev =>
                    prev ? { ...prev, servings: Number(event.target.value) } : prev
                  )
                }
              />
            ) : null}

            {mealSheet.kind === 'product' ? (
              <input
                className="input"
                type="number"
                placeholder="Граммы"
                value={mealSheet.grams}
                onChange={event =>
                  setMealSheet(prev =>
                    prev ? { ...prev, grams: Number(event.target.value) } : prev
                  )
                }
              />
            ) : null}

            {(mealSheet.kind === 'free' || mealSheet.kind === 'cheat') && (
              <>
                <input
                  className="input"
                  placeholder="Название"
                  value={mealSheet.title}
                  onChange={event =>
                    setMealSheet(prev => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                />
                {mealSheet.kind === 'cheat' ? (
                  <select
                    className="input"
                    value={mealSheet.cheatCategory ?? 'pizza'}
                    onChange={event =>
                      setMealSheet(prev =>
                        prev
                          ? {
                              ...prev,
                              cheatCategory: event.target.value as MealPlanItem['cheatCategory']
                            }
                          : prev
                      )
                    }
                  >
                    <option value="pizza">Пицца</option>
                    <option value="fastfood">Фастфуд</option>
                    <option value="sweets">Сладкое</option>
                    <option value="other">Другое</option>
                  </select>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input"
                    type="number"
                    placeholder="Ккал"
                    value={mealSheet.plannedKcal}
                    onChange={event =>
                      setMealSheet(prev =>
                        prev ? { ...prev, plannedKcal: event.target.value } : prev
                      )
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Белки"
                    value={mealSheet.plannedProtein}
                    onChange={event =>
                      setMealSheet(prev =>
                        prev ? { ...prev, plannedProtein: event.target.value } : prev
                      )
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Жиры"
                    value={mealSheet.plannedFat}
                    onChange={event =>
                      setMealSheet(prev =>
                        prev ? { ...prev, plannedFat: event.target.value } : prev
                      )
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Углеводы"
                    value={mealSheet.plannedCarb}
                    onChange={event =>
                      setMealSheet(prev =>
                        prev ? { ...prev, plannedCarb: event.target.value } : prev
                      )
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600">Метки питания</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {(Object.keys(nutritionTagLabels) as NutritionTag[]).map(tag => (
                  <label key={tag} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={mealSheet.nutritionTags.includes(tag)}
                      onChange={() => toggleMealSheetTag(tag)}
                    />
                    {nutritionTagLabels[tag]}
                  </label>
                ))}
              </div>
            </div>

            <button className="btn-primary w-full" onClick={addMealToPlan}>
              Сохранить в план
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(workoutSheet)}
        title="Добавить сессию"
        onClose={() => setWorkoutSheet(null)}
      >
        {workoutSheet && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-600">Время суток</label>
            <select
              className="input"
              value={workoutSheet.timeOfDay}
              onChange={event =>
                setWorkoutSheet(prev =>
                  prev
                    ? { ...prev, timeOfDay: event.target.value as WorkoutPlanItem['timeOfDay'] }
                    : prev
                )
              }
            >
              {(Object.keys(timeOfDayLabels) as WorkoutPlanItem['timeOfDay'][]).map(option => (
                <option key={option} value={option}>
                  {timeOfDayLabels[option]}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Точное время</label>
            <input
              type="time"
              className="input"
              value={workoutSheet.plannedTime}
              onChange={event =>
                setWorkoutSheet(prev =>
                  prev
                    ? {
                        ...prev,
                        plannedTime: event.target.value,
                        timeOfDay: event.target.value
                          ? getTimeOfDayFromTime(event.target.value)
                          : prev.timeOfDay
                      }
                    : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Тип</label>
            <select
              className="input"
              value={workoutSheet.kind}
              onChange={event =>
                setWorkoutSheet(prev =>
                  prev ? { ...prev, kind: event.target.value as WorkoutPlanItem['kind'] } : prev
                )
              }
            >
              <option value="workout">Тренировка</option>
              <option value="movement">Движение</option>
            </select>
            {workoutSheet.kind === 'workout' ? (
              <select
                className="input"
                value={workoutSheet.protocolRef}
                onChange={event =>
                  setWorkoutSheet(prev => (prev ? { ...prev, protocolRef: event.target.value } : prev))
                }
              >
                <option value="">Выберите протокол</option>
                {data.library.protocols.map(protocol => (
                  <option key={protocol.id} value={protocol.id}>
                    {protocol.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <select
                  className="input"
                  value={workoutSheet.movementActivityRef || defaultMovementActivityId}
                  onChange={event =>
                    setWorkoutSheet(prev =>
                      prev ? { ...prev, movementActivityRef: event.target.value } : prev
                    )
                  }
                >
                  {data.library.movementActivities.map(activity => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  placeholder="Минуты движения"
                  value={workoutSheet.plannedMinutes}
                  onChange={event =>
                    setWorkoutSheet(prev =>
                      prev ? { ...prev, plannedMinutes: Number(event.target.value) } : prev
                    )
                  }
                />
              </>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={workoutSheet.isRequired}
                onChange={event =>
                  setWorkoutSheet(prev => (prev ? { ...prev, isRequired: event.target.checked } : prev))
                }
              />
              Обязательная
            </label>
            <button className="btn-primary w-full" onClick={addWorkoutToPlan}>
              Сохранить
            </button>
          </div>
        )}
      </BottomSheet>
    </section>
  );
};

export default PlanPage;
