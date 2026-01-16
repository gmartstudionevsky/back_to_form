import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import { calcFoodEntry } from '../utils/nutrition';
import { todayISO } from '../utils/date';
import { ActivityLog, FoodEntry, SleepLog, SmokingLog, WaistLog, WeightLog } from '../types';

const tabs = ['Nutrition', 'Activity', 'Smoking', 'Measurements', 'Sleep'] as const;

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
    addActivityLog,
    updateActivityLog,
    deleteActivityLog,
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
  const [active, setActive] = useState<Tab>('Nutrition');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [foodSheet, setFoodSheet] = useState<FoodDraft | null>(null);
  const [foodQuery, setFoodQuery] = useState('');
  const [activityDraft, setActivityDraft] = useState<ActivityLog | null>(null);
  const [smokingDraft, setSmokingDraft] = useState<SmokingLog | null>(null);
  const [weightDraft, setWeightDraft] = useState<WeightLog | null>(null);
  const [waistDraft, setWaistDraft] = useState<WaistLog | null>(null);
  const [sleepDraft, setSleepDraft] = useState<SleepLog | null>(null);

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

  const activityLogs = data.logs.activity.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const smokingLogs = data.logs.smoking.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const weightLogs = data.logs.weight.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const waistLogs = data.logs.waist.filter(log => log.date === selectedDate);
  const sleepLogs = data.logs.sleep.filter(log => log.date === selectedDate);

  const toDateTime = (date: string, time: string) => {
    if (!time) return new Date().toISOString();
    return new Date(`${date}T${time}:00`).toISOString();
  };

  const openNewFood = () => {
    setFoodSheet({
      id: '',
      date: selectedDate,
      meal: 'breakfast',
      kind: 'product',
      refId: '',
      grams: 120,
      servings: 1,
      time: '',
      title: '',
      kcalOverrideText: ''
    });
  };

  const saveFood = () => {
    if (!foodSheet) return;
    const payload: FoodEntry = {
      id: foodSheet.id,
      kind: foodSheet.kind,
      refId: foodSheet.refId || undefined,
      grams: foodSheet.kind === 'product' ? foodSheet.grams : undefined,
      servings: foodSheet.kind === 'recipe' ? foodSheet.servings : undefined,
      meal: foodSheet.meal,
      time: foodSheet.time || undefined,
      title: foodSheet.kind === 'free' ? foodSheet.title : undefined,
      kcalOverride:
        foodSheet.kind === 'free' && foodSheet.kcalOverrideText
          ? Number(foodSheet.kcalOverrideText)
          : undefined,
      notes: foodSheet.notes
    };
    if (foodSheet.id) {
      updateFoodEntry(foodSheet.date, payload);
    } else {
      addFoodEntry(foodSheet.date, payload);
    }
    setFoodSheet(null);
  };

  const openActivity = (log?: ActivityLog) => {
    setActivityDraft(
      log ?? {
        id: '',
        dateTime: toDateTime(selectedDate, ''),
        type: 'stairs',
        minutes: 10,
        blocks: 1
      }
    );
  };

  const saveActivity = () => {
    if (!activityDraft) return;
    const payload = { ...activityDraft };
    if (activityDraft.id) {
      updateActivityLog(payload);
    } else {
      addActivityLog(payload);
    }
    setActivityDraft(null);
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
  const filteredRecipes = data.library.recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(foodQuery.toLowerCase())
  );

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Track</h1>
        <div className="flex gap-2 overflow-x-auto">
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

      {active === 'Nutrition' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Итог дня</h2>
              <button className="btn-primary" onClick={openNewFood}>
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
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {entry.kind === 'product'
                              ? data.library.products.find(prod => prod.id === entry.refId)?.name
                              : entry.kind === 'recipe'
                              ? data.library.recipes.find(rec => rec.id === entry.refId)?.name
                              : entry.title || 'Свободная запись'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {entry.time ? `${entry.time} · ` : ''}
                            {entry.grams ? `${entry.grams} г` : ''}
                            {entry.servings ? `${entry.servings} порц.` : ''}
                            {entry.kcalOverride ? `${entry.kcalOverride} ккал` : ''}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            className="btn-secondary"
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
                            className="btn-secondary text-red-500"
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

      {active === 'Activity' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">
                Итог: {activityLogs.reduce((sum, log) => sum + log.minutes, 0)} мин
              </h2>
              <button className="btn-primary" onClick={() => openActivity()}>
                Добавить
              </button>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-500">Логи</h3>
            <div className="mt-2 space-y-2">
              {activityLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Записей нет.</p>
              ) : (
                activityLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {log.type} · {log.minutes} мин
                      </p>
                      <div className="flex gap-2">
                        <button className="btn-secondary" onClick={() => openActivity(log)}>
                          Изменить
                        </button>
                        <button
                          className="btn-secondary text-red-500"
                          onClick={() => deleteActivityLog(log.id)}
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

      {active === 'Smoking' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">
                Итог: {smokingLogs.reduce((sum, log) => sum + log.count, 0)} шт
              </h2>
              <button className="btn-primary" onClick={() => openSmoking()}>
                Добавить
              </button>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-500">Логи</h3>
            <div className="mt-2 space-y-2">
              {smokingLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Записей нет.</p>
              ) : (
                smokingLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{log.count} шт</p>
                        <p className="text-xs text-slate-500">Триггер: {log.trigger}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-secondary" onClick={() => openSmoking(log)}>
                          Изменить
                        </button>
                        <button
                          className="btn-secondary text-red-500"
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

      {active === 'Measurements' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Вес</h2>
              <button className="btn-primary" onClick={() => openWeight()}>
                Добавить
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {weightLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Нет записей.</p>
              ) : (
                weightLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{log.weightKg} кг</p>
                      <div className="flex gap-2">
                        <button className="btn-secondary" onClick={() => openWeight(log)}>
                          Изменить
                        </button>
                        <button
                          className="btn-secondary text-red-500"
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
            <div className="flex items-center justify-between">
              <h2 className="section-title">Талия</h2>
              <button className="btn-primary" onClick={() => openWaist()}>
                Добавить
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {waistLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Нет записей.</p>
              ) : (
                waistLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{log.waistCm} см</p>
                      <div className="flex gap-2">
                        <button className="btn-secondary" onClick={() => openWaist(log)}>
                          Изменить
                        </button>
                        <button
                          className="btn-secondary text-red-500"
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

      {active === 'Sleep' && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Сон</h2>
              <button className="btn-primary" onClick={() => openSleep()}>
                Добавить
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {sleepLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Нет записей.</p>
              ) : (
                sleepLogs.map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {log.bedTime ?? '—'} → {log.wakeTime ?? '—'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Якорь: {log.anchorMet ? 'да' : 'нет'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-secondary" onClick={() => openSleep(log)}>
                          Изменить
                        </button>
                        <button
                          className="btn-secondary text-red-500"
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
              <option value="product">Продукт</option>
              <option value="recipe">Рецепт</option>
              <option value="free">Свободная</option>
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

            {foodSheet.kind !== 'free' && (
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
                <div className="flex flex-wrap gap-2">
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

            {foodSheet.kind === 'recipe' && (
              <>
                <label className="text-sm font-semibold text-slate-600">Рецепт</label>
                <select
                  className="input"
                  value={foodSheet.refId ?? ''}
                  onChange={event =>
                    setFoodSheet(prev => (prev ? { ...prev, refId: event.target.value } : prev))
                  }
                >
                  <option value="">Выберите рецепт</option>
                  {filteredRecipes.map(recipe => (
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

            {foodSheet.kind === 'free' && (
              <>
                <label className="text-sm font-semibold text-slate-600">Название</label>
                <input
                  className="input"
                  value={foodSheet.title ?? ''}
                  onChange={event =>
                    setFoodSheet(prev => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                />
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

            <button className="btn-primary" onClick={saveFood}>
              Сохранить
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(activityDraft)}
        title={activityDraft?.id ? 'Редактировать активность' : 'Добавить активность'}
        onClose={() => setActivityDraft(null)}
      >
        {activityDraft && (
          <>
            <label className="text-sm font-semibold text-slate-600">Тип</label>
            <select
              className="input"
              value={activityDraft.type}
              onChange={event =>
                setActivityDraft(prev =>
                  prev ? { ...prev, type: event.target.value as ActivityLog['type'] } : prev
                )
              }
            >
              <option value="stairs">Лестницы</option>
              <option value="march">Марш</option>
              <option value="workout">Тренировка</option>
            </select>
            <label className="text-sm font-semibold text-slate-600">Минуты</label>
            <input
              type="number"
              className="input"
              value={activityDraft.minutes}
              onChange={event =>
                setActivityDraft(prev =>
                  prev ? { ...prev, minutes: Number(event.target.value) } : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Дата и время</label>
            <input
              type="datetime-local"
              className="input"
              value={activityDraft.dateTime.slice(0, 16)}
              onChange={event =>
                setActivityDraft(prev =>
                  prev ? { ...prev, dateTime: new Date(event.target.value).toISOString() } : prev
                )
              }
            />
            <button className="btn-primary" onClick={saveActivity}>
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
            <label className="text-sm font-semibold text-slate-600">Правило применено</label>
            <button
              className="btn-secondary"
              onClick={() =>
                setSmokingDraft(prev => (prev ? { ...prev, ruleApplied: !prev.ruleApplied } : prev))
              }
            >
              {smokingDraft.ruleApplied ? 'Да' : 'Нет'}
            </button>
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
            <button className="btn-primary" onClick={saveSmoking}>
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
            <button className="btn-primary" onClick={saveWeight}>
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
            <button className="btn-primary" onClick={saveWaist}>
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
            <label className="text-sm font-semibold text-slate-600">Якорь выполнен</label>
            <button
              className="btn-secondary"
              onClick={() =>
                setSleepDraft(prev => (prev ? { ...prev, anchorMet: !prev.anchorMet } : prev))
              }
            >
              {sleepDraft.anchorMet ? 'Да' : 'Нет'}
            </button>
            <button className="btn-primary" onClick={saveSleep}>
              Сохранить
            </button>
          </>
        )}
      </BottomSheet>
    </section>
  );
};

export default TrackPage;
