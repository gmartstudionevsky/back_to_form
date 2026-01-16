import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DayPlan, Period } from '../types';

const PlanPage = () => {
  const { data, updateData } = useAppStore();
  const [name, setName] = useState('Новый период');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const addPeriod = () => {
    if (!startDate || !endDate) return;
    updateData(state => {
      const period: Period = {
        id: crypto.randomUUID(),
        name,
        startDate,
        endDate,
        goals: [],
        notes: ''
      };
      return { ...state, planner: { ...state.planner, periods: [...state.planner.periods, period] } };
    });
    setName('Новый период');
    setStartDate('');
    setEndDate('');
  };

  const addDayPlan = (date: string, periodId?: string) => {
    updateData(state => {
      const plan: DayPlan = {
        id: crypto.randomUUID(),
        date,
        periodId,
        tasks: []
      };
      state.planner.dayPlans.push(plan);
      return { ...state };
    });
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Планер</h1>
        <p className="text-sm text-slate-500">
          Периоды содержат только структуру и ссылки на словари. Внутри дней нет инструкций.
        </p>
      </header>

      <div className="card p-4 space-y-3">
        <h2 className="section-title">Создать период</h2>
        <input
          className="input"
          placeholder="Название"
          value={name}
          onChange={event => setName(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={event => setStartDate(event.target.value)}
          />
          <input
            className="input"
            type="date"
            value={endDate}
            onChange={event => setEndDate(event.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={addPeriod}>
          Добавить период
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="section-title">Периоды</h2>
        {data.planner.periods.map(period => (
          <div key={period.id} className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{period.name}</h3>
                <p className="text-sm text-slate-500">
                  {period.startDate} → {period.endDate}
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={() => addDayPlan(period.startDate, period.id)}
              >
                День +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {period.goals.map(goal => (
                <span key={goal} className="badge">
                  {goal}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="section-title">Дни</h2>
        {data.planner.dayPlans.map(plan => (
          <div key={plan.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">{plan.date}</h3>
                <p className="text-xs text-slate-500">Задач: {plan.tasks.length}</p>
              </div>
              <button className="btn-secondary" onClick={() => addDayPlan(plan.date)}>
                Копия дня
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PlanPage;
