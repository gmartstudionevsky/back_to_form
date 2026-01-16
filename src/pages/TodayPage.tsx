import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import { formatDate, todayISO } from '../utils/date';
import { TaskInstance } from '../types';
import { calcFoodEntry } from '../utils/nutrition';

const statusLabels: Record<TaskInstance['status'], string> = {
  planned: 'Запланировано',
  done: 'Сделано',
  skipped: 'Пропущено'
};

const taskTypeLabels: Record<string, string> = {
  warmup: 'Разминка',
  movement: 'Движение',
  strength: 'Сила',
  nutrition: 'Питание',
  smoking: 'Курение',
  sleep: 'Сон',
  measurement: 'Измерения'
};

const mealLabels: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const TodayPage = () => {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [detailTask, setDetailTask] = useState<TaskInstance | null>(null);
  const [sheet, setSheet] = useState<'food' | 'activity' | 'smoking' | 'weight' | null>(null);
  const [actualTask, setActualTask] = useState<TaskInstance | null>(null);
  const [foodForm, setFoodForm] = useState({
    kind: 'product' as const,
    refId: '',
    grams: 120,
    servings: 1,
    meal: 'breakfast' as const,
    time: '',
    title: '',
    kcalOverride: ''
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
  const [actualValues, setActualValues] = useState<Record<string, string | number>>({});

  const {
    data,
    addFoodEntry,
    addActivityLog,
    addSmokingLog,
    addWeightLog,
    updateData,
    createOrGetDayPlan,
    setTaskStatus,
    updateTaskActual
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
  const lastWeight = data.logs.weight.slice(-1)[0]?.weightKg;

  const libraryRefs = useMemo(() => {
    if (!detailTask?.assignedRefs) return [];
    return detailTask.assignedRefs.map(ref => {
      switch (ref.kind) {
        case 'protocol':
          return data.library.protocols.find(item => item.id === ref.refId);
        case 'exercise':
          return data.library.exercises.find(item => item.id === ref.refId);
        case 'recipe':
          return data.library.recipes.find(item => item.id === ref.refId);
        case 'rule':
          return data.library.rules.find(item => item.id === ref.refId);
        case 'product':
          return data.library.products.find(item => item.id === ref.refId);
        default:
          return null;
      }
    });
  }, [detailTask, data.library]);

  const moveDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  const toDateTime = (date: string, time: string) => {
    if (!time) return new Date().toISOString();
    return new Date(`${date}T${time}:00`).toISOString();
  };

  const groupedTasks = useMemo(() => {
    if (!dayPlan) return [];
    const groups = new Map<string, TaskInstance[]>();
    dayPlan.tasks.forEach(task => {
      const template = data.library.taskTemplates.find(item => item.id === task.templateRef);
      const type = template?.type ?? 'other';
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)?.push(task);
    });
    return Array.from(groups.entries());
  }, [dayPlan, data.library.taskTemplates]);

  const openActualSheet = (task: TaskInstance) => {
    const defaultValues = task.actual ?? {};
    if (Object.keys(defaultValues).length === 0) {
      const targetKeys = Object.keys(task.target ?? {});
      if (targetKeys.length === 0) {
        setActualValues({ value: '' });
      } else {
        setActualValues(Object.fromEntries(targetKeys.map(key => [key, ''])));
      }
    } else {
      setActualValues(defaultValues);
    }
    setActualTask(task);
  };

  const saveActuals = () => {
    if (!actualTask) return;
    updateTaskActual(selectedDate, actualTask.id, actualValues);
    setActualTask(null);
  };

  const createPlanForDay = () => {
    createOrGetDayPlan(selectedDate);
  };

  const copyYesterday = () => {
    updateData(state => {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() - 1);
      const prevDate = date.toISOString().slice(0, 10);
      const prevPlan = state.planner.dayPlans.find(plan => plan.date === prevDate);
      if (!prevPlan) return { ...state };
      let targetPlan = state.planner.dayPlans.find(plan => plan.date === selectedDate);
      if (!targetPlan) {
        targetPlan = { id: crypto.randomUUID(), date: selectedDate, tasks: [] };
        state.planner.dayPlans.push(targetPlan);
      }
      targetPlan.tasks = prevPlan.tasks.map(task => ({
        ...task,
        id: crypto.randomUUID(),
        status: 'planned',
        actual: undefined
      }));
      return { ...state };
    });
  };

  return (
    <section className="space-y-4">
      <header className="sticky top-0 z-10 -mx-4 bg-slate-50 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Today</p>
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
        <h2 className="section-title">Дашборд дня</h2>
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
        <h2 className="section-title">Быстрый ввод</h2>
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Задачи дня</h2>
          {dayPlan ? null : (
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={createPlanForDay}>
                Создать план
              </button>
              <button className="btn-secondary" onClick={copyYesterday}>
                Скопировать вчера
              </button>
            </div>
          )}
        </div>
        {dayPlan ? (
          groupedTasks.map(([type, tasks]) => (
            <div key={type} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {taskTypeLabels[type] ?? 'Прочее'}
              </p>
              {tasks.map(task => {
                const template = data.library.taskTemplates.find(
                  item => item.id === task.templateRef
                );
                return (
                  <div key={task.id} className="card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400">{statusLabels[task.status]}</p>
                        <h3 className="text-base font-semibold">{template?.title ?? 'Задача'}</h3>
                        {task.target ? (
                          <p className="text-xs text-slate-500">
                            Цель: {Object.entries(task.target)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')}
                          </p>
                        ) : null}
                        {task.actual ? (
                          <p className="text-xs text-slate-500">
                            Факт: {Object.entries(task.actual)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          className="btn-secondary"
                          onClick={() => setTaskStatus(selectedDate, task.id, 'done')}
                        >
                          Сделано
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => setTaskStatus(selectedDate, task.id, 'skipped')}
                        >
                          Пропуск
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => openActualSheet(task)}>
                        Внести факт
                      </button>
                      <button className="btn-secondary" onClick={() => setDetailTask(task)}>
                        Подробнее
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="card p-4 text-sm text-slate-500">
            На эту дату пока нет плана. Создайте план или скопируйте вчерашний.
          </div>
        )}
      </div>

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
          <option value="recipe">Рецепт</option>
          <option value="free">Свободная запись</option>
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

        {foodForm.kind === 'recipe' && (
          <>
            <label className="text-sm font-semibold text-slate-600">Рецепт</label>
            <select
              className="input"
              value={foodForm.refId}
              onChange={event => setFoodForm(prev => ({ ...prev, refId: event.target.value }))}
            >
              <option value="">Выберите рецепт</option>
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

        {foodForm.kind === 'free' && (
          <>
            <label className="text-sm font-semibold text-slate-600">Название</label>
            <input
              className="input"
              value={foodForm.title}
              onChange={event => setFoodForm(prev => ({ ...prev, title: event.target.value }))}
            />
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
              servings: foodForm.kind === 'recipe' ? foodForm.servings : undefined,
              meal: foodForm.meal,
              time: foodForm.time || undefined,
              title: foodForm.kind === 'free' ? foodForm.title : undefined,
              kcalOverride:
                foodForm.kind === 'free' && foodForm.kcalOverride
                  ? Number(foodForm.kcalOverride)
                  : undefined
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
              blocks: Math.max(1, Math.round(activityForm.minutes / 10))
            });
            setSheet(null);
          }}
        >
          Добавить
        </button>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'smoking'}
        title="Добавить сигареты"
        onClose={() => setSheet(null)}
      >
        <label className="text-sm font-semibold text-slate-600">Количество</label>
        <input
          type="number"
          className="input"
          value={smokingForm.count}
          onChange={event =>
            setSmokingForm(prev => ({ ...prev, count: Number(event.target.value) }))
          }
        />
        <label className="text-sm font-semibold text-slate-600">Триггер</label>
        <select
          className="input"
          value={smokingForm.trigger}
          onChange={event => setSmokingForm(prev => ({ ...prev, trigger: event.target.value }))}
        >
          <option value="стресс">Стресс</option>
          <option value="еда">Еда</option>
          <option value="привычка">Привычка</option>
          <option value="социально">Социально</option>
          <option value="другое">Другое</option>
        </select>
        <label className="text-sm font-semibold text-slate-600">Стресс (1–5)</label>
        <input
          type="number"
          min={1}
          max={5}
          className="input"
          value={smokingForm.stress}
          onChange={event =>
            setSmokingForm(prev => ({ ...prev, stress: Number(event.target.value) }))
          }
        />
        <label className="text-sm font-semibold text-slate-600">Правило применено</label>
        <button
          className="btn-secondary"
          onClick={() => setSmokingForm(prev => ({ ...prev, ruleApplied: !prev.ruleApplied }))}
        >
          {smokingForm.ruleApplied ? 'Да' : 'Нет'}
        </button>
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
          Добавить
        </button>
      </BottomSheet>

      <BottomSheet open={sheet === 'weight'} title="Добавить вес" onClose={() => setSheet(null)}>
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
          Добавить
        </button>
      </BottomSheet>

      <BottomSheet
        open={Boolean(detailTask)}
        title="Подробнее"
        onClose={() => setDetailTask(null)}
      >
        {libraryRefs.length === 0 ? (
          <p className="text-sm text-slate-500">Нет привязанных сущностей.</p>
        ) : (
          libraryRefs.map((ref, index) => (
            <div key={index} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">{ref?.name ?? 'Детали'}</p>
              {'description' in (ref ?? {}) && ref?.description ? (
                <p className="mt-1 text-sm text-slate-600">{ref.description}</p>
              ) : null}
              {'text' in (ref ?? {}) && ref?.text ? (
                <p className="mt-1 text-sm text-slate-600">{ref.text}</p>
              ) : null}
              {'steps' in (ref ?? {}) && Array.isArray(ref?.steps) ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {ref.steps.map((step, stepIndex) => (
                    <li key={stepIndex}>{step}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(actualTask)}
        title="Внести факт"
        onClose={() => setActualTask(null)}
      >
        {Object.entries(actualValues).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">{key}</label>
            <input
              className="input"
              value={value}
              onChange={event =>
                setActualValues(prev => ({ ...prev, [key]: event.target.value }))
              }
            />
          </div>
        ))}
        <button className="btn-primary" onClick={saveActuals}>
          Сохранить факт
        </button>
      </BottomSheet>
    </section>
  );
};

export default TodayPage;
