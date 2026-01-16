import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import { todayISO } from '../utils/date';

const tabs = ['Упражнения', 'Протоколы', 'Продукты', 'Рецепты', 'Шаблоны', 'Правила'] as const;

type LibraryTab = (typeof tabs)[number];

const LibraryPage = () => {
  const { data, addFoodEntry, updateData } = useAppStore();
  const [active, setActive] = useState<LibraryTab>('Упражнения');
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<{ title: string; body: string } | null>(null);

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

  const addTemplateToToday = (templateId: string) => {
    updateData(state => {
      const today = todayISO();
      let dayPlan = state.planner.dayPlans.find(plan => plan.date === today);
      if (!dayPlan) {
        dayPlan = { id: crypto.randomUUID(), date: today, tasks: [] };
        state.planner.dayPlans.push(dayPlan);
      }
      dayPlan.tasks.push({
        id: crypto.randomUUID(),
        templateRef: templateId,
        status: 'planned'
      });
      return { ...state };
    });
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Словари</h1>
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
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
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
          <div key={item.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">{'title' in item ? item.title : item.name}</h3>
                {'kcalPer100g' in item ? (
                  <p className="text-sm text-slate-500">{item.kcalPer100g} ккал/100г</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setSheet({
                      title: 'title' in item ? item.title : item.name,
                      body:
                        'text' in item
                          ? item.text
                          : 'steps' in item
                          ? item.steps.join('\n')
                          : item.description ?? 'Описание отсутствует'
                    })
                  }
                >
                  Детали
                </button>
                {active === 'Продукты' && 'kcalPer100g' in item ? (
                  <button
                    className="btn-primary"
                    onClick={() =>
                      addFoodEntry(todayISO(), {
                        id: '',
                        kind: 'product',
                        refId: item.id,
                        grams: 100,
                        time: new Date().toISOString().slice(11, 16)
                      })
                    }
                  >
                    В сегодня
                  </button>
                ) : null}
                {active === 'Рецепты' ? (
                  <button
                    className="btn-primary"
                    onClick={() =>
                      addFoodEntry(todayISO(), {
                        id: '',
                        kind: 'recipe',
                        refId: item.id,
                        servings: 1,
                        time: new Date().toISOString().slice(11, 16)
                      })
                    }
                  >
                    В сегодня
                  </button>
                ) : null}
                {active === 'Шаблоны' ? (
                  <button className="btn-primary" onClick={() => addTemplateToToday(item.id)}>
                    В план дня
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomSheet open={Boolean(sheet)} title={sheet?.title ?? ''} onClose={() => setSheet(null)}>
        <p className="whitespace-pre-line text-sm text-slate-600">{sheet?.body}</p>
      </BottomSheet>
    </section>
  );
};

export default LibraryPage;
