import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import { currentTimeString, todayISO } from '../utils/date';
import { calcRecipeNutrition } from '../utils/nutrition';
import { savePhotoBlob } from '../storage/photoDb';
import {
  Drink,
  Exercise,
  FoodEntry,
  MovementActivity,
  NutritionTag,
  Recipe,
  TaskTemplate
} from '../types';

const librarySections = {
  Питание: ['Продукты', 'Блюда', 'Напитки'],
  Тренировки: ['Упражнения', 'Протоколы'],
  Активность: ['Движение', 'Шаблоны', 'Правила']
} as const;

type LibrarySection = keyof typeof librarySections;

type LibraryTab = (typeof librarySections)[LibrarySection][number];

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

const nutritionTagLabels: Record<NutritionTag, string> = {
  snack: 'Перекус',
  cheat: 'Читмил',
  healthy: 'Правильное питание'
};

const LibraryPage = () => {
  const { data, addFoodEntry, createOrGetDayPlan, updateData } = useAppStore();
  const [activeSection, setActiveSection] = useState<LibrarySection>('Питание');
  const [activeTab, setActiveTab] = useState<LibraryTab>('Продукты');
  const [query, setQuery] = useState('');
  const [detailItem, setDetailItem] = useState<unknown | null>(null);
  const [foodSheet, setFoodSheet] = useState<FoodSheetItem | null>(null);
  const [taskSheet, setTaskSheet] = useState<TaskTemplate | null>(null);
  const [createSheet, setCreateSheet] = useState<
    'dish' | 'product' | 'exercise' | 'movement' | 'drink'
    | null
  >(null);
  const [exerciseMedia, setExerciseMedia] = useState({
    youtubeUrl: '',
    file: null as File | null
  });
  const [foodForm, setFoodForm] = useState({
    meal: 'breakfast' as FoodEntry['meal'],
    grams: 120,
    pieces: 1,
    portionMode: 'grams' as 'grams' | 'pieces',
    servings: 1,
    portionLabel: '',
    time: currentTimeString(),
    date: todayISO()
  });
  const [newDish, setNewDish] = useState({
    name: '',
    servings: 1,
    category: 'main' as Recipe['category'],
    nutritionTags: [] as NutritionTag[],
    hydrationContribution: false
  });
  const [newProduct, setNewProduct] = useState({
    name: '',
    kcalPer100g: 0,
    proteinPer100g: 0,
    fatPer100g: 0,
    carbPer100g: 0,
    nutritionTags: [] as NutritionTag[],
    hydrationContribution: false,
    pieceGrams: 0,
    pieceLabel: 'шт.'
  });
  const [newDrink, setNewDrink] = useState({
    name: '',
    hydrationFactor: 1,
    kcalPer100ml: 0,
    proteinPer100ml: 0,
    fatPer100ml: 0,
    carbPer100ml: 0,
    portionLabel: 'Стакан',
    portionMl: 250
  });
  const [newExercise, setNewExercise] = useState({
    name: '',
    tags: '',
    steps: '',
    activityPerMinute: 0.04,
    activityPerRep: 0.01,
    activityPerSet: 0.12,
    activityBase: 0.2,
    calculationModel: 'combined' as const,
    intensityMultiplier: 1
  });
  const [newMovementActivity, setNewMovementActivity] = useState({
    name: '',
    kind: 'march' as MovementActivity['kind'],
    perMinute: 0.03,
    perKm: 0.3,
    perStep: 0.00008,
    perFlight: 0.05,
    calculationModel: 'combined' as const,
    intensityMultiplier: 1
  });
  const [taskDate, setTaskDate] = useState(todayISO());
  const foodSheetProduct =
    foodSheet?.kind === 'product'
      ? data.library.products.find(product => product.id === foodSheet.refId)
      : undefined;
  const foodSheetSupportsPieces = Boolean(foodSheetProduct?.pieceGrams);
  const foodSheetPieceLabel = foodSheetProduct?.pieceLabel ?? 'шт.';

  useEffect(() => {
    if (!foodSheet) return;
    if (foodSheet.kind === 'product') {
      const product = data.library.products.find(item => item.id === foodSheet.refId);
      const supportsPieces = Boolean(product?.pieceGrams);
      setFoodForm(prev => ({
        ...prev,
        portionMode: supportsPieces ? 'pieces' : 'grams',
        pieces: supportsPieces ? prev.pieces || 1 : prev.pieces
      }));
    }
  }, [data.library.products, foodSheet]);

  useEffect(() => {
    if (!detailItem || !('cues' in (detailItem as Exercise))) return;
    const exercise = detailItem as Exercise;
    setExerciseMedia({
      youtubeUrl: exercise.media?.youtubeUrl ?? '',
      file: null
    });
  }, [detailItem]);

  useEffect(() => {
    setActiveTab(librarySections[activeSection][0]);
  }, [activeSection]);

  const filtered = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase();
    const q = normalize(query);
    const match = (value: string) => normalize(value).includes(q);
    switch (activeTab) {
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
      case 'Напитки':
        return data.library.drinks.filter(item => match(item.name));
      default:
        return [];
    }
  }, [activeTab, data.library, query]);

  const openFoodSheet = (item: FoodSheetItem) => {
    setFoodForm({
      meal: 'breakfast',
      grams: 120,
      pieces: 1,
      portionMode: 'grams',
      servings: 1,
      portionLabel: '',
      time: currentTimeString(),
      date: todayISO()
    });
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

  const toggleNewDishTag = (tag: NutritionTag) => {
    setNewDish(prev => ({
      ...prev,
      nutritionTags: prev.nutritionTags.includes(tag)
        ? prev.nutritionTags.filter(item => item !== tag)
        : [...prev.nutritionTags, tag]
    }));
  };

  const toggleNewProductTag = (tag: NutritionTag) => {
    setNewProduct(prev => ({
      ...prev,
      nutritionTags: prev.nutritionTags.includes(tag)
        ? prev.nutritionTags.filter(item => item !== tag)
        : [...prev.nutritionTags, tag]
    }));
  };

  const sectionTabs = librarySections[activeSection];

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Библиотеки</h1>
        <p className="text-sm text-slate-500">
          Настройка справочников для питания, тренировок и активности.
        </p>
        <input
          className="input"
          placeholder="Поиск"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(librarySections) as LibrarySection[]).map(section => (
            <button
              key={section}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                activeSection === section ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setActiveSection(section)}
            >
              {section}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sectionTabs.map(tab => (
            <button
              key={tab}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {activeSection === 'Питание' ? (
            <>
              <button
                className="btn-secondary w-full sm:w-auto"
                onClick={() => setCreateSheet('dish')}
              >
                + Новое блюдо
              </button>
              <button
                className="btn-secondary w-full sm:w-auto"
                onClick={() => setCreateSheet('product')}
              >
                + Новый продукт
              </button>
              <button
                className="btn-secondary w-full sm:w-auto"
                onClick={() => setCreateSheet('drink')}
              >
                + Новый напиток
              </button>
            </>
          ) : null}
          {activeSection === 'Тренировки' ? (
            <button
              className="btn-secondary w-full sm:w-auto"
              onClick={() => setCreateSheet('exercise')}
            >
              + Новое упражнение
            </button>
          ) : null}
          {activeSection === 'Активность' ? (
            <button
              className="btn-secondary w-full sm:w-auto"
              onClick={() => setCreateSheet('movement')}
            >
              + Новое движение
            </button>
          ) : null}
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
                  <p className="text-xs text-slate-500">Категория: {(item as Recipe).category}</p>
                ) : null}
                {'hydrationFactor' in item ? (
                  <p className="text-xs text-slate-500">
                    Гидратация: {(item as Drink).hydrationFactor} · порций{' '}
                    {(item as Drink).portions.length}
                  </p>
                ) : null}
                {activeTab === 'Движение' && 'kind' in item ? (
                  <p className="text-xs text-slate-500">Тип: {(item as MovementActivity).kind}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  className="btn-secondary w-full sm:w-auto"
                  onClick={() => setDetailItem(item)}
                >
                  Подробнее
                </button>
                {activeTab === 'Продукты' && 'kcalPer100g' in item ? (
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={() => openFoodSheet({ kind: 'product', refId: (item as any).id })}
                  >
                    Добавить в питание
                  </button>
                ) : null}
                {activeTab === 'Блюда' ? (
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={() => openFoodSheet({ kind: 'dish', refId: (item as any).id })}
                  >
                    Добавить в питание
                  </button>
                ) : null}
                {activeTab === 'Шаблоны' ? (
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={() => setTaskSheet(item as TaskTemplate)}
                  >
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
                    {exercise ? <p className="text-xs text-slate-500">{exercise.name}</p> : null}
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
            {(detailItem as Recipe).nutritionTags?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Метки питания</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {(detailItem as Recipe).nutritionTags?.map(tag => (
                    <span key={tag} className="badge">
                      {nutritionTagLabels[tag]}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {(detailItem as Recipe).hydrationContribution ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Водный баланс</p>
                <span className="badge">Учитывается</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {detailItem && 'kcalPer100g' in (detailItem as any) ? (
          <div className="space-y-2 text-sm text-slate-600">
            <p>Калории: {(detailItem as any).kcalPer100g} ккал/100г</p>
            {(detailItem as any).nutritionTags?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Метки питания</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {(detailItem as any).nutritionTags.map((tag: NutritionTag) => (
                    <span key={tag} className="badge">
                      {nutritionTagLabels[tag]}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
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
            {(detailItem as any).pieceGrams ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Поштучно</p>
                <span className="badge">{(detailItem as any).pieceLabel ?? 'шт.'}</span>
              </div>
            ) : null}
            {(detailItem as any).hydrationContribution ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Водный баланс</p>
                <span className="badge">Учитывается</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {detailItem && 'portions' in (detailItem as Drink) ? (
          <div className="space-y-2 text-sm text-slate-600">
            <p>Гидратация: {(detailItem as Drink).hydrationFactor}</p>
            <p>
              КБЖУ: {(detailItem as Drink).kcalPer100ml ?? 0} ккал · Б{' '}
              {(detailItem as Drink).proteinPer100ml ?? 0} · Ж{' '}
              {(detailItem as Drink).fatPer100ml ?? 0} · У {(detailItem as Drink).carbPer100ml ?? 0}
            </p>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Порции</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                {(detailItem as Drink).portions.map(portion => (
                  <span key={portion.label} className="badge">
                    {portion.label} · {portion.ml} мл
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {detailItem && activeTab === 'Движение' && 'kind' in (detailItem as MovementActivity) ? (
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
                {foodSheetSupportsPieces ? (
                  <div className="flex gap-2">
                    <button
                      className={foodForm.portionMode === 'pieces' ? 'btn-primary' : 'btn-secondary'}
                      onClick={() => setFoodForm(prev => ({ ...prev, portionMode: 'pieces' }))}
                    >
                      Штуки
                    </button>
                    <button
                      className={foodForm.portionMode === 'grams' ? 'btn-primary' : 'btn-secondary'}
                      onClick={() => setFoodForm(prev => ({ ...prev, portionMode: 'grams' }))}
                    >
                      Граммы
                    </button>
                  </div>
                ) : null}
                {(!foodSheetSupportsPieces || foodForm.portionMode === 'grams') && (
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
                )}
                {foodSheetSupportsPieces && foodForm.portionMode === 'pieces' && (
                  <>
                    <label className="text-sm font-semibold text-slate-600">
                      Количество ({foodSheetPieceLabel})
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={foodForm.pieces}
                      onChange={event =>
                        setFoodForm(prev => ({ ...prev, pieces: Number(event.target.value) }))
                      }
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <label className="text-sm font-semibold text-slate-600">Порции (для расчётов)</label>
                <input
                  type="number"
                  className="input"
                  value={foodForm.servings}
                  onChange={event =>
                    setFoodForm(prev => ({ ...prev, servings: Number(event.target.value) }))
                  }
                />
                <label className="text-sm font-semibold text-slate-600">Описание порции</label>
                <input
                  className="input"
                  placeholder="Например: 1 тарелка"
                  value={foodForm.portionLabel}
                  onChange={event =>
                    setFoodForm(prev => ({ ...prev, portionLabel: event.target.value }))
                  }
                />
                <div className="control-row">
                  {data.presets.dishPortions.map(preset => (
                    <button
                      key={preset.label}
                      className="btn-secondary"
                      onClick={() =>
                        setFoodForm(prev => ({
                          ...prev,
                          servings: preset.servings,
                          portionLabel: preset.label
                        }))
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              className="btn-primary w-full"
              onClick={() => {
                if (!foodForm.date) return;
                const tags =
                  foodSheet.kind === 'product'
                    ? data.library.products.find(item => item.id === foodSheet.refId)?.nutritionTags ??
                      []
                    : data.library.recipes.find(item => item.id === foodSheet.refId)?.nutritionTags ??
                      [];
                const resolvedTags = Array.from(
                  new Set(
                    [...tags, foodForm.meal === 'snack' ? 'snack' : undefined].filter(Boolean)
                  ) as NutritionTag[]
                );
                addFoodEntry(foodForm.date, {
                  id: '',
                  kind: foodSheet.kind,
                  refId: foodSheet.refId,
                  grams:
                    foodSheet.kind === 'product' && foodForm.portionMode === 'grams'
                      ? foodForm.grams
                      : undefined,
                  pieces:
                    foodSheet.kind === 'product' && foodForm.portionMode === 'pieces'
                      ? foodForm.pieces
                      : undefined,
                  servings: foodSheet.kind === 'dish' ? foodForm.servings : undefined,
                  portionLabel: foodSheet.kind === 'dish' ? foodForm.portionLabel : undefined,
                  meal: foodForm.meal,
                  time: foodForm.time || undefined,
                  nutritionTags: resolvedTags
                });
                setFoodSheet(null);
              }}
            >
              Добавить
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={Boolean(taskSheet)} title="Добавить задачу" onClose={() => setTaskSheet(null)}>
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
            : createSheet === 'drink'
            ? 'Новый напиток'
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
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600">Метки питания</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {(Object.keys(nutritionTagLabels) as NutritionTag[]).map(tag => (
                  <label key={tag} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={newDish.nutritionTags.includes(tag)}
                      onChange={() => toggleNewDishTag(tag)}
                    />
                    {nutritionTagLabels[tag]}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={newDish.hydrationContribution}
                onChange={() =>
                  setNewDish(prev => ({
                    ...prev,
                    hydrationContribution: !prev.hydrationContribution
                  }))
                }
              />
              Восполняет водный баланс
            </label>
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
                    category: newDish.category,
                    nutritionTags: newDish.nutritionTags,
                    hydrationContribution: newDish.hydrationContribution
                  });
                  return { ...state };
                });
                setNewDish({
                  name: '',
                  servings: 1,
                  category: 'main',
                  nutritionTags: [],
                  hydrationContribution: false
                });
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
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                type="number"
                placeholder="Грамм в 1 шт (служебно)"
                value={newProduct.pieceGrams}
                onChange={event =>
                  setNewProduct(prev => ({ ...prev, pieceGrams: Number(event.target.value) }))
                }
              />
              <input
                className="input"
                placeholder="Подпись (шт.)"
                value={newProduct.pieceLabel}
                onChange={event =>
                  setNewProduct(prev => ({ ...prev, pieceLabel: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600">Метки питания</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {(Object.keys(nutritionTagLabels) as NutritionTag[]).map(tag => (
                  <label key={tag} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={newProduct.nutritionTags.includes(tag)}
                      onChange={() => toggleNewProductTag(tag)}
                    />
                    {nutritionTagLabels[tag]}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={newProduct.hydrationContribution}
                onChange={() =>
                  setNewProduct(prev => ({
                    ...prev,
                    hydrationContribution: !prev.hydrationContribution
                  }))
                }
              />
              Восполняет водный баланс
            </label>
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
                    carbPer100g: newProduct.carbPer100g || undefined,
                    nutritionTags: newProduct.nutritionTags,
                    hydrationContribution: newProduct.hydrationContribution,
                    pieceGrams: newProduct.pieceGrams || undefined,
                    pieceLabel: newProduct.pieceGrams
                      ? newProduct.pieceLabel || 'шт.'
                      : undefined
                  });
                  return { ...state };
                });
                setNewProduct({
                  name: '',
                  kcalPer100g: 0,
                  proteinPer100g: 0,
                  fatPer100g: 0,
                  carbPer100g: 0,
                  nutritionTags: [],
                  hydrationContribution: false,
                  pieceGrams: 0,
                  pieceLabel: 'шт.'
                });
                setCreateSheet(null);
              }}
            >
              Создать продукт
            </button>
          </div>
        ) : null}

        {createSheet === 'drink' ? (
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Название"
              value={newDrink.name}
              onChange={event => setNewDrink(prev => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="Коэф. гидратации"
              value={newDrink.hydrationFactor}
              onChange={event =>
                setNewDrink(prev => ({ ...prev, hydrationFactor: Number(event.target.value) }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                type="number"
                placeholder="Ккал на 100 мл"
                value={newDrink.kcalPer100ml}
                onChange={event =>
                  setNewDrink(prev => ({ ...prev, kcalPer100ml: Number(event.target.value) }))
                }
              />
              <input
                className="input"
                type="number"
                placeholder="Белки"
                value={newDrink.proteinPer100ml}
                onChange={event =>
                  setNewDrink(prev => ({ ...prev, proteinPer100ml: Number(event.target.value) }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                type="number"
                placeholder="Жиры"
                value={newDrink.fatPer100ml}
                onChange={event =>
                  setNewDrink(prev => ({ ...prev, fatPer100ml: Number(event.target.value) }))
                }
              />
              <input
                className="input"
                type="number"
                placeholder="Углеводы"
                value={newDrink.carbPer100ml}
                onChange={event =>
                  setNewDrink(prev => ({ ...prev, carbPer100ml: Number(event.target.value) }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                placeholder="Порция"
                value={newDrink.portionLabel}
                onChange={event =>
                  setNewDrink(prev => ({ ...prev, portionLabel: event.target.value }))
                }
              />
              <input
                className="input"
                type="number"
                placeholder="Мл"
                value={newDrink.portionMl}
                onChange={event =>
                  setNewDrink(prev => ({ ...prev, portionMl: Number(event.target.value) }))
                }
              />
            </div>
            <button
              className="btn-primary w-full"
              onClick={() => {
                if (!newDrink.name) return;
                updateData(state => {
                  state.library.drinks.push({
                    id: crypto.randomUUID(),
                    name: newDrink.name,
                    hydrationFactor: newDrink.hydrationFactor || 1,
                    kcalPer100ml: newDrink.kcalPer100ml || undefined,
                    proteinPer100ml: newDrink.proteinPer100ml || undefined,
                    fatPer100ml: newDrink.fatPer100ml || undefined,
                    carbPer100ml: newDrink.carbPer100ml || undefined,
                    portions: [
                      {
                        label: newDrink.portionLabel || 'Порция',
                        ml: newDrink.portionMl || 250
                      }
                    ]
                  });
                  return { ...state };
                });
                setNewDrink({
                  name: '',
                  hydrationFactor: 1,
                  kcalPer100ml: 0,
                  proteinPer100ml: 0,
                  fatPer100ml: 0,
                  carbPer100ml: 0,
                  portionLabel: 'Стакан',
                  portionMl: 250
                });
                setCreateSheet(null);
              }}
            >
              Создать напиток
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
            <label className="text-sm font-semibold text-slate-600">Модель расчёта</label>
            <select
              className="input"
              value={newExercise.calculationModel}
              onChange={event =>
                setNewExercise(prev => ({
                  ...prev,
                  calculationModel: event.target.value as typeof newExercise.calculationModel
                }))
              }
            >
              <option value="time">По времени</option>
              <option value="reps">По повторениям</option>
              <option value="sets">По подходам</option>
              <option value="combined">Комбинированная</option>
            </select>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="Коэф. за минуту"
                value={newExercise.activityPerMinute}
                onChange={event =>
                  setNewExercise(prev => ({
                    ...prev,
                    activityPerMinute: Number(event.target.value)
                  }))
                }
              />
              <input
                className="input"
                type="number"
                step="0.001"
                placeholder="Коэф. за повтор"
                value={newExercise.activityPerRep}
                onChange={event =>
                  setNewExercise(prev => ({
                    ...prev,
                    activityPerRep: Number(event.target.value)
                  }))
                }
              />
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="Коэф. за подход"
                value={newExercise.activityPerSet}
                onChange={event =>
                  setNewExercise(prev => ({
                    ...prev,
                    activityPerSet: Number(event.target.value)
                  }))
                }
              />
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="Базовый коэф."
                value={newExercise.activityBase}
                onChange={event =>
                  setNewExercise(prev => ({
                    ...prev,
                    activityBase: Number(event.target.value)
                  }))
                }
              />
              <input
                className="input"
                type="number"
                step="0.05"
                placeholder="Множитель интенсивности"
                value={newExercise.intensityMultiplier}
                onChange={event =>
                  setNewExercise(prev => ({
                    ...prev,
                    intensityMultiplier: Number(event.target.value)
                  }))
                }
              />
            </div>
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
                      .split('\n')
                      .map(step => step.trim())
                      .filter(Boolean),
                    cues: [],
                    mistakes: [],
                    regressions: [],
                    progressions: [],
                    activityMetrics: {
                      perMinute: newExercise.activityPerMinute,
                      perRep: newExercise.activityPerRep,
                      perSet: newExercise.activityPerSet,
                      base: newExercise.activityBase,
                      calculationModel: newExercise.calculationModel,
                      intensityMultiplier: newExercise.intensityMultiplier
                    }
                  });
                  return { ...state };
                });
                setNewExercise({
                  name: '',
                  tags: '',
                  steps: '',
                  activityPerMinute: 0.04,
                  activityPerRep: 0.01,
                  activityPerSet: 0.12,
                  activityBase: 0.2,
                  calculationModel: 'combined',
                  intensityMultiplier: 1
                });
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
            <label className="text-sm font-semibold text-slate-600">Модель расчёта</label>
            <select
              className="input"
              value={newMovementActivity.calculationModel}
              onChange={event =>
                setNewMovementActivity(prev => ({
                  ...prev,
                  calculationModel: event.target.value as typeof newMovementActivity.calculationModel
                }))
              }
            >
              <option value="time">По времени</option>
              <option value="distance">По дистанции</option>
              <option value="steps">По шагам</option>
              <option value="stairs">По пролётам</option>
              <option value="combined">Комбинированная</option>
            </select>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="Коэф. за минуту"
                value={newMovementActivity.perMinute}
                onChange={event =>
                  setNewMovementActivity(prev => ({
                    ...prev,
                    perMinute: Number(event.target.value)
                  }))
                }
              />
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="Коэф. за км"
                value={newMovementActivity.perKm}
                onChange={event =>
                  setNewMovementActivity(prev => ({
                    ...prev,
                    perKm: Number(event.target.value)
                  }))
                }
              />
              <input
                className="input"
                type="number"
                step="0.00001"
                placeholder="Коэф. за шаг"
                value={newMovementActivity.perStep}
                onChange={event =>
                  setNewMovementActivity(prev => ({
                    ...prev,
                    perStep: Number(event.target.value)
                  }))
                }
              />
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="Коэф. за пролет"
                value={newMovementActivity.perFlight}
                onChange={event =>
                  setNewMovementActivity(prev => ({
                    ...prev,
                    perFlight: Number(event.target.value)
                  }))
                }
              />
              <input
                className="input"
                type="number"
                step="0.05"
                placeholder="Множитель интенсивности"
                value={newMovementActivity.intensityMultiplier}
                onChange={event =>
                  setNewMovementActivity(prev => ({
                    ...prev,
                    intensityMultiplier: Number(event.target.value)
                  }))
                }
              />
            </div>
            <button
              className="btn-primary w-full"
              onClick={() => {
                if (!newMovementActivity.name) return;
                updateData(state => {
                  state.library.movementActivities.push({
                    id: crypto.randomUUID(),
                    name: newMovementActivity.name,
                    kind: newMovementActivity.kind,
                    activityMetrics: {
                      perMinute: newMovementActivity.perMinute,
                      perKm: newMovementActivity.perKm,
                      perStep: newMovementActivity.perStep,
                      perFlight: newMovementActivity.perFlight,
                      calculationModel: newMovementActivity.calculationModel,
                      intensityMultiplier: newMovementActivity.intensityMultiplier
                    }
                  });
                  return { ...state };
                });
                setNewMovementActivity({
                  name: '',
                  kind: 'march',
                  perMinute: 0.03,
                  perKm: 0.3,
                  perStep: 0.00008,
                  perFlight: 0.05,
                  calculationModel: 'combined',
                  intensityMultiplier: 1
                });
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
