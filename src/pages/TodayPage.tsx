import { useMemo, useState, useEffect, useRef } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { WorkoutRunner } from '../components/WorkoutRunner';
import { savePhotoBlob } from '../storage/photoDb';
import { useAppStore } from '../store/useAppStore';
import { formatDate, todayISO } from '../utils/date';
import { calcFoodEntry, calcRecipeNutrition } from '../utils/nutrition';
import { FoodEntry, MealComponent, MealComponentType, WorkoutPlanItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { getTimeOfDayFromDateTime, getTimeOfDayFromTime, timeOfDayLabels } from '../utils/timeOfDay';

const mealLabels: Record<FoodEntry['meal'], string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const cheatLabels: Record<NonNullable<FoodEntry['cheatCategory']>, string> = {
  pizza: 'Пицца',
  fastfood: 'Фастфуд',
  sweets: 'Сладкое',
  other: 'Другое'
};

const photoLabels: Record<'front' | 'side', string> = {
  front: 'фронт',
  side: 'профиль'
};

const mealComponentLabels: Record<MealComponentType, string> = {
  main: 'Основное',
  side: 'Гарнир',
  salad: 'Салат',
  soup: 'Суп',
  drink: 'Напиток',
  dessert: 'Десерт',
  snack: 'Перекус'
};

const mealComponentPortions: Record<MealComponentType, string[]> = {
  main: ['1 порция', '1/2 порции', '2 порции'],
  side: ['1 порция', '1/2 порции'],
  salad: ['1 миска', '1/2 миски'],
  soup: ['1 тарелка', '1/2 тарелки'],
  drink: ['250 мл', '500 мл', '750 мл'],
  dessert: ['1 порция', '1/2 порции'],
  snack: ['1 порция', '1/2 порции']
};

const TodayPage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [sheet, setSheet] = useState<
    | 'food'
    | 'training'
    | 'movement'
    | 'smoking'
    | 'drink'
    | 'weight'
    | 'waist'
    | 'photo'
    | 'meal-edit'
    | 'date'
    | null
  >(null);
  const [photoKind, setPhotoKind] = useState<'front' | 'side'>('front');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [runner, setRunner] = useState<WorkoutPlanItem | null>(null);
  const [runnerProtocolId, setRunnerProtocolId] = useState<string | null>(null);
  const [mealEdit, setMealEdit] = useState<FoodEntry['meal'] | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [isNavVisible, setIsNavVisible] = useState(true);

  const [foodForm, setFoodForm] = useState({
    kind: 'product' as const,
    refId: '',
    grams: 120,
    servings: 1,
    meal: 'breakfast' as const,
    time: '',
    title: '',
    kcalOverride: '',
    cheatCategory: 'pizza' as FoodEntry['cheatCategory']
  });
  const [trainingForm, setTrainingForm] = useState({
    minutes: 45,
    time: ''
  });
  const [movementForm, setMovementForm] = useState({
    activityRef: '',
    durationMinutes: 20,
    plannedFlights: 10,
    time: ''
  });
  const [smokingForm, setSmokingForm] = useState({
    count: 1,
    trigger: 'стресс',
    stress: 3,
    ruleApplied: false,
    time: ''
  });
  const [drinkForm, setDrinkForm] = useState({
    drinkId: '',
    portionLabel: '',
    portionMl: 0,
    portionsCount: 1,
    time: ''
  });
  const [weightForm, setWeightForm] = useState({ weightKg: 72, time: '' });
  const [waistForm, setWaistForm] = useState({ waistCm: 80 });

  const {
    data,
    addFoodEntry,
    addTrainingLog,
    addMovementSessionLog,
    addSmokingLog,
    addDrinkLog,
    addWeightLog,
    addWaistLog,
    addPhotoMeta,
    updateData,
    createOrGetDayPlan
  } = useAppStore();

  const dayPlan = data.planner.dayPlans.find(plan => plan.date === selectedDate);
  const foodDay = data.logs.foodDays.find(day => day.date === selectedDate);

  const totals = useMemo(() => {
    const entries = foodDay?.entries ?? [];
    return entries.reduce(
      (acc, entry) => {
        const macro = calcFoodEntry(entry, data.library);
        return {
          kcal: acc.kcal + macro.kcal,
          protein: acc.protein + macro.protein,
          fat: acc.fat + macro.fat,
          carb: acc.carb + macro.carb
        };
      },
      { kcal: 0, protein: 0, fat: 0, carb: 0 }
    );
  }, [foodDay, data.library]);

  const movementSessions = data.logs.movementSessions.filter(
    log => log.dateTime.slice(0, 10) === selectedDate
  );
  const movementMinutes = movementSessions.reduce((sum, log) => sum + log.durationMinutes, 0);
  const movementDaySteps = data.logs.movementDays.find(day => day.date === selectedDate)?.steps;
  const trainingLogs = data.logs.training.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const cigaretteCount = data.logs.smoking
    .filter(log => log.dateTime.slice(0, 10) === selectedDate)
    .reduce((sum, log) => sum + log.count, 0);
  const drinkLogs = data.logs.drinks.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const drinkTotalMl = drinkLogs.reduce(
    (sum, log) => sum + log.portionMl * log.portionsCount,
    0
  );
  const hydrationEquivalent = drinkLogs.reduce((sum, log) => {
    const drink = data.library.drinks.find(item => item.id === log.drinkId);
    const factor = drink?.hydrationFactor ?? 1;
    return sum + log.portionMl * log.portionsCount * factor;
  }, 0);
  const lastWeight = data.logs.weight
    .filter(log => log.dateTime.slice(0, 10) === selectedDate)
    .slice(-1)[0]?.weightKg;
  const lastWaist = data.logs.waist.filter(log => log.date === selectedDate).slice(-1)[0]?.waistCm;
  const moveDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  const toDateTime = (date: string, time: string) => {
    if (!time) return new Date().toISOString();
    return new Date(`${date}T${time}:00`).toISOString();
  };

  const getMealTimeOfDay = (meal: FoodEntry['meal'], time?: string) => {
    if (time) return getTimeOfDayFromTime(time);
    if (meal === 'breakfast') return 'morning';
    if (meal === 'dinner') return 'evening';
    return 'day';
  };

  const getDefaultPortion = (type: MealComponentType) => mealComponentPortions[type][0];

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const headerOffset = headerRef.current?.offsetHeight ?? 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset - 8;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    let isMobile = window.matchMedia('(max-width: 639px)').matches;

    const updateVisibility = () => {
      if (!isMobile) {
        setIsNavVisible(true);
        lastScrollY = window.scrollY;
        return;
      }
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const passedThreshold = currentScrollY > 80;
      setIsNavVisible(!isScrollingDown || !passedThreshold);
      lastScrollY = currentScrollY;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        updateVisibility();
        ticking = false;
      });
    };

    const handleResize = () => {
      isMobile = window.matchMedia('(max-width: 639px)').matches;
      if (!isMobile) {
        setIsNavVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    updateVisibility();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const addMealComponent = (meal: FoodEntry['meal']) => {
    const plan = createOrGetDayPlan(selectedDate);
    updateData(state => {
      const target = state.planner.dayPlans.find(item => item.date === plan.date);
      if (!target) return { ...state };
      target.mealComponents ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
      const type: MealComponentType = meal === 'snack' ? 'snack' : 'main';
      const newComponent: MealComponent = {
        id: crypto.randomUUID(),
        type,
        recipeRef: data.library.recipes[0]?.id,
        portion: getDefaultPortion(type),
        extra: false
      };
      target.mealComponents[meal].push(newComponent);
      return { ...state };
    });
  };

  const updateMealComponent = (
    meal: FoodEntry['meal'],
    id: string,
    payload: Partial<MealComponent>
  ) => {
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
      if (!plan) return { ...state };
      plan.mealComponents ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
      plan.mealComponents[meal] = plan.mealComponents[meal].map(item =>
        item.id === id ? { ...item, ...payload } : item
      );
      return { ...state };
    });
  };

  const removeMealComponent = (meal: FoodEntry['meal'], id: string) => {
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
      if (!plan) return { ...state };
      plan.mealComponents ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
      plan.mealComponents[meal] = plan.mealComponents[meal].filter(item => item.id !== id);
      return { ...state };
    });
  };

  const updateMealTime = (meal: FoodEntry['meal'], time: string) => {
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
      if (!plan) return { ...state };
      plan.mealTimes ??= { breakfast: '', lunch: '', dinner: '', snack: '' };
      plan.mealTimes[meal] = time;
      return { ...state };
    });
  };

  const updateWorkoutTime = (id: string, time: string) => {
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
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

  const applyMealTemplate = (meal: FoodEntry['meal']) => {
    const template: MealComponentType[] =
      meal === 'breakfast'
        ? ['main', 'drink']
        : meal === 'snack'
          ? ['snack', 'drink']
          : ['main', 'side', 'salad', 'drink'];
    const plan = createOrGetDayPlan(selectedDate);
    updateData(state => {
      const target = state.planner.dayPlans.find(item => item.date === plan.date);
      if (!target) return { ...state };
      target.mealComponents ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
      target.mealComponents[meal] = template.map(type => ({
        id: crypto.randomUUID(),
        type,
        recipeRef: data.library.recipes[0]?.id,
        portion: getDefaultPortion(type),
        extra: false
      }));
      return { ...state };
    });
  };

  const savePhoto = async () => {
    if (!photoFile) return;
    const blobKey = crypto.randomUUID();
    await savePhotoBlob(blobKey, photoFile);
    addPhotoMeta({
      id: crypto.randomUUID(),
      dateTime: `${selectedDate}T${new Date().toISOString().slice(11, 19)}`,
      kind: photoKind,
      blobKey
    });
    setPhotoFile(null);
    setSheet(null);
  };

  const plannedWorkouts = dayPlan?.workoutsPlan ?? [];
  const plannedTraining = plannedWorkouts.filter(
    item => !(item.kind === 'movement' || !item.protocolRef)
  );
  const plannedMovement = plannedWorkouts.filter(
    item => item.kind === 'movement' || !item.protocolRef
  );
  const plannedMovementActivityId = plannedMovement.find(item => item.movementActivityRef)
    ?.movementActivityRef;
  const defaultMovementActivityId =
    plannedMovementActivityId ??
    data.library.movementActivities.find(item => item.kind === 'march')?.id ??
    data.library.movementActivities[0]?.id ??
    '';

  useEffect(() => {
    if (movementForm.activityRef || !defaultMovementActivityId) return;
    setMovementForm(prev => ({ ...prev, activityRef: defaultMovementActivityId }));
  }, [defaultMovementActivityId, movementForm.activityRef]);
  const mealComponents = dayPlan?.mealComponents ?? {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  };
  const mealTimes = dayPlan?.mealTimes ?? {
    breakfast: '',
    lunch: '',
    dinner: '',
    snack: ''
  };

  const requirements = dayPlan?.requirements;
  const requiredPhotos = requirements?.requirePhotos ?? [];

  const runnerProtocol = runnerProtocolId
    ? data.library.protocols.find(item => item.id === runnerProtocolId)
    : null;

  const scheduleMeals = dayPlan
    ? (Object.keys(mealLabels) as FoodEntry['meal'][])
        .filter(
          meal => mealComponents[meal].length > 0 || Boolean(mealTimes[meal] || '')
        )
        .map(meal => ({
          id: meal,
          meal,
          title: mealLabels[meal],
          time: mealTimes[meal],
          timeOfDay: getMealTimeOfDay(meal, mealTimes[meal]),
          completed: Boolean(foodDay?.entries.some(entry => entry.meal === meal))
        }))
    : (foodDay?.entries ?? []).map(entry => ({
        id: entry.id,
        meal: entry.meal,
        title:
          entry.kind === 'product'
            ? data.library.products.find(product => product.id === entry.refId)?.name ?? 'Продукт'
            : entry.kind === 'dish'
              ? data.library.recipes.find(recipe => recipe.id === entry.refId)?.name ?? 'Блюдо'
              : entry.title ?? 'Запись',
        time: entry.time,
        timeOfDay: getMealTimeOfDay(entry.meal, entry.time),
        completed: true
      }));

  const scheduleWorkouts = dayPlan
    ? plannedWorkouts.map(item => ({
        id: item.id,
        title:
          item.kind === 'movement' || !item.protocolRef
            ? data.library.movementActivities.find(
                activity => activity.id === item.movementActivityRef
              )?.name ?? 'Движение'
            : data.library.protocols.find(protocol => protocol.id === item.protocolRef)?.name ??
              'Тренировка',
        time: item.plannedTime,
        timeOfDay: item.timeOfDay,
        completed: item.completed
      }))
    : [
        ...trainingLogs.map(log => ({
          id: log.id,
          title: 'Тренировка',
          timeOfDay: getTimeOfDayFromDateTime(log.dateTime),
          completed: true
        })),
        ...movementSessions.map(log => ({
          id: log.id,
          title:
            data.library.movementActivities.find(item => item.id === log.activityRef)?.name ??
            'Движение',
          timeOfDay: getTimeOfDayFromDateTime(log.dateTime),
          completed: true
        }))
      ];

  const editingMeal = mealEdit ?? 'breakfast';
  const editComponents = mealEdit ? mealComponents[mealEdit] : [];
  const editMealTime = mealEdit ? mealTimes[mealEdit] : '';
  const plannedItemsCount = scheduleMeals.length + scheduleWorkouts.length;
  const completedItemsCount =
    scheduleMeals.filter(item => item.completed).length +
    scheduleWorkouts.filter(item => item.completed).length;
  const progressPercent = plannedItemsCount
    ? Math.round((completedItemsCount / plannedItemsCount) * 100)
    : 0;

  return (
    <section className="space-y-4">
      <header
        ref={headerRef}
        className={`sticky top-0 z-10 -mx-4 bg-slate-50 px-4 pb-2 pt-2 transition-transform duration-200 sm:pb-3 sm:pt-4 ${
          isNavVisible ? 'translate-y-0' : '-translate-y-full'
        } sm:translate-y-0`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <button
            className="btn-secondary px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
            onClick={() => setSheet('date')}
          >
            {formatDate(selectedDate)}
          </button>
          <div className="grid auto-cols-[minmax(80px,1fr)] grid-flow-col gap-1.5 overflow-x-auto pb-1 text-[11px] sm:gap-2 sm:text-xs sm:grid-cols-3 sm:grid-flow-row sm:auto-cols-auto sm:overflow-visible lg:grid-cols-6">
            <button
              className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
              onClick={() => scrollToSection('schedule')}
            >
              План дня
            </button>
            {dayPlan ? (
              <button
                className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
                onClick={() => scrollToSection('meal-plan')}
              >
                Питание
              </button>
            ) : null}
            {dayPlan ? (
              <>
                <button
                  className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
                  onClick={() => scrollToSection('training-plan')}
                >
                  Тренировки
                </button>
                <button
                  className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
                  onClick={() => scrollToSection('movement-plan')}
                >
                  Движение
                </button>
              </>
            ) : null}
            <button
              className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
              onClick={() => scrollToSection('smoking')}
            >
              Курение
            </button>
            <button
              className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
              onClick={() => scrollToSection('water')}
            >
              Вода
            </button>
            {requirements &&
            (requirements.requireWeight || requirements.requireWaist || requiredPhotos.length > 0) ? (
              <button
                className="btn-secondary w-full min-h-[30px] px-2.5 py-1.5 text-[11px] sm:min-h-[36px] sm:px-3 sm:py-2 sm:text-xs"
                onClick={() => scrollToSection('measurements')}
              >
                Измерения
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="card p-4" id="summary">
        <h2 className="section-title">Итоги дня</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Калории</p>
            <p className="text-lg font-semibold">{totals.kcal.toFixed(0)} ккал</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Движение</p>
            <p className="text-lg font-semibold">
              {movementDaySteps ? `${movementDaySteps} шагов` : '—'}
            </p>
            <p className="text-xs text-slate-400">{movementMinutes} мин активности</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Сигареты</p>
            <p className="text-lg font-semibold">{cigaretteCount} шт</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Водный баланс</p>
            <p className="text-lg font-semibold">{hydrationEquivalent.toFixed(0)} мл</p>
            <p className="text-xs text-slate-400">{drinkTotalMl.toFixed(0)} мл напитков</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Вес</p>
            <p className="text-lg font-semibold">{lastWeight ? `${lastWeight} кг` : '—'}</p>
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3" id="schedule">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">План дня</h2>
          <div className="control-row">
            <button className="btn-secondary" onClick={() => setSheet('food')}>
              Добавить питание
            </button>
            <button className="btn-secondary" onClick={() => setSheet('training')}>
              Добавить тренировку
            </button>
            <button className="btn-secondary" onClick={() => setSheet('movement')}>
              Добавить движение
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Прогресс дня: {completedItemsCount}/{plannedItemsCount || 0}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-emerald-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="space-y-4">
          {(Object.keys(timeOfDayLabels) as WorkoutPlanItem['timeOfDay'][]).map(timeOfDay => {
            const meals = scheduleMeals.filter(item => item.timeOfDay === timeOfDay);
            const workouts = scheduleWorkouts.filter(item => item.timeOfDay === timeOfDay);
            if (meals.length === 0 && workouts.length === 0) return null;
            return (
              <div key={timeOfDay} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {timeOfDayLabels[timeOfDay]}
                </p>
                <div className="space-y-2">
                  {workouts.map(item => {
                    const session = plannedWorkouts.find(workout => workout.id === item.id);
                    const isMovement =
                      session?.kind === 'movement' || !session?.protocolRef || !session;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 text-sm"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold">{item.title}</p>
                            <p className="text-xs text-slate-500">
                              Активность{item.time ? ` · ${item.time}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.completed ? <span className="badge">Выполнено</span> : null}
                            {dayPlan ? (
                              <button
                                className="btn-secondary"
                                onClick={() =>
                                  scrollToSection(isMovement ? 'movement-plan' : 'training-plan')
                                }
                              >
                                К плану
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {dayPlan ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <label className="text-xs text-slate-500">
                              Время
                              <input
                                type="time"
                                className="input mt-1"
                                value={item.time ?? ''}
                                onChange={event => updateWorkoutTime(item.id, event.target.value)}
                              />
                            </label>
                            <div className="control-row">
                              {!item.completed ? (
                                isMovement ? (
                                  <button
                                    className="btn-secondary w-full sm:w-auto"
                                    onClick={() => {
                                      const minutes = session?.plannedMinutes ?? 10;
                                      addMovementSessionLog({
                                        id: '',
                                        dateTime: toDateTime(selectedDate, item.time ?? ''),
                                        activityRef:
                                          session?.movementActivityRef ?? defaultMovementActivityId,
                                        durationMinutes: minutes,
                                        timeOfDay: getTimeOfDayFromTime(item.time)
                                      });
                                      updateData(state => {
                                        const plan = state.planner.dayPlans.find(
                                          planItem => planItem.date === selectedDate
                                        );
                                        if (!plan) return { ...state };
                                        plan.workoutsPlan = plan.workoutsPlan.map(planItem =>
                                          planItem.id === item.id
                                            ? {
                                                ...planItem,
                                                completed: true,
                                                completedMinutes: minutes
                                              }
                                            : planItem
                                        );
                                        return { ...state };
                                      });
                                    }}
                                  >
                                    Отметить активность
                                  </button>
                                ) : (
                                  <button
                                    className="btn-primary w-full sm:w-auto"
                                    onClick={() => {
                                      if (!session) return;
                                      setRunner(session);
                                      setRunnerProtocolId(session.protocolRef ?? null);
                                    }}
                                  >
                                    Запустить
                                  </button>
                                )
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {meals.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 text-sm"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-xs text-slate-500">
                            {mealLabels[item.meal]}
                            {item.time ? ` · ${item.time}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {item.completed ? <span className="badge">Учтено</span> : null}
                          {dayPlan ? (
                            <button
                              className="btn-secondary"
                              onClick={() => scrollToSection('meal-plan')}
                            >
                              К питанию
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {dayPlan ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <label className="text-xs text-slate-500">
                            Время
                            <input
                              type="time"
                              className="input mt-1"
                              value={mealTimes[item.meal] ?? ''}
                              onChange={event => updateMealTime(item.meal, event.target.value)}
                            />
                          </label>
                          {!item.completed ? (
                            <button
                              className="btn-secondary w-full sm:w-auto"
                              onClick={() => {
                                setFoodForm(prev => ({
                                  ...prev,
                                  meal: item.meal,
                                  time: mealTimes[item.meal] ?? ''
                                }));
                                setSheet('food');
                              }}
                            >
                              Отметить прием
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {!scheduleMeals.length && !scheduleWorkouts.length ? (
            <p className="text-sm text-slate-500">
              Пока нет расписания. Добавьте питание, тренировки и движение или создайте план.
            </p>
          ) : null}
        </div>
      </div>

      {dayPlan ? (
        <>
          <div className="card p-4 space-y-3" id="training-plan">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">План тренировок</h2>
              <button className="btn-secondary" onClick={() => setSheet('training')}>
                Добавить тренировку
              </button>
            </div>
            <div className="space-y-3">
              {(Object.keys(timeOfDayLabels) as WorkoutPlanItem['timeOfDay'][]).map(timeOfDay => {
                const sessions = plannedTraining.filter(item => item.timeOfDay === timeOfDay);
                if (sessions.length === 0) return null;
                return (
                  <div key={timeOfDay} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {timeOfDayLabels[timeOfDay]}
                    </p>
                    {sessions.map(session => {
                      const protocol = session.protocolRef
                        ? data.library.protocols.find(item => item.id === session.protocolRef)
                        : null;
                      return (
                        <div key={session.id} className="rounded-2xl border border-slate-200 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold">
                                {protocol?.name ?? 'Тренировка'}
                              </p>
                              <p className="text-xs text-slate-500">{protocol?.description}</p>
                            </div>
                            {session.completed ? <span className="badge">Выполнено</span> : null}
                          </div>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <label className="text-xs text-slate-500">
                              Время
                              <input
                                type="time"
                                className="input mt-1"
                                value={session.plannedTime ?? ''}
                                onChange={event => updateWorkoutTime(session.id, event.target.value)}
                              />
                            </label>
                            <label className="text-xs text-slate-500">
                              Время суток
                              <select
                                className="input mt-1"
                                value={session.timeOfDay}
                                onChange={event => {
                                  const next = event.target.value as WorkoutPlanItem['timeOfDay'];
                                  updateData(state => {
                                    const plan = state.planner.dayPlans.find(
                                      item => item.date === selectedDate
                                    );
                                    if (!plan) return { ...state };
                                    plan.workoutsPlan = plan.workoutsPlan.map(item =>
                                      item.id === session.id ? { ...item, timeOfDay: next } : item
                                    );
                                    return { ...state };
                                  });
                                }}
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
                            <button
                              className="btn-primary w-full sm:w-auto"
                              onClick={() => {
                                setRunner(session);
                                setRunnerProtocolId(session.protocolRef ?? null);
                              }}
                            >
                              Запустить
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {plannedTraining.length === 0 ? (
                <p className="text-sm text-slate-500">План тренировок пуст.</p>
              ) : null}
            </div>
          </div>

          <div className="card p-4 space-y-3" id="movement-plan">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">План движения</h2>
              <button className="btn-secondary" onClick={() => setSheet('movement')}>
                Добавить движение
              </button>
            </div>
            <div className="space-y-3">
              {(Object.keys(timeOfDayLabels) as WorkoutPlanItem['timeOfDay'][]).map(timeOfDay => {
                const sessions = plannedMovement.filter(item => item.timeOfDay === timeOfDay);
                if (sessions.length === 0) return null;
                return (
                  <div key={timeOfDay} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {timeOfDayLabels[timeOfDay]}
                    </p>
                    {sessions.map(session => (
                      <div key={session.id} className="rounded-2xl border border-slate-200 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              {data.library.movementActivities.find(
                                activity => activity.id === session.movementActivityRef
                              )?.name ?? 'Движение'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {session.plannedMinutes ?? 10} мин
                            </p>
                          </div>
                          {session.completed ? <span className="badge">Выполнено</span> : null}
                        </div>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <label className="text-xs text-slate-500">
                            Активность
                            <select
                              className="input mt-1"
                              value={session.movementActivityRef ?? defaultMovementActivityId}
                              onChange={event => {
                                const next = event.target.value;
                                updateData(state => {
                                  const plan = state.planner.dayPlans.find(
                                    item => item.date === selectedDate
                                  );
                                  if (!plan) return { ...state };
                                  plan.workoutsPlan = plan.workoutsPlan.map(item =>
                                    item.id === session.id
                                      ? { ...item, movementActivityRef: next }
                                      : item
                                  );
                                  return { ...state };
                                });
                              }}
                            >
                              {data.library.movementActivities.map(activity => (
                                <option key={activity.id} value={activity.id}>
                                  {activity.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs text-slate-500">
                            Время
                            <input
                              type="time"
                              className="input mt-1"
                              value={session.plannedTime ?? ''}
                              onChange={event => updateWorkoutTime(session.id, event.target.value)}
                            />
                          </label>
                          <label className="text-xs text-slate-500">
                            Время суток
                            <select
                              className="input mt-1"
                              value={session.timeOfDay}
                              onChange={event => {
                                const next = event.target.value as WorkoutPlanItem['timeOfDay'];
                                updateData(state => {
                                  const plan = state.planner.dayPlans.find(
                                    item => item.date === selectedDate
                                  );
                                  if (!plan) return { ...state };
                                  plan.workoutsPlan = plan.workoutsPlan.map(item =>
                                    item.id === session.id ? { ...item, timeOfDay: next } : item
                                  );
                                  return { ...state };
                                });
                              }}
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
                          <button
                            className="btn-secondary w-full sm:w-auto"
                            onClick={() => {
                              const minutes = session.plannedMinutes ?? 10;
                              addMovementSessionLog({
                                id: '',
                                dateTime: toDateTime(selectedDate, session.plannedTime ?? ''),
                                activityRef:
                                  session.movementActivityRef ?? defaultMovementActivityId,
                                durationMinutes: minutes,
                                timeOfDay: getTimeOfDayFromTime(session.plannedTime)
                              });
                              updateData(state => {
                                const plan = state.planner.dayPlans.find(
                                  item => item.date === selectedDate
                                );
                                if (!plan) return { ...state };
                                plan.workoutsPlan = plan.workoutsPlan.map(item =>
                                  item.id === session.id
                                    ? {
                                        ...item,
                                        completed: true,
                                        completedMinutes: minutes
                                      }
                                    : item
                                );
                                return { ...state };
                              });
                            }}
                          >
                            Отметить {session.plannedMinutes ?? 10} мин
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {plannedMovement.length === 0 ? (
                <p className="text-sm text-slate-500">План движения пуст.</p>
              ) : null}
            </div>
          </div>

          <div className="card p-4 space-y-3" id="meal-plan">
            <h2 className="section-title">Питание по плану</h2>
            {(Object.keys(mealLabels) as FoodEntry['meal'][]).map(meal => (
              <div key={meal} className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{mealLabels[meal]}</p>
                    <p className="text-xs text-slate-500">
                      {mealTimes[meal] ? `Время: ${mealTimes[meal]}` : 'Время не задано'}
                    </p>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setMealEdit(meal);
                      setSheet('meal-edit');
                    }}
                  >
                    Редактировать прием
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Состав приема пищи
                  </p>
                  {mealComponents[meal].length ? (
                    <div className="control-row text-xs">
                      {mealComponents[meal].map(component => {
                        const recipeName =
                          data.library.recipes.find(recipe => recipe.id === component.recipeRef)
                            ?.name ?? 'Не выбрано';
                        return (
                          <span key={component.id} className="badge">
                            {mealComponentLabels[component.type]} · {recipeName} · {component.portion}
                            {component.extra ? ' · добавка' : ''}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Состав не задан. Добавьте компоненты в редакторе приема пищи.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {requirements &&
          (requirements.requireWeight || requirements.requireWaist || requiredPhotos.length > 0) ? (
            <div className="card p-4 space-y-3" id="measurements">
              <h2 className="section-title">Фото и измерения</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {requirements.requireWeight ? (
                  <button className="btn-secondary" onClick={() => setSheet('weight')}>
                    Внести вес
                  </button>
                ) : null}
                {requirements.requireWaist ? (
                  <button className="btn-secondary" onClick={() => setSheet('waist')}>
                    Внести талию
                  </button>
                ) : null}
                {requiredPhotos.map(kind => (
                  <button
                    key={kind}
                    className="btn-secondary"
                    onClick={() => {
                      setPhotoKind(kind);
                      setSheet('photo');
                    }}
                  >
                    Добавить фото {photoLabels[kind]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card p-4 space-y-2">
          <h2 className="section-title">Плана нет</h2>
          <p className="text-sm text-slate-500">
            На эту дату пока нет плана. Выберите период или создайте план.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn-primary w-full" onClick={() => navigate('/plan')}>
              Перейти в планирование
            </button>
            <button
              className="btn-secondary w-full"
              onClick={() => {
                createOrGetDayPlan(selectedDate);
              }}
            >
              Создать расписание вручную
            </button>
          </div>
        </div>
      )}

      <div className="card p-4 space-y-2" id="smoking">
        <h2 className="section-title">Курение</h2>
        <p className="text-sm text-slate-500">
          Лимит: {requirements?.smokingTargetMax ?? '—'} · Факт: {cigaretteCount}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="btn-secondary" onClick={() => setSheet('smoking')}>
            Добавить сигарету
          </button>
          <button className="btn-secondary" onClick={() => scrollToSection('summary')}>
            Смотреть сводку
          </button>
        </div>
      </div>

      <div className="card p-4 space-y-2" id="water">
        <h2 className="section-title">Водный баланс</h2>
        <p className="text-sm text-slate-500">
          Эквивалент воды: {hydrationEquivalent.toFixed(0)} мл · Выпито напитков:{' '}
          {drinkTotalMl.toFixed(0)} мл
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="btn-secondary" onClick={() => setSheet('drink')}>
            Добавить напиток
          </button>
          <button className="btn-secondary" onClick={() => scrollToSection('summary')}>
            Смотреть сводку
          </button>
        </div>
      </div>

      <BottomSheet open={sheet === 'date'} title="Выбор даты" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Дата</label>
        <input
          type="date"
          className="input"
          value={selectedDate}
          onChange={event => setSelectedDate(event.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <button className="btn-secondary" onClick={() => moveDate(-1)}>
            Вчера
          </button>
          <button className="btn-secondary" onClick={() => setSelectedDate(todayISO())}>
            Сегодня
          </button>
          <button className="btn-secondary" onClick={() => moveDate(1)}>
            Завтра
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'meal-edit'}
        title={mealEdit ? `Редактирование · ${mealLabels[mealEdit]}` : 'Редактирование'}
        onClose={() => {
          setSheet(null);
          setMealEdit(null);
        }}
      >
        {mealEdit ? (
          <>
            <label className="text-sm font-semibold text-slate-600">Время приема пищи</label>
            <input
              type="time"
              className="input"
              value={editMealTime}
              onChange={event => updateMealTime(mealEdit, event.target.value)}
            />
            <div className="rounded-2xl border border-slate-200 p-3 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Компоненты приема пищи
                </p>
                <button className="btn-secondary" onClick={() => addMealComponent(mealEdit)}>
                  Добавить компонент
                </button>
              </div>
              <div className="control-row">
                <button className="btn-secondary" onClick={() => applyMealTemplate(mealEdit)}>
                  Шаблон приема
                </button>
              </div>
              {editComponents.length ? (
                <div className="space-y-3">
                  {editComponents.map(component => (
                    <div
                      key={component.id}
                      className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"
                    >
                      <label className="text-xs text-slate-500">
                        Тип блюда
                        <select
                          className="input mt-1"
                          value={component.type}
                          onChange={event => {
                            const nextType = event.target.value as MealComponentType;
                            const nextPortion = mealComponentPortions[nextType].includes(
                              component.portion
                            )
                              ? component.portion
                              : getDefaultPortion(nextType);
                            updateMealComponent(mealEdit, component.id, {
                              type: nextType,
                              portion: nextPortion
                            });
                          }}
                        >
                          {(Object.keys(mealComponentLabels) as MealComponentType[]).map(option => (
                            <option key={option} value={option}>
                              {mealComponentLabels[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-slate-500">
                        Блюдо
                        <select
                          className="input mt-1"
                          value={component.recipeRef ?? ''}
                          onChange={event =>
                            updateMealComponent(mealEdit, component.id, {
                              recipeRef: event.target.value || undefined
                            })
                          }
                        >
                          <option value="">Выберите блюдо</option>
                          {data.library.recipes.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-slate-500">
                        Порция
                        <select
                          className="input mt-1"
                          value={component.portion}
                          onChange={event =>
                            updateMealComponent(mealEdit, component.id, {
                              portion: event.target.value
                            })
                          }
                        >
                          {mealComponentPortions[component.type].map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex flex-col gap-2 text-xs text-slate-500">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={Boolean(component.extra)}
                            onChange={event =>
                              updateMealComponent(mealEdit, component.id, {
                                extra: event.target.checked
                              })
                            }
                          />
                          Добавка
                        </label>
                        <button
                          className="btn-secondary"
                          onClick={() => removeMealComponent(mealEdit, component.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Добавьте компоненты, чтобы собрать прием пищи.
                </p>
              )}
            </div>
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet open={sheet === 'food'} title="Добавить питание" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Тип записи</label>
        <select
          className="input"
          value={foodForm.kind}
          onChange={event =>
            setFoodForm(prev => ({ ...prev, kind: event.target.value as typeof prev.kind }))
          }
        >
          <option value="product">Продукт</option>
          <option value="dish">Блюдо</option>
          <option value="free">Свободная запись</option>
          <option value="cheat">Читмил</option>
        </select>

        <label className="text-sm font-semibold text-slate-600">Приём пищи</label>
        <select
          className="input"
          value={foodForm.meal}
          onChange={event =>
            setFoodForm(prev => ({ ...prev, meal: event.target.value as typeof prev.meal }))
          }
        >
          {Object.entries(mealLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <label className="text-sm font-semibold text-slate-600">Время (опционально)</label>
        <input
          type="time"
          className="input"
          value={foodForm.time}
          onChange={event => setFoodForm(prev => ({ ...prev, time: event.target.value }))}
        />

        {foodForm.kind === 'product' && (
          <>
            <label className="text-sm font-semibold text-slate-600">Продукт</label>
            <select
              className="input"
              value={foodForm.refId}
              onChange={event => setFoodForm(prev => ({ ...prev, refId: event.target.value }))}
            >
              <option value="">Выберите продукт</option>
              {data.library.products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Граммы</label>
            <input
              type="number"
              className="input"
              value={foodForm.grams}
              onChange={event =>
                setFoodForm(prev => ({ ...prev, grams: Number(event.target.value) }))
              }
            />
            <div className="control-row">
              {data.library.products
                .find(product => product.id === foodForm.refId)
                ?.portionPresets?.map(preset => (
                  <button
                    key={preset.label}
                    className="btn-secondary"
                    onClick={() => setFoodForm(prev => ({ ...prev, grams: preset.grams }))}
                  >
                    {preset.label}
                  </button>
                ))}
              {data.presets.portions.map(preset => (
                <button
                  key={preset.label}
                  className="btn-secondary"
                  onClick={() => setFoodForm(prev => ({ ...prev, grams: preset.grams }))}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        )}

        {foodForm.kind === 'dish' && (
          <>
            <label className="text-sm font-semibold text-slate-600">Блюдо</label>
            <select
              className="input"
              value={foodForm.refId}
              onChange={event => setFoodForm(prev => ({ ...prev, refId: event.target.value }))}
            >
              <option value="">Выберите блюдо</option>
              {data.library.recipes.map(recipe => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Порции</label>
            <input
              type="number"
              className="input"
              value={foodForm.servings}
              onChange={event =>
                setFoodForm(prev => ({ ...prev, servings: Number(event.target.value) }))
              }
            />
          </>
        )}

        {(foodForm.kind === 'free' || foodForm.kind === 'cheat') && (
          <>
            <label className="text-sm font-semibold text-slate-600">Название</label>
            <input
              className="input"
              value={foodForm.title}
              onChange={event => setFoodForm(prev => ({ ...prev, title: event.target.value }))}
            />
            {foodForm.kind === 'cheat' ? (
              <>
                <label className="text-sm font-semibold text-slate-600">Категория читмила</label>
                <select
                  className="input"
                  value={foodForm.cheatCategory ?? 'pizza'}
                  onChange={event =>
                    setFoodForm(prev => ({
                      ...prev,
                      cheatCategory: event.target.value as FoodEntry['cheatCategory']
                    }))
                  }
                >
                  {Object.entries(cheatLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <label className="text-sm font-semibold text-slate-600">Калории</label>
            <input
              type="number"
              className="input"
              value={foodForm.kcalOverride}
              onChange={event =>
                setFoodForm(prev => ({ ...prev, kcalOverride: event.target.value }))
              }
            />
          </>
        )}

        <button
          className="btn-primary w-full"
          onClick={() => {
            addFoodEntry(selectedDate, {
              id: '',
              kind: foodForm.kind,
              refId: foodForm.refId || undefined,
              grams: foodForm.kind === 'product' ? foodForm.grams : undefined,
              servings: foodForm.kind === 'dish' ? foodForm.servings : undefined,
              meal: foodForm.meal,
              time: foodForm.time || undefined,
              title: foodForm.kind === 'free' || foodForm.kind === 'cheat' ? foodForm.title : undefined,
              kcalOverride:
                (foodForm.kind === 'free' || foodForm.kind === 'cheat') && foodForm.kcalOverride
                  ? Number(foodForm.kcalOverride)
                  : undefined,
              cheatCategory: foodForm.kind === 'cheat' ? foodForm.cheatCategory : undefined
            });
            setSheet(null);
          }}
        >
          Добавить
        </button>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'training'}
        title="Добавить тренировку"
        onClose={() => setSheet(null)}
      >
        <label className="text-sm font-semibold text-slate-600">Минуты</label>
        <input
          type="number"
          className="input"
          value={trainingForm.minutes}
          onChange={event =>
            setTrainingForm(prev => ({ ...prev, minutes: Number(event.target.value) }))
          }
        />
        <label className="text-sm font-semibold text-slate-600">Время</label>
        <input
          type="time"
          className="input"
          value={trainingForm.time}
          onChange={event => setTrainingForm(prev => ({ ...prev, time: event.target.value }))}
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            addTrainingLog({
              id: '',
              dateTime: toDateTime(selectedDate, trainingForm.time),
              type: 'workout',
              minutes: trainingForm.minutes,
              timeOfDay: getTimeOfDayFromTime(trainingForm.time)
            });
            setSheet(null);
          }}
        >
          Сохранить
        </button>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'movement'}
        title="Добавить движение"
        onClose={() => setSheet(null)}
      >
        <label className="text-sm font-semibold text-slate-600">Активность</label>
        <select
          className="input"
          value={movementForm.activityRef}
          onChange={event =>
            setMovementForm(prev => ({ ...prev, activityRef: event.target.value }))
          }
        >
          {data.library.movementActivities.map(activity => (
            <option key={activity.id} value={activity.id}>
              {activity.name}
            </option>
          ))}
        </select>
        <label className="text-sm font-semibold text-slate-600">Минуты</label>
        <input
          type="number"
          className="input"
          value={movementForm.durationMinutes}
          onChange={event =>
            setMovementForm(prev => ({ ...prev, durationMinutes: Number(event.target.value) }))
          }
        />
        {data.library.movementActivities.find(item => item.id === movementForm.activityRef)?.kind ===
        'stairs' ? (
          <>
            <label className="text-sm font-semibold text-slate-600">План пролетов</label>
            <input
              type="number"
              className="input"
              value={movementForm.plannedFlights}
              onChange={event =>
                setMovementForm(prev => ({ ...prev, plannedFlights: Number(event.target.value) }))
              }
            />
          </>
        ) : null}
        <label className="text-sm font-semibold text-slate-600">Время</label>
        <input
          type="time"
          className="input"
          value={movementForm.time}
          onChange={event => setMovementForm(prev => ({ ...prev, time: event.target.value }))}
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            addMovementSessionLog({
              id: '',
              dateTime: toDateTime(selectedDate, movementForm.time),
              activityRef: movementForm.activityRef || defaultMovementActivityId,
              durationMinutes: movementForm.durationMinutes,
              plannedFlights:
                data.library.movementActivities.find(
                  item => item.id === movementForm.activityRef
                )?.kind === 'stairs'
                  ? movementForm.plannedFlights
                  : undefined,
              timeOfDay: getTimeOfDayFromTime(movementForm.time)
            });
            setSheet(null);
          }}
        >
          Сохранить
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'smoking'} title="Добавить сигарету" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Количество</label>
        <input
          type="number"
          className="input"
          value={smokingForm.count}
          onChange={event => setSmokingForm(prev => ({ ...prev, count: Number(event.target.value) }))}
        />
        <label className="text-sm font-semibold text-slate-600">Триггер</label>
        <input
          className="input"
          value={smokingForm.trigger}
          onChange={event => setSmokingForm(prev => ({ ...prev, trigger: event.target.value }))}
        />
        <label className="text-sm font-semibold text-slate-600">Стресс (1-5)</label>
        <input
          type="number"
          min={1}
          max={5}
          className="input"
          value={smokingForm.stress}
          onChange={event => setSmokingForm(prev => ({ ...prev, stress: Number(event.target.value) }))}
        />
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={smokingForm.ruleApplied}
            onChange={event =>
              setSmokingForm(prev => ({ ...prev, ruleApplied: event.target.checked }))
            }
          />
          Правило применено
        </label>
        <label className="text-sm font-semibold text-slate-600">Время</label>
        <input
          type="time"
          className="input"
          value={smokingForm.time}
          onChange={event => setSmokingForm(prev => ({ ...prev, time: event.target.value }))}
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            addSmokingLog({
              id: '',
              dateTime: toDateTime(selectedDate, smokingForm.time),
              count: smokingForm.count,
              trigger: smokingForm.trigger,
              stressLevel1to5: smokingForm.stress,
              ruleApplied: smokingForm.ruleApplied
            });
            setSheet(null);
          }}
        >
          Сохранить
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'drink'} title="Добавить напиток" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Напиток</label>
        <select
          className="input"
          value={drinkForm.drinkId}
          onChange={event => {
            const nextId = event.target.value;
            const drink = data.library.drinks.find(item => item.id === nextId);
            const firstPortion = drink?.portions[0];
            setDrinkForm(prev => ({
              ...prev,
              drinkId: nextId,
              portionLabel: firstPortion?.label ?? '',
              portionMl: firstPortion?.ml ?? 0
            }));
          }}
        >
          <option value="">Выберите напиток</option>
          {data.library.drinks.map(drink => (
            <option key={drink.id} value={drink.id}>
              {drink.name}
            </option>
          ))}
        </select>
        <label className="text-sm font-semibold text-slate-600">Объем</label>
        <select
          className="input"
          value={drinkForm.portionLabel}
          onChange={event => {
            const drink = data.library.drinks.find(item => item.id === drinkForm.drinkId);
            const portion = drink?.portions.find(item => item.label === event.target.value);
            setDrinkForm(prev => ({
              ...prev,
              portionLabel: event.target.value,
              portionMl: portion?.ml ?? 0
            }));
          }}
          disabled={!drinkForm.drinkId}
        >
          <option value="">Выберите объем</option>
          {data.library.drinks
            .find(item => item.id === drinkForm.drinkId)
            ?.portions.map(portion => (
              <option key={portion.label} value={portion.label}>
                {portion.label}
              </option>
            ))}
        </select>
        <label className="text-sm font-semibold text-slate-600">Количество порций</label>
        <input
          type="number"
          min={1}
          className="input"
          value={drinkForm.portionsCount}
          onChange={event =>
            setDrinkForm(prev => ({ ...prev, portionsCount: Number(event.target.value) }))
          }
        />
        <label className="text-sm font-semibold text-slate-600">Время</label>
        <input
          type="time"
          className="input"
          value={drinkForm.time}
          onChange={event => setDrinkForm(prev => ({ ...prev, time: event.target.value }))}
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            if (!drinkForm.drinkId || !drinkForm.portionLabel || !drinkForm.portionMl) return;
            addDrinkLog({
              id: '',
              dateTime: toDateTime(selectedDate, drinkForm.time),
              drinkId: drinkForm.drinkId,
              portionLabel: drinkForm.portionLabel,
              portionMl: drinkForm.portionMl,
              portionsCount: drinkForm.portionsCount
            });
            setSheet(null);
          }}
        >
          Сохранить
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'weight'} title="Вес" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Вес (кг)</label>
        <input
          type="number"
          className="input"
          value={weightForm.weightKg}
          onChange={event =>
            setWeightForm(prev => ({ ...prev, weightKg: Number(event.target.value) }))
          }
        />
        <label className="text-sm font-semibold text-slate-600">Время</label>
        <input
          type="time"
          className="input"
          value={weightForm.time}
          onChange={event => setWeightForm(prev => ({ ...prev, time: event.target.value }))}
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            addWeightLog({
              id: '',
              dateTime: toDateTime(selectedDate, weightForm.time),
              weightKg: weightForm.weightKg
            });
            setSheet(null);
          }}
        >
          Сохранить
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'waist'} title="Талия" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Талия (см)</label>
        <input
          type="number"
          className="input"
          value={waistForm.waistCm}
          onChange={event =>
            setWaistForm(prev => ({ ...prev, waistCm: Number(event.target.value) }))
          }
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            addWaistLog({ id: '', date: selectedDate, waistCm: waistForm.waistCm });
            setSheet(null);
          }}
        >
          Сохранить
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'photo'} title="Добавить фото" onClose={() => setSheet(null)}>
        <label className="text-sm font-semibold text-slate-600">Тип</label>
        <select
          className="input"
          value={photoKind}
          onChange={event => setPhotoKind(event.target.value as 'front' | 'side')}
        >
          <option value="front">Фронт</option>
          <option value="side">Профиль</option>
        </select>
        <label className="text-sm font-semibold text-slate-600">Файл</label>
        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={event => setPhotoFile(event.target.files?.[0] ?? null)}
        />
        <button className="btn-primary w-full" onClick={savePhoto}>
          Сохранить фото
        </button>
      </BottomSheet>

      {runner && runnerProtocol && (
        <BottomSheet open={Boolean(runner)} title={runnerProtocol.name} onClose={() => setRunner(null)}>
          <WorkoutRunner
            protocol={runnerProtocol}
            exercises={data.library.exercises}
            onClose={() => setRunner(null)}
            onComplete={() => {
              const totalDurationSec = runnerProtocol.steps.reduce(
                (sum, step) => sum + (step.durationSec ?? 0),
                0
              );
              const completedMinutes = totalDurationSec
                ? Math.max(1, Math.round(totalDurationSec / 60))
                : 30;
              const completedAt = new Date().toISOString();
              addTrainingLog({
                id: '',
                dateTime: completedAt,
                type: 'workout',
                minutes: completedMinutes,
                timeOfDay: getTimeOfDayFromDateTime(completedAt)
              });
              updateData(state => {
                const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
                if (!plan) return { ...state };
                plan.workoutsPlan = plan.workoutsPlan.map(item =>
                  item.id === runner.id ? { ...item, completed: true } : item
                );
                return { ...state };
              });
            }}
          />
        </BottomSheet>
      )}

      {dayPlan ? (
        <div className="card p-4 text-xs text-slate-500">
          Плановые калории (по меню):{' '}
          {(() => {
            if (!dayPlan.mealsPlan) return '—';
            const meals = Object.values(dayPlan.mealsPlan).flat();
            const total = meals.reduce((sum, item) => {
              if (item.kind === 'product' && item.refId && item.plannedGrams) {
                const product = data.library.products.find(p => p.id === item.refId);
                if (!product) return sum;
                return sum + (product.kcalPer100g * item.plannedGrams) / 100;
              }
              if (item.kind === 'dish' && item.refId) {
                const dish = data.library.recipes.find(r => r.id === item.refId);
                if (!dish) return sum;
                const nutrition = calcRecipeNutrition(dish, data.library);
                return sum + nutrition.perServing.kcal * (item.plannedServings ?? 1);
              }
              return sum;
            }, 0);
            return `${total.toFixed(0)} ккал`;
          })()}
        </div>
      ) : null}
    </section>
  );
};

export default TodayPage;
