import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import { todayISO } from '../utils/date';
import { calcRecipeNutrition } from '../utils/nutrition';
import { savePhotoBlob } from '../storage/photoDb';
import { Exercise, FoodEntry, Recipe, TaskTemplate, MovementActivity } from '../types';

const tabs = [
  'Упражнения',
  'Протоколы',
  'Продукты',
  'Блюда',
  'Шаблоны',
  'Правила',
  'Движение'
] as const;

type LibraryTab = (typeof tabs)[number];

type FoodSheetItem = {
  kind: 'product' | 'dish';
  refId: string;
};

const mealLabels: Record<FoodEntry['meal'], string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const LibraryPage = () => {
  const { data, addFoodEntry, createOrGetDayPlan, updateData } = useAppStore();
  const [active, setActive] = useState<LibraryTab>('Упражнения');
  const [query, setQuery] = useState('');
  const [detailItem, setDetailItem] = useState<unknown | null>(null);
  const [foodSheet, setFoodSheet] = useState<FoodSheetItem | null>(null);
  const [taskSheet, setTaskSheet] = useState<TaskTemplate | null>(null);
  const [createSheet, setCreateSheet] = useState<
    'dish' | 'product' | 'exercise' | 'movement'
    | null
  >(null);
  const [exerciseMedia, setExerciseMedia] = useState({
    youtubeUrl: '',
    file: null as File | null
  });
  const [foodForm, setFoodForm] = useState({
    meal: 'breakfast' as FoodEntry['meal'],
    grams: 120,
    servings: 1,
    time: '',
    date: todayISO()
  });
  const [newDish, setNewDish] = useState({
    name: '',
    servings: 1,
    category: 'main' as Recipe['category']
  });
  const [newProduct, setNewProduct] = useState({
    name: '',
    kcalPer100g: 0,
    proteinPer100g: 0,
    fatPer100g: 0,
    carbPer100g: 0
  });
  const [newExercise, setNewExercise] = useState({
    name: '',
    tags: '',
    steps: ''
  });
  const [newMovementActivity, setNewMovementActivity] = useState({
    name: '',
    kind: 'march' as MovementActivity['kind']
  });
  const [taskDate, setTaskDate] = useState(todayISO());

  useEffect(() => {
    if (!detailItem || !('cues' in (detailItem as Exercise))) return;
    const exercise = detailItem as Exercise;
    setExerciseMedia({
      youtubeUrl: exercise.media?.youtubeUrl ?? '',
      file: null
    });
  }, [detailItem]);

  const filtered = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase();
    const q = normalize(query);
    const match = (value: string) => normalize(value).includes(q);
    switch (active) {
      case 'Упражнения':
        return data.library.exercises.filter(item => match(item.name));
      case 'Протоколы':
        return data.library.protocols.filter(item => match(item.name));
      case 'Продукты':
        return data.library.products.filter(item => match(item.name));
      case 'Блюда':
        return data.library.recipes.filter(item => match(item.name));
      case 'Шаблоны':
        return data.library.taskTemplates.filter(item => match(item.title));
      case 'Правила':
        return data.library.rules.filter(item => match(item.name));
      case 'Движение':
        return data.library.movementActivities.filter(item => match(item.name));
      default:
        return [];
    }
  }, [active, data.library, query]);

  const openFoodSheet = (item: FoodSheetItem) => {
    setFoodForm({ meal: 'breakfast', grams: 120, servings: 1, time: '', date: todayISO() });
    setFoodSheet(item);
  };

  const addTemplateToDate = (template: TaskTemplate, date: string) => {
    createOrGetDayPlan(date);
    updateData(state => {
      const dayPlan = state.planner.dayPlans.find(plan => plan.date === date);
      if (!dayPlan) return { ...state };
      dayPlan.tasks ??= [];
      dayPlan.tasks.push({
        id: crypto.randomUUID(),
        templateRef: template.id,
        status: 'planned',
        assignedRefs: template.suggestedRefs ?? [],
        target: template.defaultTarget ?? {}
      });
      return { ...state };
    });
  };

  const detailTitle = () => {
    if (!detailItem) return '';
    if ('title' in (detailItem as Record<string, string>)) return (detailItem as any).title;
    if ('name' in (detailItem as Record<string, string>)) return (detailItem as any).name;
    return 'Детали';
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Библиотека</h1>
        <input
          className="input"
          placeholder="Поиск"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="btn-secondary w-full sm:w-auto" onClick={() => setCreateSheet('dish')}>
            + Новое блюдо
          </button>
          <button className="btn-secondary w-full sm:w-auto" onClick={() => setCreateSheet('product')}>
            + Новый продукт
          </button>
          <button className="btn-secondary w-full sm:w-auto" onClick={() => setCreateSheet('exercise')}>
            + Новое упражнение
          </button>
          <button className="btn-secondary w-full sm:w-auto" onClick={() => setCreateSheet('movement')}>
            + Новое движение
          </button>
        </div>
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

      <div className="space-y-3">
        {filtered.map(item => (
          <div key={(item as any).id} className="card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold">
                  {'title' in item ? (item as any).title : (item as any).name}
                </h3>
                {'kcalPer100g' in item ? (
                  <p className="text-sm text-slate-500">{(item as any).kcalPer100g} ккал/100г</p>
                ) : null}
                {'category' in item ? (
                  <p className="text-xs text-slate-500">
                    Категория: {(item as Recipe).category}
                  </p>
                ) : null}
                {active === 'Движение' && 'kind' in item ? (
                  <p className="text-xs text-slate-500">Тип: {(item as MovementActivity).kind}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button className="btn-secondary w-full sm:w-auto" onClick={() => setDetailItem(item)}>
                  Подробнее
                </button>
                {active === 'Продукты' && 'kcalPer100g' in item ? (
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={() => openFoodSheet({ kind: 'product', refId: (item as any).id })}
                  >
                    Добавить в питание
                  </button>
                ) : null}
                {active === 'Блюда' ? (
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={() => openFoodSheet({ kind: 'dish', refId: (item as any).id })}
                  >
                    Добавить в питание
                  </button>
                ) : null}
                {active === 'Шаблоны' ? (
                  <button className="btn-primary w-full sm:w-auto" onClick={() => setTaskSheet(item as TaskTemplate)}>
                    Добавить задачу
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomSheet open={Boolean(detailItem)} title={detailTitle()} onClose={() => setDetailItem(null)}>
        {detailItem && 'steps' in (detailItem as any) && 'cues' in (detailItem as any) ? (
          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Шаги</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as any).steps.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Подсказки</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as any).cues.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Ошибки</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as any).mistakes.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Упрощения</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as any).regressions.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Усложнения</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as any).progressions.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            {'media' in (detailItem as Exercise) ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-400">Видео</p>
                <input
                  className="input"
                  placeholder="YouTube ссылка"
                  value={exerciseMedia.youtubeUrl}
                  onChange={event =>
                    setExerciseMedia(prev => ({ ...prev, youtubeUrl: event.target.value }))
                  }
                />
                <input
                  type="file"
                  accept="video/*"
                  className="input"
                  onChange={event =>
                    setExerciseMedia(prev => ({ ...prev, file: event.target.files?.[0] ?? null }))
                  }
                />
                <button
                  className="btn-secondary w-full sm:w-auto"
                  onClick={async () => {
                    const exercise = detailItem as Exercise;
                    let blobKey = exercise.media?.localVideoBlobKey;
                    if (exerciseMedia.file) {
                      blobKey = crypto.randomUUID();
                      await savePhotoBlob(blobKey, exerciseMedia.file);
                    }
                    updateData(state => {
                      state.library.exercises = state.library.exercises.map(item =>
                        item.id === exercise.id
                          ? {
                              ...item,
                              media: {
                                youtubeUrl: exerciseMedia.youtubeUrl || undefined,
                                localVideoBlobKey: blobKey
                              }
                            }
                          : item
                      );
                      return { ...state };
                    });
                    setExerciseMedia({ youtubeUrl: '', file: null });
                  }}
                >
                  Сохранить медиа
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {detailItem && 'steps' in (detailItem as any) && 'description' in (detailItem as any) ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>{(detailItem as any).description}</p>
            <div className="space-y-2">
              {(detailItem as any).steps.map((step: any, index: number) => {
                const exercise = data.library.exercises.find(item => item.id === step.exerciseRef);
                return (
                  <div key={index} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-semibold">
                      {step.text} {step.durationSec ? `· ${step.durationSec}s` : ''}
                    </p>
                    {exercise ? (
                      <p className="text-xs text-slate-500">{exercise.name}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {detailItem && 'ingredients' in (detailItem as any) ? (
          <div className="space-y-3 text-sm text-slate-600">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Состав</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as Recipe).ingredients.map(ingredient => {
                  const product = data.library.products.find(
                    item => item.id === ingredient.productRef
                  );
                  return (
                    <li key={ingredient.productRef}>
                      {product?.name ?? 'Продукт'} — {ingredient.grams} г
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Шаги</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as Recipe).steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-400">Нутриенты на порцию</p>
              <p className="text-sm">
                {(() => {
                  const nutrition = calcRecipeNutrition(detailItem as Recipe, data.library);
                  return `${nutrition.perServing.kcal.toFixed(0)} ккал, Б ${nutrition.perServing.protein.toFixed(
                    1
                  )} / Ж ${nutrition.perServing.fat.toFixed(1)} / У ${nutrition.perServing.carb.toFixed(1)}`;
                })()}
              </p>
            </div>
          </div>
        ) : null}

        {detailItem && 'kcalPer100g' in (detailItem as any) ? (
          <div className="space-y-2 text-sm text-slate-600">
            <p>Калории: {(detailItem as any).kcalPer100g} ккал/100г</p>
            {((detailItem as any).portionPresets ?? []).length > 0 ? (
              <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Шаблоны</p>
                <div className="control-row mt-2">
                  {(detailItem as any).portionPresets.map((preset: any) => (
                    <span key={preset.label} className="badge">
                      {preset.label} · {preset.grams} г
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {detailItem && active === 'Движение' && 'kind' in (detailItem as MovementActivity) ? (
          <div className="space-y-2 text-sm text-slate-600">
            <p>Тип активности: {(detailItem as MovementActivity).kind}</p>
          </div>
        ) : null}

        {detailItem && 'text' in (detailItem as any) && !('steps' in (detailItem as any)) ? (
          <p className="text-sm text-slate-600">{(detailItem as any).text}</p>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={Boolean(foodSheet)}
        title="Добавить в питание"
        onClose={() => setFoodSheet(null)}
      >
        {foodSheet && (
          <>
            <label className="text-sm font-semibold text-slate-600">Дата</label>
            <input
              type="date"
              className="input"
              value={foodForm.date}
              onChange={event => setFoodForm(prev => ({ ...prev, date: event.target.value }))}
            />
            <label className="text-sm font-semibold text-slate-600">Приём пищи</label>
            <select
              className="input"
              value={foodForm.meal}
              onChange={event =>
                setFoodForm(prev => ({ ...prev, meal: event.target.value as FoodEntry['meal'] }))
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
              value={foodForm.time}
              onChange={event => setFoodForm(prev => ({ ...prev, time: event.target.value }))}
            />
            {foodSheet.kind === 'product' ? (
              <>
                <label className="text-sm font-semibold text-slate-600">Граммы</label>
                <input
                  type="number"
                  className="input"
                  value={foodForm.grams}
                  onChange={event =>
                    setFoodForm(prev => ({ ...prev, grams: Number(event.target.value) }))
                  }
                />
              </>
            ) : (
              <>
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
            <button
              className="btn-primary w-full"
              onClick={() => {
                if (!foodForm.date) return;
                addFoodEntry(foodForm.date, {
                  id: '',
                  kind: foodSheet.kind,
                  refId: foodSheet.refId,
                  grams: foodSheet.kind === 'product' ? foodForm.grams : undefined,
                  servings: foodSheet.kind === 'dish' ? foodForm.servings : undefined,
                  meal: foodForm.meal,
                  time: foodForm.time || undefined
                });
                setFoodSheet(null);
              }}
            >
              Добавить
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(taskSheet)}
        title="Добавить задачу"
        onClose={() => setTaskSheet(null)}
      >
        {taskSheet && (
          <>
            <label className="text-sm font-semibold text-slate-600">Дата</label>
            <input
              type="date"
              className="input"
              value={taskDate}
              onChange={event => setTaskDate(event.target.value)}
            />
            <button
              className="btn-primary w-full"
              onClick={() => {
                addTemplateToDate(taskSheet, taskDate);
                setTaskSheet(null);
              }}
            >
              Добавить в план
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(createSheet)}
        title={
          createSheet === 'dish'
            ? 'Новое блюдо'
            : createSheet === 'product'
            ? 'Новый продукт'
            : createSheet === 'movement'
            ? 'Новое движение'
            : 'Новое упражнение'
        }
        onClose={() => setCreateSheet(null)}
      >
        {createSheet === 'dish' ? (
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Название"
              value={newDish.name}
              onChange={event => setNewDish(prev => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="input"
              type="number"
              placeholder="Порции"
              value={newDish.servings}
              onChange={event =>
                setNewDish(prev => ({ ...prev, servings: Number(event.target.value) }))
              }
            />
            <select
              className="input"
              value={newDish.category}
              onChange={event =>
                setNewDish(prev => ({ ...prev, category: event.target.value as Recipe['category'] }))
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
            <button
              className="btn-primary w-full"
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
                setCreateSheet(null);
              }}
            >
              Создать блюдо
            </button>
          </div>
        ) : null}

        {createSheet === 'product' ? (
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Название"
              value={newProduct.name}
              onChange={event => setNewProduct(prev => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="input"
              type="number"
              placeholder="Ккал на 100 г"
              value={newProduct.kcalPer100g}
              onChange={event =>
                setNewProduct(prev => ({ ...prev, kcalPer100g: Number(event.target.value) }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                type="number"
                placeholder="Белки"
                value={newProduct.proteinPer100g}
                onChange={event =>
                  setNewProduct(prev => ({ ...prev, proteinPer100g: Number(event.target.value) }))
                }
              />
              <input
                className="input"
                type="number"
                placeholder="Жиры"
                value={newProduct.fatPer100g}
                onChange={event =>
                  setNewProduct(prev => ({ ...prev, fatPer100g: Number(event.target.value) }))
                }
              />
            </div>
            <input
              className="input"
              type="number"
              placeholder="Углеводы"
              value={newProduct.carbPer100g}
              onChange={event =>
                setNewProduct(prev => ({ ...prev, carbPer100g: Number(event.target.value) }))
              }
            />
            <button
              className="btn-primary w-full"
              onClick={() => {
                if (!newProduct.name) return;
                updateData(state => {
                  state.library.products.push({
                    id: crypto.randomUUID(),
                    name: newProduct.name,
                    kcalPer100g: newProduct.kcalPer100g,
                    proteinPer100g: newProduct.proteinPer100g || undefined,
                    fatPer100g: newProduct.fatPer100g || undefined,
                    carbPer100g: newProduct.carbPer100g || undefined
                  });
                  return { ...state };
                });
                setNewProduct({
                  name: '',
                  kcalPer100g: 0,
                  proteinPer100g: 0,
                  fatPer100g: 0,
                  carbPer100g: 0
                });
                setCreateSheet(null);
              }}
            >
              Создать продукт
            </button>
          </div>
        ) : null}

        {createSheet === 'exercise' ? (
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Название"
              value={newExercise.name}
              onChange={event => setNewExercise(prev => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Теги через запятую"
              value={newExercise.tags}
              onChange={event => setNewExercise(prev => ({ ...prev, tags: event.target.value }))}
            />
            <textarea
              className="input min-h-[80px]"
              placeholder="Шаги упражнения"
              value={newExercise.steps}
              onChange={event => setNewExercise(prev => ({ ...prev, steps: event.target.value }))}
            />
            <button
              className="btn-primary w-full"
              onClick={() => {
                if (!newExercise.name) return;
                updateData(state => {
                  state.library.exercises.push({
                    id: crypto.randomUUID(),
                    name: newExercise.name,
                    tags: newExercise.tags
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(Boolean),
                    steps: newExercise.steps
                      .split('\\n')
                      .map(step => step.trim())
                      .filter(Boolean),
                    cues: [],
                    mistakes: [],
                    regressions: [],
                    progressions: []
                  });
                  return { ...state };
                });
                setNewExercise({ name: '', tags: '', steps: '' });
                setCreateSheet(null);
              }}
            >
              Создать упражнение
            </button>
          </div>
        ) : null}

        {createSheet === 'movement' ? (
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Название"
              value={newMovementActivity.name}
              onChange={event =>
                setNewMovementActivity(prev => ({ ...prev, name: event.target.value }))
              }
            />
            <label className="text-sm font-semibold text-slate-600">Тип</label>
            <select
              className="input"
              value={newMovementActivity.kind}
              onChange={event =>
                setNewMovementActivity(prev => ({
                  ...prev,
                  kind: event.target.value as MovementActivity['kind']
                }))
              }
            >
              <option value="run">Бег</option>
              <option value="march">Ходьба на месте</option>
              <option value="stairs">Ходьба по лестницам</option>
            </select>
            <button
              className="btn-primary w-full"
              onClick={() => {
                if (!newMovementActivity.name) return;
                updateData(state => {
                  state.library.movementActivities.push({
                    id: crypto.randomUUID(),
                    name: newMovementActivity.name,
                    kind: newMovementActivity.kind
                  });
                  return { ...state };
                });
                setNewMovementActivity({ name: '', kind: 'march' });
                setCreateSheet(null);
              }}
            >
              Создать движение
            </button>
          </div>
        ) : null}
      </BottomSheet>
    </section>
  );
};

export default LibraryPage;
