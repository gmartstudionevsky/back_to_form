import { useMemo, useState, useEffect } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import { calcFoodEntry, calcRecipeNutrition } from '../utils/nutrition';
import { todayISO } from '../utils/date';
import { getTimeOfDayFromDateTime, timeOfDayLabels } from '../utils/timeOfDay';
import {
  ActivityLog,
  FoodEntry,
  SleepLog,
  SmokingLog,
  WaistLog,
  WeightLog,
  MovementSessionLog
} from '../types';

const tabs = ['Питание', 'Тренировки', 'Движение', 'Курение', 'Измерения', 'Сон'] as const;

type Tab = (typeof tabs)[number];

type FoodDraft = FoodEntry & {
  date: string;
  kcalOverrideText?: string;
};

const mealLabels: Record<FoodEntry['meal'], string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const TrackPage = () => {
  const {
    data,
    addFoodEntry,
    updateFoodEntry,
    deleteFoodEntry,
    addTrainingLog,
    updateTrainingLog,
    deleteTrainingLog,
    addMovementSessionLog,
    updateMovementSessionLog,
    deleteMovementSessionLog,
    setMovementDayLog,
    addSmokingLog,
    updateSmokingLog,
    deleteSmokingLog,
    addWeightLog,
    updateWeightLog,
    deleteWeightLog,
    addWaistLog,
    updateWaistLog,
    deleteWaistLog,
    addSleepLog,
    updateSleepLog,
    deleteSleepLog
  } = useAppStore();
  const [active, setActive] = useState<Tab>('Питание');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [foodSheet, setFoodSheet] = useState<FoodDraft | null>(null);
  const [foodQuery, setFoodQuery] = useState('');
  const [trainingDraft, setTrainingDraft] = useState<ActivityLog | null>(null);
  const [movementDraft, setMovementDraft] = useState<MovementSessionLog | null>(null);
  const [smokingDraft, setSmokingDraft] = useState<SmokingLog | null>(null);
  const [weightDraft, setWeightDraft] = useState<WeightLog | null>(null);
  const [waistDraft, setWaistDraft] = useState<WaistLog | null>(null);
  const [sleepDraft, setSleepDraft] = useState<SleepLog | null>(null);
  const [movementSteps, setMovementSteps] = useState(0);

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

  const plannedMeals = dayPlan?.mealsPlan;
  const plannedMealItems = plannedMeals ? Object.values(plannedMeals).flat() : [];
  const plannedKcal = plannedMealItems.reduce((sum, item) => {
    if (item.kind === 'product' && item.refId && item.plannedGrams) {
      const product = data.library.products.find(prod => prod.id === item.refId);
      if (!product) return sum;
      return sum + (product.kcalPer100g * item.plannedGrams) / 100;
    }
    if (item.kind === 'dish' && item.refId) {
      const dish = data.library.recipes.find(rec => rec.id === item.refId);
      if (!dish) return sum;
      const nutrition = calcRecipeNutrition(dish, data.library);
      return sum + nutrition.perServing.kcal * (item.plannedServings ?? 1);
    }
    return sum;
  }, 0);
  const plannedDone = plannedMealItems.filter(item => item.completed).length;
  const plannedCompletion = plannedMealItems.length
    ? Math.round((plannedDone / plannedMealItems.length) * 100)
    : 0;

  const groupedFood = useMemo(() => {
    const entries = foodDay?.entries ?? [];
    const groups = new Map<FoodEntry['meal'], FoodEntry[]>();
    entries.forEach(entry => {
      const key = entry.meal;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(entry);
    });
    groups.forEach(value => value.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')));
    const order: FoodEntry['meal'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
    return order
      .filter(meal => groups.has(meal))
      .map(meal => [meal, groups.get(meal) ?? []] as [FoodEntry['meal'], FoodEntry[]]);
  }, [foodDay]);

  const trainingLogs = data.logs.training.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const smokingLogs = data.logs.smoking.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const weightLogs = data.logs.weight.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const waistLogs = data.logs.waist.filter(log => log.date === selectedDate);
  const sleepLogs = data.logs.sleep.filter(log => log.date === selectedDate);

  const toDateTime = (date: string, time: string) => {
    if (!time) return new Date().toISOString();
    return new Date(`${date}T${time}:00`).toISOString();
  };

  const movementDay = data.logs.movementDays.find(day => day.date === selectedDate);
  const movementSessions = data.logs.movementSessions.filter(
    log => log.dateTime.slice(0, 10) === selectedDate
  );
  const defaultMovementActivityId = data.library.movementActivities[0]?.id ?? '';

  useEffect(() => {
    setMovementSteps(movementDay?.steps ?? 0);
  }, [movementDay?.steps, selectedDate]);


  const openNewFood = () => {
    setFoodSheet({
      id: '',
      date: selectedDate,
      meal: 'breakfast',
      kind: 'dish',
      refId: '',
      grams: 120,
      servings: 1,
      time: '',
      title: '',
      kcalOverrideText: '',
      cheatCategory: 'pizza'
    });
  };

  const saveFood = () => {
    if (!foodSheet) return;
    const payload: FoodEntry = {
      id: foodSheet.id,
      kind: foodSheet.kind,
      refId: foodSheet.refId || undefined,
      grams: foodSheet.kind === 'product' ? foodSheet.grams : undefined,
      servings: foodSheet.kind === 'dish' ? foodSheet.servings : undefined,
      meal: foodSheet.meal,
      time: foodSheet.time || undefined,
      title: foodSheet.kind === 'free' || foodSheet.kind === 'cheat' ? foodSheet.title : undefined,
      kcalOverride:
        (foodSheet.kind === 'free' || foodSheet.kind === 'cheat') && foodSheet.kcalOverrideText
          ? Number(foodSheet.kcalOverrideText)
          : undefined,
      notes: foodSheet.notes,
      cheatCategory: foodSheet.kind === 'cheat' ? foodSheet.cheatCategory : undefined
    };
    if (foodSheet.id) {
      updateFoodEntry(foodSheet.date, payload);
    } else {
      addFoodEntry(foodSheet.date, payload);
    }
    setFoodSheet(null);
  };

  const openTraining = (log?: ActivityLog) => {
    setTrainingDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate, ''),
        type: 'workout',
        minutes: 45,
        timeOfDay: getTimeOfDayFromDateTime(new Date().toISOString())
      }
    );
  };

  const saveTraining = () => {
    if (!trainingDraft) return;
    const payload = {
      ...trainingDraft,
      timeOfDay: getTimeOfDayFromDateTime(trainingDraft.dateTime)
    };
    if (trainingDraft.id) {
      updateTrainingLog(payload);
    } else {
      addTrainingLog(payload);
    }
    setTrainingDraft(null);
  };

  const openMovement = (log?: MovementSessionLog) => {
    const activityRef = log?.activityRef ?? defaultMovementActivityId ?? '';
    setMovementDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate, ''),
        activityRef,
        durationMinutes: 20,
        plannedFlights: 10,
        timeOfDay: getTimeOfDayFromDateTime(new Date().toISOString())
      }
    );
  };

  const saveMovement = () => {
    if (!movementDraft) return;
    const payload = {
      ...movementDraft,
      timeOfDay: getTimeOfDayFromDateTime(movementDraft.dateTime)
    };
    if (movementDraft.id) {
      updateMovementSessionLog(payload);
    } else {
      addMovementSessionLog(payload);
    }
    setMovementDraft(null);
  };

  const openSmoking = (log?: SmokingLog) => {
    setSmokingDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate, ''),
        count: 1,
        trigger: 'стресс',
        stressLevel1to5: 3,
        ruleApplied: false
      }
    );
  };

  const saveSmoking = () => {
    if (!smokingDraft) return;
    const payload = { ...smokingDraft };
    if (smokingDraft.id) {
      updateSmokingLog(payload);
    } else {
      addSmokingLog(payload);
    }
    setSmokingDraft(null);
  };

  const openWeight = (log?: WeightLog) => {
    setWeightDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate, ''),
        weightKg: 72
      }
    );
  };

  const saveWeight = () => {
    if (!weightDraft) return;
    const payload = { ...weightDraft };
    if (weightDraft.id) {
      updateWeightLog(payload);
    } else {
      addWeightLog(payload);
    }
    setWeightDraft(null);
  };

  const openWaist = (log?: WaistLog) => {
    setWaistDraft(
      log ?? {
        id: '',
        date: selectedDate,
        waistCm: 80
      }
    );
  };

  const saveWaist = () => {
    if (!waistDraft) return;
    const payload = { ...waistDraft };
    if (waistDraft.id) {
      updateWaistLog(payload);
    } else {
      addWaistLog(payload);
    }
    setWaistDraft(null);
  };

  const openSleep = (log?: SleepLog) => {
    setSleepDraft(
      log ?? {
        id: '',
        date: selectedDate,
        wakeTime: '07:30',
        bedTime: '23:00',
        anchorMet: false
      }
    );
  };

  const saveSleep = () => {
    if (!sleepDraft) return;
    const payload = { ...sleepDraft };
    if (sleepDraft.id) {
      updateSleepLog(payload);
    } else {
      addSleepLog(payload);
    }
    setSleepDraft(null);
  };

  const filteredProducts = data.library.products.filter(product =>
    product.name.toLowerCase().includes(foodQuery.toLowerCase())
  );
  const filteredDishes = data.library.recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(foodQuery.toLowerCase())
  );

  const plannedWorkouts = dayPlan?.workoutsPlan ?? [];
  const plannedWorkoutCount = plannedWorkouts.filter(
    item => item.kind === 'workout' || item.protocolRef
  ).length;
  const plannedMovementMinutes = plannedWorkouts
    .filter(item => item.kind === 'movement')
    .reduce((sum, item) => sum + (item.plannedMinutes ?? 0), 0);
  const completedWorkoutCount = plannedWorkouts.filter(item => item.completed).length;
  const actualWorkoutCount = trainingLogs.length;
  const actualMovementMinutes = movementSessions.reduce(
    (sum, log) => sum + log.durationMinutes,
    0
  );

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Трекер</h1>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                active === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setActive(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="card p-4">
        <label className="text-sm font-semibold text-slate-600">Дата</label>
        <input
          type="date"
          value={selectedDate}
          onChange={event => setSelectedDate(event.target.value)}
          className="input mt-2"
        />
      </div>

      {active === 'Питание' && (
        <div className="space-y-3">
          <div className="card p-4">
            <h2 className="section-title">План vs факт</h2>
            <p className="mt-2 text-sm text-slate-600">
              План: {plannedKcal.toFixed(0)} ккал · Факт: {totals.kcal.toFixed(0)} ккал
            </p>
            <p className="text-xs text-slate-500">
              Выполнено: {plannedDone}/{plannedMealItems.length} ({plannedCompletion}%)
            </p>
          </div>
          <div className="card p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">Итог дня</h2>
            <button className="btn-primary w-full sm:w-auto" onClick={openNewFood}>
              Добавить запись
            </button>
          </div>
            <p className="mt-2 text-sm text-slate-600">
              Калории: {totals.kcal.toFixed(0)} | Б: {totals.protein.toFixed(1)} г | Ж:{' '}
              {totals.fat.toFixed(1)} г | У: {totals.carb.toFixed(1)} г
            </p>
          </div>
          {groupedFood.length === 0 ? (
            <div className="card p-4 text-sm text-slate-500">Записей нет.</div>
          ) : (
            groupedFood.map(([meal, entries]) => (
              <div key={meal} className="card p-4">
                <h3 className="text-sm font-semibold text-slate-500">{mealLabels[meal]}</h3>
                <div className="mt-3 space-y-2">
                  {entries.map(entry => (
                    <div key={entry.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {entry.kind === 'product'
                              ? data.library.products.find(prod => prod.id === entry.refId)?.name
                              : entry.kind === 'dish'
                              ? data.library.recipes.find(rec => rec.id === entry.refId)?.name
                              : entry.title || (entry.kind === 'cheat' ? 'Читмил' : 'Свободная запись')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {entry.time ? `${entry.time} · ` : ''}
                            {entry.grams ? `${entry.grams} г` : ''}
                            {entry.servings ? `${entry.servings} порц.` : ''}
                            {entry.kcalOverride ? `${entry.kcalOverride} ккал` : ''}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            className="btn-secondary w-full sm:w-auto"
                            onClick={() =>
                              setFoodSheet({
                                ...entry,
                                date: selectedDate,
                                kcalOverrideText: entry.kcalOverride?.toString() ?? ''
                              })
                            }
                          >
                            Изменить
                          </button>
                          <button
                            className="btn-secondary w-full text-red-500 sm:w-auto"
                            onClick={() => deleteFoodEntry(selectedDate, entry.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {active === 'Тренировки' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">
                Итог: {trainingLogs.reduce((sum, log) => sum + log.minutes, 0)} мин
              </h2>
              <button className="btn-primary w-full sm:w-auto" onClick={() => openTraining()}>
                Добавить тренировку
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              План: тренировки {plannedWorkoutCount}, движение {plannedMovementMinutes} мин
            </p>
            <p className="text-xs text-slate-500">
              Факт: тренировки {actualWorkoutCount}, движение {actualMovementMinutes} мин ·
              Закрыто по плану: {completedWorkoutCount}
            </p>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-500">Логи тренировок</h3>
            <div className="mt-2 space-y-2">
              {trainingLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Записей нет.</p>
              ) : (
                trainingLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          Тренировка · {log.minutes} мин
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(log.dateTime).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}{' '}
                          · {timeOfDayLabels[log.timeOfDay ?? getTimeOfDayFromDateTime(log.dateTime)]}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button className="btn-secondary w-full sm:w-auto" onClick={() => openTraining(log)}>
                          Изменить
                        </button>
                        <button
                          className="btn-secondary w-full text-red-500 sm:w-auto"
                          onClick={() => deleteTrainingLog(log.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {active === 'Движение' && (
        <div className="space-y-3">
          <div className="card space-y-4 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">Движение</h2>
              <button className="btn-secondary w-full sm:w-auto" onClick={() => openMovement()}>
                Добавить вручную
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Шаги за день</p>
                  <p className="text-xs text-slate-500">Факт: {movementSteps} шагов</p>
                </div>
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={() => setMovementDayLog({ date: selectedDate, steps: movementSteps })}
                >
                  Сохранить шаги
                </button>
              </div>
              <input
                type="number"
                className="input mt-2"
                value={movementSteps}
                onChange={event => setMovementSteps(Number(event.target.value))}
                placeholder="Количество шагов"
              />
              <p className="mt-2 text-xs text-slate-500">
                Укажите итоговое количество шагов за день.
              </p>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-500">Сессии движения</h3>
            <div className="mt-2 space-y-2">
              {movementSessions.length === 0 ? (
                <p className="text-sm text-slate-500">Записей нет.</p>
              ) : (
                movementSessions.map(log => {
                  const activity = data.library.movementActivities.find(
                    item => item.id === log.activityRef
                  );
                  return (
                    <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {activity?.name ?? 'Движение'} · {log.durationMinutes} мин
                          </p>
                          <p className="text-xs text-slate-500">
                            {log.distanceKm ? `Дистанция: ${log.distanceKm} км · ` : ''}
                            {log.plannedFlights ? `Пролеты: ${log.plannedFlights}` : ''}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(log.dateTime).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}{' '}
                            ·{' '}
                            {timeOfDayLabels[log.timeOfDay ?? getTimeOfDayFromDateTime(log.dateTime)]}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button className="btn-secondary w-full sm:w-auto" onClick={() => openMovement(log)}>
                            Изменить
                          </button>
                          <button
                            className="btn-secondary w-full text-red-500 sm:w-auto"
                            onClick={() => deleteMovementSessionLog(log.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {active === 'Курение' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">
                Итог: {smokingLogs.reduce((sum, log) => sum + log.count, 0)} шт
              </h2>
              <button className="btn-primary w-full sm:w-auto" onClick={() => openSmoking()}>
                Добавить
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Цель: {dayPlan?.requirements?.smokingTargetMax ?? '—'} шт
            </p>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-500">Логи</h3>
            <div className="mt-2 space-y-2">
              {smokingLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Записей нет.</p>
              ) : (
                smokingLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{log.count} шт</p>
                        <p className="text-xs text-slate-500">Триггер: {log.trigger}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button className="btn-secondary w-full sm:w-auto" onClick={() => openSmoking(log)}>
                          Изменить
                        </button>
                        <button
                          className="btn-secondary w-full text-red-500 sm:w-auto"
                          onClick={() => deleteSmokingLog(log.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {active === 'Измерения' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">Вес</h2>
              <button className="btn-primary w-full sm:w-auto" onClick={() => openWeight()}>
                Добавить
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {weightLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Нет записей.</p>
              ) : (
                weightLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold">{log.weightKg} кг</p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button className="btn-secondary w-full sm:w-auto" onClick={() => openWeight(log)}>
                          Изменить
                        </button>
                        <button
                          className="btn-secondary w-full text-red-500 sm:w-auto"
                          onClick={() => deleteWeightLog(log.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">Талия</h2>
              <button className="btn-primary w-full sm:w-auto" onClick={() => openWaist()}>
                Добавить
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {waistLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Нет записей.</p>
              ) : (
                waistLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold">{log.waistCm} см</p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button className="btn-secondary w-full sm:w-auto" onClick={() => openWaist(log)}>
                          Изменить
                        </button>
                        <button
                          className="btn-secondary w-full text-red-500 sm:w-auto"
                          onClick={() => deleteWaistLog(log.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {active === 'Сон' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">Сон</h2>
              <button className="btn-primary w-full sm:w-auto" onClick={() => openSleep()}>
                Добавить
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {sleepLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Нет записей.</p>
              ) : (
                sleepLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {log.bedTime ?? '—'} → {log.wakeTime ?? '—'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Якорь: {log.anchorMet ? 'да' : 'нет'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button className="btn-secondary w-full sm:w-auto" onClick={() => openSleep(log)}>
                          Изменить
                        </button>
                        <button
                          className="btn-secondary w-full text-red-500 sm:w-auto"
                          onClick={() => deleteSleepLog(log.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <BottomSheet
        open={Boolean(foodSheet)}
        title={foodSheet?.id ? 'Редактировать питание' : 'Добавить питание'}
        onClose={() => setFoodSheet(null)}
      >
        {foodSheet && (
          <>
            <label className="text-sm font-semibold text-slate-600">Тип записи</label>
            <select
              className="input"
              value={foodSheet.kind}
              onChange={event =>
                setFoodSheet(prev =>
                  prev ? { ...prev, kind: event.target.value as FoodEntry['kind'] } : prev
                )
              }
            >
              <option value="dish">Блюдо</option>
              <option value="product">Продукт</option>
              <option value="free">Свободная</option>
              <option value="cheat">Читмил</option>
            </select>

            <label className="text-sm font-semibold text-slate-600">Приём пищи</label>
            <select
              className="input"
              value={foodSheet.meal}
              onChange={event =>
                setFoodSheet(prev =>
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

            <label className="text-sm font-semibold text-slate-600">Время</label>
            <input
              type="time"
              className="input"
              value={foodSheet.time ?? ''}
              onChange={event =>
                setFoodSheet(prev => (prev ? { ...prev, time: event.target.value } : prev))
              }
            />

            {foodSheet.kind !== 'free' && foodSheet.kind !== 'cheat' && (
              <>
                <label className="text-sm font-semibold text-slate-600">Поиск</label>
                <input
                  className="input"
                  value={foodQuery}
                  onChange={event => setFoodQuery(event.target.value)}
                  placeholder="Название"
                />
              </>
            )}

            {foodSheet.kind === 'product' && (
              <>
                <label className="text-sm font-semibold text-slate-600">Продукт</label>
                <select
                  className="input"
                  value={foodSheet.refId ?? ''}
                  onChange={event =>
                    setFoodSheet(prev => (prev ? { ...prev, refId: event.target.value } : prev))
                  }
                >
                  <option value="">Выберите продукт</option>
                  {filteredProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <label className="text-sm font-semibold text-slate-600">Граммы</label>
                <input
                  type="number"
                  className="input"
                  value={foodSheet.grams ?? 0}
                  onChange={event =>
                    setFoodSheet(prev =>
                      prev ? { ...prev, grams: Number(event.target.value) } : prev
                    )
                  }
                />
                <div className="control-row">
                  {data.library.products
                    .find(product => product.id === foodSheet.refId)
                    ?.portionPresets?.map(preset => (
                      <button
                        key={preset.label}
                        className="btn-secondary"
                        onClick={() =>
                          setFoodSheet(prev => (prev ? { ...prev, grams: preset.grams } : prev))
                        }
                      >
                        {preset.label}
                      </button>
                    ))}
                  {data.presets.portions.map(preset => (
                    <button
                      key={preset.label}
                      className="btn-secondary"
                      onClick={() =>
                        setFoodSheet(prev => (prev ? { ...prev, grams: preset.grams } : prev))
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {foodSheet.kind === 'dish' && (
              <>
                <label className="text-sm font-semibold text-slate-600">Блюдо</label>
                <select
                  className="input"
                  value={foodSheet.refId ?? ''}
                  onChange={event =>
                    setFoodSheet(prev => (prev ? { ...prev, refId: event.target.value } : prev))
                  }
                >
                  <option value="">Выберите блюдо</option>
                  {filteredDishes.map(recipe => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
                <label className="text-sm font-semibold text-slate-600">Порции</label>
                <input
                  type="number"
                  className="input"
                  value={foodSheet.servings ?? 1}
                  onChange={event =>
                    setFoodSheet(prev =>
                      prev ? { ...prev, servings: Number(event.target.value) } : prev
                    )
                  }
                />
              </>
            )}

            {(foodSheet.kind === 'free' || foodSheet.kind === 'cheat') && (
              <>
                <label className="text-sm font-semibold text-slate-600">Название</label>
                <input
                  className="input"
                  value={foodSheet.title ?? ''}
                  onChange={event =>
                    setFoodSheet(prev => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                />
                {foodSheet.kind === 'cheat' ? (
                  <>
                    <label className="text-sm font-semibold text-slate-600">Категория читмила</label>
                    <select
                      className="input"
                      value={foodSheet.cheatCategory ?? 'pizza'}
                      onChange={event =>
                        setFoodSheet(prev =>
                          prev
                            ? {
                                ...prev,
                                cheatCategory: event.target.value as FoodEntry['cheatCategory']
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
                  </>
                ) : null}
                <label className="text-sm font-semibold text-slate-600">Калории</label>
                <input
                  type="number"
                  className="input"
                  value={foodSheet.kcalOverrideText ?? ''}
                  onChange={event =>
                    setFoodSheet(prev =>
                      prev ? { ...prev, kcalOverrideText: event.target.value } : prev
                    )
                  }
                />
              </>
            )}

            <button className="btn-primary w-full" onClick={saveFood}>
              Сохранить
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(trainingDraft)}
        title={trainingDraft?.id ? 'Редактировать тренировку' : 'Добавить тренировку'}
        onClose={() => setTrainingDraft(null)}
      >
        {trainingDraft && (
          <>
            <label className="text-sm font-semibold text-slate-600">Минуты</label>
            <input
              type="number"
              className="input"
              value={trainingDraft.minutes}
              onChange={event =>
                setTrainingDraft(prev =>
                  prev ? { ...prev, minutes: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Дата и время</label>
            <input
              type="datetime-local"
              className="input"
              value={trainingDraft.dateTime.slice(0, 16)}
              onChange={event =>
                setTrainingDraft(prev =>
                  prev ? { ...prev, dateTime: new Date(event.target.value).toISOString() } : prev
                )
              }
            />
            <p className="text-xs text-slate-500">
              Время суток: {timeOfDayLabels[getTimeOfDayFromDateTime(trainingDraft.dateTime)]}
            </p>
            <button className="btn-primary w-full" onClick={saveTraining}>
              Сохранить
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(movementDraft)}
        title={movementDraft?.id ? 'Редактировать движение' : 'Добавить движение'}
        onClose={() => setMovementDraft(null)}
      >
        {movementDraft && (
          <>
            <label className="text-sm font-semibold text-slate-600">Активность</label>
            <select
              className="input"
              value={movementDraft.activityRef}
              onChange={event =>
                setMovementDraft(prev =>
                  prev ? { ...prev, activityRef: event.target.value } : prev
                )
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
              value={movementDraft.durationMinutes}
              onChange={event =>
                setMovementDraft(prev =>
                  prev ? { ...prev, durationMinutes: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Дистанция (км)</label>
            <input
              type="number"
              className="input"
              value={movementDraft.distanceKm ?? 0}
              onChange={event =>
                setMovementDraft(prev =>
                  prev ? { ...prev, distanceKm: Number(event.target.value) } : prev
                )
              }
            />
            {data.library.movementActivities.find(item => item.id === movementDraft.activityRef)
              ?.kind === 'stairs' ? (
              <>
                <label className="text-sm font-semibold text-slate-600">План пролетов</label>
                <input
                  type="number"
                  className="input"
                  value={movementDraft.plannedFlights ?? 0}
                  onChange={event =>
                    setMovementDraft(prev =>
                      prev ? { ...prev, plannedFlights: Number(event.target.value) } : prev
                    )
                  }
                />
                <label className="text-sm font-semibold text-slate-600">Фактически пройдено</label>
                <input
                  type="number"
                  className="input"
                  value={movementDraft.actualFlights ?? 0}
                  onChange={event =>
                    setMovementDraft(prev =>
                      prev ? { ...prev, actualFlights: Number(event.target.value) } : prev
                    )
                  }
                />
              </>
            ) : null}
            <label className="text-sm font-semibold text-slate-600">Дата и время</label>
            <input
              type="datetime-local"
              className="input"
              value={movementDraft.dateTime.slice(0, 16)}
              onChange={event =>
                setMovementDraft(prev =>
                  prev ? { ...prev, dateTime: new Date(event.target.value).toISOString() } : prev
                )
              }
            />
            <p className="text-xs text-slate-500">
              Время суток: {timeOfDayLabels[getTimeOfDayFromDateTime(movementDraft.dateTime)]}
            </p>
            <button className="btn-primary w-full" onClick={saveMovement}>
              Сохранить
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(smokingDraft)}
        title={smokingDraft?.id ? 'Редактировать курение' : 'Добавить курение'}
        onClose={() => setSmokingDraft(null)}
      >
        {smokingDraft && (
          <>
            <label className="text-sm font-semibold text-slate-600">Количество</label>
            <input
              type="number"
              className="input"
              value={smokingDraft.count}
              onChange={event =>
                setSmokingDraft(prev =>
                  prev ? { ...prev, count: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Триггер</label>
            <input
              className="input"
              value={smokingDraft.trigger}
              onChange={event =>
                setSmokingDraft(prev => (prev ? { ...prev, trigger: event.target.value } : prev))
              }
            />
            <label className="text-sm font-semibold text-slate-600">Стресс (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              className="input"
              value={smokingDraft.stressLevel1to5 ?? 3}
              onChange={event =>
                setSmokingDraft(prev =>
                  prev
                    ? { ...prev, stressLevel1to5: Number(event.target.value) }
                    : prev
                )
              }
            />
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={smokingDraft.ruleApplied}
                onChange={event =>
                  setSmokingDraft(prev =>
                    prev ? { ...prev, ruleApplied: event.target.checked } : prev
                  )
                }
              />
              Правило применено
            </label>
            <label className="text-sm font-semibold text-slate-600">Дата и время</label>
            <input
              type="datetime-local"
              className="input"
              value={smokingDraft.dateTime.slice(0, 16)}
              onChange={event =>
                setSmokingDraft(prev =>
                  prev ? { ...prev, dateTime: new Date(event.target.value).toISOString() } : prev
                )
              }
            />
            <button className="btn-primary w-full" onClick={saveSmoking}>
              Сохранить
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(weightDraft)}
        title={weightDraft?.id ? 'Редактировать вес' : 'Добавить вес'}
        onClose={() => setWeightDraft(null)}
      >
        {weightDraft && (
          <>
            <label className="text-sm font-semibold text-slate-600">Вес (кг)</label>
            <input
              type="number"
              className="input"
              value={weightDraft.weightKg}
              onChange={event =>
                setWeightDraft(prev =>
                  prev ? { ...prev, weightKg: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Дата и время</label>
            <input
              type="datetime-local"
              className="input"
              value={weightDraft.dateTime.slice(0, 16)}
              onChange={event =>
                setWeightDraft(prev =>
                  prev ? { ...prev, dateTime: new Date(event.target.value).toISOString() } : prev
                )
              }
            />
            <button className="btn-primary w-full" onClick={saveWeight}>
              Сохранить
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(waistDraft)}
        title={waistDraft?.id ? 'Редактировать талию' : 'Добавить талию'}
        onClose={() => setWaistDraft(null)}
      >
        {waistDraft && (
          <>
            <label className="text-sm font-semibold text-slate-600">Талия (см)</label>
            <input
              type="number"
              className="input"
              value={waistDraft.waistCm}
              onChange={event =>
                setWaistDraft(prev =>
                  prev ? { ...prev, waistCm: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Дата</label>
            <input
              type="date"
              className="input"
              value={waistDraft.date}
              onChange={event =>
                setWaistDraft(prev => (prev ? { ...prev, date: event.target.value } : prev))
              }
            />
            <button className="btn-primary w-full" onClick={saveWaist}>
              Сохранить
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(sleepDraft)}
        title={sleepDraft?.id ? 'Редактировать сон' : 'Добавить сон'}
        onClose={() => setSleepDraft(null)}
      >
        {sleepDraft && (
          <>
            <label className="text-sm font-semibold text-slate-600">Отбой</label>
            <input
              type="time"
              className="input"
              value={sleepDraft.bedTime ?? ''}
              onChange={event =>
                setSleepDraft(prev => (prev ? { ...prev, bedTime: event.target.value } : prev))
              }
            />
            <label className="text-sm font-semibold text-slate-600">Подъём</label>
            <input
              type="time"
              className="input"
              value={sleepDraft.wakeTime ?? ''}
              onChange={event =>
                setSleepDraft(prev => (prev ? { ...prev, wakeTime: event.target.value } : prev))
              }
            />
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={sleepDraft.anchorMet}
                onChange={event =>
                  setSleepDraft(prev =>
                    prev ? { ...prev, anchorMet: event.target.checked } : prev
                  )
                }
              />
              Якорь выполнен
            </label>
            <button className="btn-primary w-full" onClick={saveSleep}>
              Сохранить
            </button>
          </>
        )}
      </BottomSheet>
    </section>
  );
};

export default TrackPage;
