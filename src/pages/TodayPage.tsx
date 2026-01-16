import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { WorkoutRunner } from '../components/WorkoutRunner';
import { savePhotoBlob } from '../storage/photoDb';
import { useAppStore } from '../store/useAppStore';
import { formatDate, todayISO } from '../utils/date';
import { calcFoodEntry, calcRecipeNutrition } from '../utils/nutrition';
import { FoodEntry, MealPlanItem, WorkoutPlanItem } from '../types';
import { useNavigate } from 'react-router-dom';

const mealLabels: Record<FoodEntry['meal'], string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const timeLabels: Record<WorkoutPlanItem['timeOfDay'], string> = {
  morning: 'Утро',
  day: 'День',
  evening: 'Вечер'
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

const TodayPage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [sheet, setSheet] = useState<
    'food' | 'activity' | 'smoking' | 'weight' | 'waist' | 'photo' | 'plan' | null
  >(null);
  const [photoKind, setPhotoKind] = useState<'front' | 'side'>('front');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [runner, setRunner] = useState<WorkoutPlanItem | null>(null);
  const [runnerProtocolId, setRunnerProtocolId] = useState<string | null>(null);
  const [mealSheet, setMealSheet] = useState<FoodEntry['meal'] | null>(null);
  const [mealSearch, setMealSearch] = useState('');
  const [mealRefId, setMealRefId] = useState('');
  const [mealKind, setMealKind] = useState<'dish' | 'product' | 'free' | 'cheat'>('dish');
  const [mealAmount, setMealAmount] = useState({ grams: 150, servings: 1 });
  const [mealTitle, setMealTitle] = useState('');
  const [mealCheatCategory, setMealCheatCategory] = useState<FoodEntry['cheatCategory']>('pizza');
  const [newDish, setNewDish] = useState({
    name: '',
    servings: 1,
    category: 'main' as const
  });

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
  const [activityForm, setActivityForm] = useState({
    type: 'stairs' as const,
    minutes: 10,
    time: ''
  });
  const [smokingForm, setSmokingForm] = useState({
    count: 1,
    trigger: 'стресс',
    stress: 3,
    ruleApplied: false,
    time: ''
  });
  const [weightForm, setWeightForm] = useState({ weightKg: 72, time: '' });
  const [waistForm, setWaistForm] = useState({ waistCm: 80 });

  const {
    data,
    addFoodEntry,
    addActivityLog,
    addSmokingLog,
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

  const movementMinutes = data.logs.activity
    .filter(log => log.dateTime.slice(0, 10) === selectedDate)
    .reduce((sum, log) => sum + log.minutes, 0);
  const cigaretteCount = data.logs.smoking
    .filter(log => log.dateTime.slice(0, 10) === selectedDate)
    .reduce((sum, log) => sum + log.count, 0);
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

  const getPlannedTitle = (item: MealPlanItem) => {
    if (item.kind === 'product') {
      return data.library.products.find(product => product.id === item.refId)?.name ?? 'Продукт';
    }
    if (item.kind === 'dish') {
      return data.library.recipes.find(dish => dish.id === item.refId)?.name ?? 'Блюдо';
    }
    if (item.kind === 'cheat') {
      return item.title || cheatLabels[item.cheatCategory ?? 'other'];
    }
    return item.title || 'Свободная запись';
  };

  const formatPlannedAmount = (item: MealPlanItem) => {
    if (item.kind === 'product') {
      return item.plannedGrams ? `${item.plannedGrams} г` : '';
    }
    if (item.kind === 'dish') {
      return item.plannedServings ? `${item.plannedServings} порц.` : '';
    }
    return '';
  };

  const addPlannedMealToLog = (meal: FoodEntry['meal'], item: MealPlanItem) => {
    const payload: FoodEntry = {
      id: '',
      meal,
      kind: item.kind,
      refId: item.refId,
      grams: item.kind === 'product' ? item.plannedGrams : undefined,
      servings: item.kind === 'dish' ? item.plannedServings : undefined,
      time: item.plannedTime,
      title: item.kind === 'free' || item.kind === 'cheat' ? item.title : undefined,
      cheatCategory: item.kind === 'cheat' ? item.cheatCategory : undefined,
      notes: item.notes
    };
    addFoodEntry(selectedDate, payload);
    updateData(state => {
      const plan = state.planner.dayPlans.find(planItem => planItem.date === selectedDate);
      if (!plan) return { ...state };
      const list = plan.mealsPlan[meal];
      plan.mealsPlan[meal] = list.map(planItem =>
        planItem.id === item.id ? { ...planItem, completed: true } : planItem
      );
      return { ...state };
    });
  };

  const addMealPlanItem = (meal: FoodEntry['meal']) => {
    const plan = createOrGetDayPlan(selectedDate);
    updateData(state => {
      const target = state.planner.dayPlans.find(item => item.date === plan.date);
      if (!target) return { ...state };
      const newItem: MealPlanItem = {
        id: crypto.randomUUID(),
        kind: mealKind,
        refId: mealKind === 'product' || mealKind === 'dish' ? mealRefId : undefined,
        plannedGrams: mealKind === 'product' ? mealAmount.grams : undefined,
        plannedServings: mealKind === 'dish' ? mealAmount.servings : undefined,
        title: mealKind === 'free' || mealKind === 'cheat' ? mealTitle : undefined,
        cheatCategory: mealKind === 'cheat' ? mealCheatCategory : undefined
      };
      target.mealsPlan[meal].push(newItem);
      return { ...state };
    });
  };

  const openPlanSheet = (meal: FoodEntry['meal']) => {
    setMealSheet(meal);
    setMealSearch('');
    setMealRefId('');
    setMealKind('dish');
    setMealAmount({ grams: 150, servings: 1 });
    setMealTitle('');
    setMealCheatCategory('pizza');
    setSheet('plan');
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
  const plannedMeals = dayPlan?.mealsPlan;

  const filteredDishes = data.library.recipes.filter(dish =>
    dish.name.toLowerCase().includes(mealSearch.toLowerCase())
  );
  const filteredProducts = data.library.products.filter(product =>
    product.name.toLowerCase().includes(mealSearch.toLowerCase())
  );

  const requirements = dayPlan?.requirements;
  const requiredPhotos = requirements?.requirePhotos ?? [];

  const runnerProtocol = runnerProtocolId
    ? data.library.protocols.find(item => item.id === runnerProtocolId)
    : null;

  return (
    <section className="space-y-4">
      <header className="sticky top-0 z-10 -mx-4 bg-slate-50 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Сегодня</p>
            <h1 className="text-2xl font-bold">{formatDate(selectedDate)}</h1>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value)}
            className="input w-auto"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => moveDate(-1)}>
            Вчера
          </button>
          <button className="btn-secondary flex-1" onClick={() => setSelectedDate(todayISO())}>
            Сегодня
          </button>
          <button className="btn-secondary flex-1" onClick={() => moveDate(1)}>
            Завтра
          </button>
        </div>
      </header>

      <div className="card p-4">
        <h2 className="section-title">Итоги дня</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Калории</p>
            <p className="text-lg font-semibold">{totals.kcal.toFixed(0)} ккал</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Движение</p>
            <p className="text-lg font-semibold">{movementMinutes} мин</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Сигареты</p>
            <p className="text-lg font-semibold">{cigaretteCount} шт</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Вес</p>
            <p className="text-lg font-semibold">{lastWeight ? `${lastWeight} кг` : '—'}</p>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="section-title">Быстрые действия</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button className="btn-primary" onClick={() => setSheet('food')}>
            Добавить питание
          </button>
          <button className="btn-primary" onClick={() => setSheet('activity')}>
            Добавить активность
          </button>
          <button className="btn-primary" onClick={() => setSheet('smoking')}>
            Добавить сигарету
          </button>
          <button className="btn-primary" onClick={() => setSheet('weight')}>
            Добавить вес
          </button>
        </div>
      </div>

      {dayPlan ? (
        <>
          <div className="card p-4 space-y-3">
            <h2 className="section-title">План на день</h2>
            <div className="space-y-3">
              {(Object.keys(timeLabels) as WorkoutPlanItem['timeOfDay'][]).map(timeOfDay => {
                const sessions = plannedWorkouts.filter(item => item.timeOfDay === timeOfDay);
                if (sessions.length === 0) return null;
                return (
                  <div key={timeOfDay} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {timeLabels[timeOfDay]}
                    </p>
                    {sessions.map(session => {
                      const protocol = session.protocolRef
                        ? data.library.protocols.find(item => item.id === session.protocolRef)
                        : null;
                      const isMovement = session.kind === 'movement' || !protocol;
                      return (
                        <div key={session.id} className="rounded-2xl border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">
                                {isMovement
                                  ? 'Движение / лестницы'
                                  : protocol?.name ?? 'Тренировка'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {isMovement
                                  ? `${session.plannedMinutes ?? 10} мин`
                                  : protocol?.description}
                              </p>
                            </div>
                            {session.completed ? (
                              <span className="badge">Выполнено</span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex gap-2">
                            {isMovement ? (
                              <button
                                className="btn-secondary flex-1"
                                onClick={() => {
                                  const minutes = session.plannedMinutes ?? 10;
                                  addActivityLog({
                                    id: '',
                                    dateTime: toDateTime(selectedDate, ''),
                                    type: 'march',
                                    minutes
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
                            ) : (
                              <button
                                className="btn-primary flex-1"
                                onClick={() => {
                                  setRunner(session);
                                  setRunnerProtocolId(session.protocolRef ?? null);
                                }}
                              >
                                Запустить
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-sm font-semibold">Курение</p>
                <p className="text-xs text-slate-500">
                  Лимит: {requirements?.smokingTargetMax ?? '—'} · Факт: {cigaretteCount}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h2 className="section-title">Питание по плану</h2>
            {(Object.keys(mealLabels) as FoodEntry['meal'][]).map(meal => (
              <div key={meal} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{mealLabels[meal]}</p>
                  <button className="btn-secondary" onClick={() => openPlanSheet(meal)}>
                    Заменить/добавить из библиотеки
                  </button>
                </div>
                {plannedMeals?.[meal].length ? (
                  <div className="space-y-2">
                    {plannedMeals[meal].map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold">{getPlannedTitle(item)}</p>
                          <p className="text-xs text-slate-500">
                            {formatPlannedAmount(item)}
                            {item.completed ? ' · выполнено' : ''}
                          </p>
                        </div>
                        <button
                          className="btn-primary"
                          onClick={() => addPlannedMealToLog(meal, item)}
                          disabled={item.completed}
                        >
                          {item.completed ? 'Готово' : 'Съел по плану'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Пока пусто</p>
                )}
              </div>
            ))}
          </div>

          {requirements &&
          (requirements.requireWeight || requirements.requireWaist || requiredPhotos.length > 0) ? (
            <div className="card p-4 space-y-3">
              <h2 className="section-title">Фото и измерения</h2>
              <div className="grid grid-cols-2 gap-2">
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
          <button className="btn-primary" onClick={() => navigate('/plan')}>
            Перейти в планирование
          </button>
        </div>
      )}

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
            <div className="flex flex-wrap gap-2">
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
          className="btn-primary"
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
        open={sheet === 'activity'}
        title="Добавить активность"
        onClose={() => setSheet(null)}
      >
        <label className="text-sm font-semibold text-slate-600">Тип</label>
        <select
          className="input"
          value={activityForm.type}
          onChange={event =>
            setActivityForm(prev => ({ ...prev, type: event.target.value as typeof prev.type }))
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
          value={activityForm.minutes}
          onChange={event =>
            setActivityForm(prev => ({ ...prev, minutes: Number(event.target.value) }))
          }
        />
        <label className="text-sm font-semibold text-slate-600">Время</label>
        <input
          type="time"
          className="input"
          value={activityForm.time}
          onChange={event => setActivityForm(prev => ({ ...prev, time: event.target.value }))}
        />
        <button
          className="btn-primary"
          onClick={() => {
            addActivityLog({
              id: '',
              dateTime: toDateTime(selectedDate, activityForm.time),
              type: activityForm.type,
              minutes: activityForm.minutes,
              blocks: 1
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
          className="input"
          value={smokingForm.stress}
          onChange={event => setSmokingForm(prev => ({ ...prev, stress: Number(event.target.value) }))}
        />
        <label className="text-sm font-semibold text-slate-600">Время</label>
        <input
          type="time"
          className="input"
          value={smokingForm.time}
          onChange={event => setSmokingForm(prev => ({ ...prev, time: event.target.value }))}
        />
        <button
          className="btn-primary"
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
          className="btn-primary"
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
          className="btn-primary"
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
        <button className="btn-primary" onClick={savePhoto}>
          Сохранить фото
        </button>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'plan'}
        title={`Добавить в план · ${mealSheet ? mealLabels[mealSheet] : ''}`}
        onClose={() => setSheet(null)}
      >
        <label className="text-sm font-semibold text-slate-600">Тип</label>
        <select
          className="input"
          value={mealKind}
          onChange={event => setMealKind(event.target.value as typeof mealKind)}
        >
          <option value="dish">Блюдо</option>
          <option value="product">Продукт</option>
          <option value="free">Свободно</option>
          <option value="cheat">Читмил</option>
        </select>

        {mealKind === 'dish' && (
          <>
            <label className="text-sm font-semibold text-slate-600">Поиск</label>
            <input
              className="input"
              placeholder="Найти блюдо"
              value={mealSearch}
              onChange={event => setMealSearch(event.target.value)}
            />
            <label className="text-sm font-semibold text-slate-600">Блюдо</label>
            <select
              className="input"
              value={mealRefId}
              onChange={event => setMealRefId(event.target.value)}
            >
              <option value="">Выберите блюдо</option>
              {filteredDishes.map(dish => (
                <option key={dish.id} value={dish.id}>
                  {dish.name}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Порции</label>
            <input
              type="number"
              className="input"
              value={mealAmount.servings}
              onChange={event =>
                setMealAmount(prev => ({ ...prev, servings: Number(event.target.value) }))
              }
            />
          </>
        )}

        {mealKind === 'product' && (
          <>
            <label className="text-sm font-semibold text-slate-600">Поиск</label>
            <input
              className="input"
              placeholder="Найти продукт"
              value={mealSearch}
              onChange={event => setMealSearch(event.target.value)}
            />
            <label className="text-sm font-semibold text-slate-600">Продукт</label>
            <select
              className="input"
              value={mealRefId}
              onChange={event => setMealRefId(event.target.value)}
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
              value={mealAmount.grams}
              onChange={event =>
                setMealAmount(prev => ({ ...prev, grams: Number(event.target.value) }))
              }
            />
          </>
        )}

        {(mealKind === 'free' || mealKind === 'cheat') && (
          <>
            <label className="text-sm font-semibold text-slate-600">Название</label>
            <input
              className="input"
              value={mealTitle}
              onChange={event => setMealTitle(event.target.value)}
            />
            {mealKind === 'cheat' ? (
              <>
                <label className="text-sm font-semibold text-slate-600">Категория читмила</label>
                <select
                  className="input"
                  value={mealCheatCategory ?? 'pizza'}
                  onChange={event =>
                    setMealCheatCategory(event.target.value as FoodEntry['cheatCategory'])
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
          </>
        )}

        <button
          className="btn-primary"
          onClick={() => {
            if (!mealSheet) return;
            addMealPlanItem(mealSheet);
            setSheet(null);
          }}
        >
          Добавить в план
        </button>

        <div className="mt-4 border-t border-slate-200 pt-4 space-y-2">
          <h3 className="text-sm font-semibold">+ Добавить новое блюдо</h3>
          <input
            className="input"
            placeholder="Название блюда"
            value={newDish.name}
            onChange={event => setNewDish(prev => ({ ...prev, name: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="input"
              placeholder="Порций"
              value={newDish.servings}
              onChange={event =>
                setNewDish(prev => ({ ...prev, servings: Number(event.target.value) }))
              }
            />
            <select
              className="input"
              value={newDish.category}
              onChange={event =>
                setNewDish(prev => ({
                  ...prev,
                  category: event.target.value as typeof newDish.category
                }))
              }
            >
              <option value="breakfast">Завтрак</option>
              <option value="main">Основное</option>
              <option value="side">Гарнир</option>
              <option value="salad">Салат</option>
              <option value="snack">Перекус</option>
              <option value="dessert">Десерт</option>
              <option value="drink">Напиток</option>
              <option value="cheat">Читмил</option>
            </select>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              if (!newDish.name) return;
              updateData(state => {
                state.library.recipes.push({
                  id: crypto.randomUUID(),
                  name: newDish.name,
                  servings: newDish.servings || 1,
                  ingredients: [],
                  steps: [],
                  tags: [],
                  category: newDish.category
                });
                return { ...state };
              });
              setNewDish({ name: '', servings: 1, category: 'main' });
            }}
          >
            Создать блюдо
          </button>
        </div>
      </BottomSheet>

      {runner && runnerProtocol && (
        <BottomSheet open={Boolean(runner)} title={runnerProtocol.name} onClose={() => setRunner(null)}>
          <WorkoutRunner
            protocol={runnerProtocol}
            exercises={data.library.exercises}
            onClose={() => setRunner(null)}
            onComplete={() => {
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
