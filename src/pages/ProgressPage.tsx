import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calcFoodEntry } from '../utils/nutrition';

const ranges = [7, 14, 30, 365] as const;

const ProgressPage = () => {
  const { data } = useAppStore();
  const [range, setRange] = useState<(typeof ranges)[number]>(14);

  const chartData = useMemo(() => {
    const dates = new Set<string>();
    data.logs.foodDays.forEach(day => dates.add(day.date));
    data.logs.weight.forEach(log => dates.add(log.dateTime.slice(0, 10)));
    data.logs.waist.forEach(log => dates.add(log.date));
    data.logs.activity.forEach(log => dates.add(log.dateTime.slice(0, 10)));
    data.logs.smoking.forEach(log => dates.add(log.dateTime.slice(0, 10)));

    const sortedDates = Array.from(dates).sort();
    const sliced = sortedDates.slice(-range);

    return sliced.map(date => {
      const foodDay = data.logs.foodDays.find(item => item.date === date);
      const activityMinutes = data.logs.activity
        .filter(item => item.dateTime.slice(0, 10) === date)
        .reduce((sum, item) => sum + item.minutes, 0);
      const cigarettes = data.logs.smoking
        .filter(item => item.dateTime.slice(0, 10) === date)
        .reduce((sum, item) => sum + item.count, 0);
      const weight = data.logs.weight
        .filter(item => item.dateTime.slice(0, 10) === date)
        .slice(-1)[0]?.weightKg;
      const waist = data.logs.waist.filter(item => item.date === date).slice(-1)[0]?.waistCm;
      const calories =
        foodDay?.entries.reduce((sum, entry) => sum + calcFoodEntry(entry, data.library).kcal, 0) ??
        0;

      return {
        date,
        calories: Math.round(calories),
        activityMinutes,
        cigarettes,
        weight,
        waist
      };
    });
  }, [data, range]);

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Прогресс</h1>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ranges.map(value => (
            <button
              key={value}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                range === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setRange(value)}
            >
              {value === 365 ? 'Всё' : `${value}д`}
            </button>
          ))}
        </div>
      </header>

      <div className="card p-4">
        <h2 className="section-title">Калории</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="calories" stroke="#0f172a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="section-title">Вес</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="section-title">Талия</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="waist" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="section-title">Сигареты/активность</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cigarettes" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="activityMinutes" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default ProgressPage;
