import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import { todayISO } from '../utils/date';
import { calcRecipeNutrition } from '../utils/nutrition';
import { FoodEntry, Recipe, TaskTemplate } from '../types';

const tabs = ['Упражнения', 'Протоколы', 'Продукты', 'Рецепты', 'Шаблоны', 'Правила'] as const;

type LibraryTab = (typeof tabs)[number];

type FoodSheetItem = {
  kind: 'product' | 'recipe';
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
  const [foodForm, setFoodForm] = useState({
    meal: 'breakfast' as FoodEntry['meal'],
    grams: 120,
    servings: 1,
    time: ''
  });
  const [taskDate, setTaskDate] = useState(todayISO());

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
      case 'Рецепты':
        return data.library.recipes.filter(item => match(item.name));
      case 'Шаблоны':
        return data.library.taskTemplates.filter(item => match(item.title));
      case 'Правила':
        return data.library.rules.filter(item => match(item.name));
      default:
        return [];
    }
  }, [active, data.library, query]);

  const openFoodSheet = (item: FoodSheetItem) => {
    setFoodForm({ meal: 'breakfast', grams: 120, servings: 1, time: '' });
    setFoodSheet(item);
  };

  const addTemplateToDate = (template: TaskTemplate, date: string) => {
    createOrGetDayPlan(date);
    updateData(state => {
      const dayPlan = state.planner.dayPlans.find(plan => plan.date === date);
      if (!dayPlan) return { ...state };
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
        <h1 className="text-2xl font-bold">Library</h1>
        <input
          className="input"
          placeholder="Поиск"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
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

      <div className="space-y-3">
        {filtered.map(item => (
          <div key={(item as any).id} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  {'title' in item ? (item as any).title : (item as any).name}
                </h3>
                {'kcalPer100g' in item ? (
                  <p className="text-sm text-slate-500">{(item as any).kcalPer100g} ккал/100г</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => setDetailItem(item)}>
                  Подробнее
                </button>
                {active === 'Продукты' && 'kcalPer100g' in item ? (
                  <button
                    className="btn-primary"
                    onClick={() => openFoodSheet({ kind: 'product', refId: (item as any).id })}
                  >
                    Добавить в питание
                  </button>
                ) : null}
                {active === 'Рецепты' ? (
                  <button
                    className="btn-primary"
                    onClick={() => openFoodSheet({ kind: 'recipe', refId: (item as any).id })}
                  >
                    Добавить в питание
                  </button>
                ) : null}
                {active === 'Шаблоны' ? (
                  <button className="btn-primary" onClick={() => setTaskSheet(item as TaskTemplate)}>
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
              <p className="text-xs font-semibold uppercase text-slate-400">Steps</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as any).steps.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Cues</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as any).cues.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Mistakes</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as any).mistakes.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Regressions</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as any).regressions.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Progressions</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as any).progressions.map((step: string, index: number) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
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
              <p className="text-xs font-semibold uppercase text-slate-400">Ingredients</p>
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
              <p className="text-xs font-semibold uppercase text-slate-400">Steps</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(detailItem as Recipe).steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-400">Nutrition per serving</p>
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
                <p className="text-xs font-semibold uppercase text-slate-400">Presets</p>
                <div className="mt-2 flex flex-wrap gap-2">
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
              className="btn-primary"
              onClick={() => {
                addFoodEntry(todayISO(), {
                  id: '',
                  kind: foodSheet.kind,
                  refId: foodSheet.refId,
                  grams: foodSheet.kind === 'product' ? foodForm.grams : undefined,
                  servings: foodSheet.kind === 'recipe' ? foodForm.servings : undefined,
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
              className="btn-primary"
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
    </section>
  );
};

export default LibraryPage;
