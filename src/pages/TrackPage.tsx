import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calcFoodEntry } from '../utils/nutrition';
import { todayISO } from '../utils/date';

const tabs = ['Питание', 'Активность', 'Курение', 'Измерения', 'Сон'] as const;

const TrackPage = () => {
  const { data, addFoodEntry, addActivityMinutes, addSmoking, addWeight, updateData } = useAppStore();
  const [active, setActive] = useState<(typeof tabs)[number]>('Питание');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [grams, setGrams] = useState(200);

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

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Трекинг</h1>
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
            <h2 className="section-title">Итог дня</h2>
            <p className="mt-2 text-sm text-slate-600">
              Калории: {totals.kcal.toFixed(0)} | Б: {totals.protein.toFixed(1)} г | Ж:{' '}
              {totals.fat.toFixed(1)} г | У: {totals.carb.toFixed(1)} г
            </p>
          </div>
          <div className="card p-4 space-y-3">
            <h2 className="section-title">Добавить продукт</h2>
            <select
              className="input"
              onChange={event => {
                if (!event.target.value) return;
                addFoodEntry(selectedDate, {
                  id: '',
                  kind: 'product',
                  refId: event.target.value,
                  grams,
                  time: new Date().toISOString().slice(11, 16)
                });
              }}
            >
              <option value="">Выберите продукт</option>
              {data.library.products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="input"
              value={grams}
              onChange={event => setGrams(Number(event.target.value))}
              placeholder="Граммы"
            />
            <div className="flex flex-wrap gap-2">
              {data.presets.portions.map(preset => (
                <button
                  key={preset.label}
                  className="btn-secondary"
                  onClick={() => setGrams(preset.grams)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="section-title">Записи</h3>
            <div className="mt-2 space-y-2">
              {foodDay?.entries.map(entry => (
                <div key={entry.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <p className="font-semibold">
                    {entry.kind === 'product'
                      ? data.library.products.find(prod => prod.id === entry.refId)?.name
                      : 'Свободная запись'}
                  </p>
                  <p className="text-slate-500">{entry.grams ?? entry.servings ?? 1} г/порц.</p>
                </div>
              )) ?? <p className="text-sm text-slate-500">Записей нет.</p>}
            </div>
          </div>
        </div>
      )}

      {active === 'Активность' && (
        <div className="space-y-3">
          <div className="card p-4">
            <h2 className="section-title">Быстрые блоки</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button className="btn-secondary" onClick={() => addActivityMinutes(10, 'stairs')}>
                +10 мин лестницы
              </button>
              <button className="btn-secondary" onClick={() => addActivityMinutes(15, 'march')}>
                +15 мин марша
              </button>
              <button className="btn-secondary" onClick={() => addActivityMinutes(20, 'workout')}>
                +20 мин тренировки
              </button>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="section-title">Логи</h3>
            <div className="mt-2 space-y-2">
              {data.logs.activity.length === 0 ? (
                <p className="text-sm text-slate-500">Логи пусты.</p>
              ) : (
                data.logs.activity.slice(-5).map(log => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    {log.type} — {log.minutes} мин
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {active === 'Курение' && (
        <div className="space-y-3">
          <div className="card p-4">
            <h2 className="section-title">Лог сигарет</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button className="btn-secondary" onClick={() => addSmoking(1, 'стресс')}>
                +1 сигарета
              </button>
              <button className="btn-secondary" onClick={() => addSmoking(2, 'еда')}
              >
                +2 сигареты
              </button>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="section-title">Последние записи</h3>
            <div className="mt-2 space-y-2">
              {data.logs.smoking.slice(-5).map(log => (
                <div key={log.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  {log.count} шт — триггер: {log.trigger}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {active === 'Измерения' && (
        <div className="space-y-3">
          <div className="card p-4">
            <h2 className="section-title">Вес</h2>
            <button className="btn-secondary mt-3" onClick={() => addWeight(72.5)}>
              Записать 72.5 кг
            </button>
          </div>
          <div className="card p-4">
            <h2 className="section-title">Талия</h2>
            <button
              className="btn-secondary mt-3"
              onClick={() =>
                updateData(state => {
                  state.logs.waist.push({
                    id: crypto.randomUUID(),
                    date: selectedDate,
                    waistCm: 80
                  });
                  return { ...state };
                })
              }
            >
              Записать 80 см
            </button>
          </div>
        </div>
      )}

      {active === 'Сон' && (
        <div className="space-y-3">
          <div className="card p-4">
            <h2 className="section-title">Якорь сна</h2>
            <button
              className="btn-secondary mt-3"
              onClick={() =>
                updateData(state => {
                  state.logs.sleep.push({
                    id: crypto.randomUUID(),
                    date: selectedDate,
                    wakeTime: '07:30',
                    bedTime: '23:00',
                    anchorMet: true
                  });
                  return { ...state };
                })
              }
            >
              Отметить якорь выполнен
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default TrackPage;
