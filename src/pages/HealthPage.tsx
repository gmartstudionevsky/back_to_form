import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { todayISO } from '../utils/date';

const HealthPage = () => {
  const { data } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const smokingLogs = data.logs.smoking.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const sleepLog = data.logs.sleep.find(log => log.date === selectedDate);
  const weightLog = [...data.logs.weight]
    .filter(log => log.dateTime.slice(0, 10) <= selectedDate)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    .slice(-1)[0];
  const waistLog = data.logs.waist
    .filter(log => log.date <= selectedDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-1)[0];

  const drinkLogs = data.logs.drinks.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const drinkTotalMl = drinkLogs.reduce(
    (sum, log) => sum + log.portionMl * log.portionsCount,
    0
  );
  const drinkHydrationMl = drinkLogs.reduce((sum, log) => {
    const drink = data.library.drinks.find(item => item.id === log.drinkId);
    const factor = drink?.hydrationFactor ?? 1;
    return sum + log.portionMl * log.portionsCount * factor;
  }, 0);
  const foodDay = data.logs.foodDays.find(day => day.date === selectedDate);
  const foodHydrationMl = (foodDay?.entries ?? []).reduce((sum, entry) => {
    if (entry.kind === 'product' && entry.refId && entry.grams) {
      const product = data.library.products.find(item => item.id === entry.refId);
      if (!product?.hydrationContribution) return sum;
      return sum + entry.grams;
    }
    if (entry.kind === 'dish' && entry.refId) {
      const recipe = data.library.recipes.find(item => item.id === entry.refId);
      if (!recipe?.hydrationContribution) return sum;
      const totalGrams = recipe.ingredients.reduce(
        (recipeSum, ingredient) => recipeSum + ingredient.grams,
        0
      );
      if (!totalGrams || !recipe.servings) return sum;
      const servings = entry.servings ?? 1;
      return sum + (totalGrams / recipe.servings) * servings;
    }
    return sum;
  }, 0);
  const hydrationEquivalent = drinkHydrationMl + foodHydrationMl;
  const hydrationTarget = weightLog?.weightKg ? weightLog.weightKg * 30 : undefined;

  const parseTimeToMinutes = (time?: string) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const sleepDuration = useMemo(() => {
    if (!sleepLog) return null;
    const bed = parseTimeToMinutes(sleepLog.bedTime);
    const wake = parseTimeToMinutes(sleepLog.wakeTime);
    if (bed === null || wake === null) return null;
    let duration = wake - bed;
    if (duration <= 0) duration += 24 * 60;
    return duration;
  }, [sleepLog]);

  const formatDuration = (minutes?: number | null) => {
    if (!minutes && minutes !== 0) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const hydrationPercent = hydrationTarget
    ? Math.min(100, Math.round((hydrationEquivalent / hydrationTarget) * 100))
    : 0;

  const weeklyDates = useMemo(() => {
    const base = new Date(todayISO());
    const options = Array.from({ length: 10 }, (_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() - index);
      return date.toISOString().slice(0, 10);
    });
    if (!options.includes(selectedDate)) {
      options.unshift(selectedDate);
    }
    return options;
  }, [selectedDate]);

  const sleepInsights = useMemo(() => {
    const recentDates = weeklyDates.slice(0, 7);
    const logs = data.logs.sleep.filter(log => recentDates.includes(log.date));
    if (!logs.length) return { average: '—', anchorRate: '—', coverage: 0 };
    const durations = logs
      .map(log => {
        const bed = parseTimeToMinutes(log.bedTime ?? '');
        const wake = parseTimeToMinutes(log.wakeTime ?? '');
        if (bed === null || wake === null) return null;
        let diff = wake - bed;
        if (diff <= 0) diff += 24 * 60;
        return diff;
      })
      .filter((value): value is number => value !== null);
    const averageMinutes = durations.length
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null;
    const anchorRate = Math.round((logs.filter(log => log.anchorMet).length / logs.length) * 100);
    return {
      average: averageMinutes ? formatDuration(averageMinutes) : '—',
      anchorRate: Number.isNaN(anchorRate) ? '—' : `${anchorRate}%`,
      coverage: Math.round((logs.length / 7) * 100)
    };
  }, [data.logs.sleep, parseTimeToMinutes, weeklyDates]);

  const formatDayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Здоровье</h1>
        <p className="text-sm text-slate-500">
          Статистический хаб здоровья: привычки, сон и динамика самочувствия по дням.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {weeklyDates.map(date => (
              <button
                key={date}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  selectedDate === date ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
                onClick={() => setSelectedDate(date)}
              >
                {formatDayLabel(date)}
              </button>
            ))}
          </div>
          <Link className="btn-secondary w-full sm:w-auto" to="/">
            Внести факты за сегодня
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Водный баланс</p>
          <p className="text-2xl font-semibold">{Math.round(hydrationEquivalent)} мл</p>
          <p className="text-xs text-slate-500">
            Напитки: {Math.round(drinkTotalMl)} мл · План:{' '}
            {hydrationTarget ? Math.round(hydrationTarget) : '—'} мл
          </p>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-sky-500"
              style={{ width: `${hydrationPercent}%` }}
            />
          </div>
        </div>
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Сон</p>
          <p className="text-2xl font-semibold">{formatDuration(sleepDuration)}</p>
          <p className="text-xs text-slate-500">
            Качество: {sleepLog?.quality1to5 ?? '—'} · Якорь:{' '}
            {sleepLog?.anchorMet ? 'да' : 'нет'}
          </p>
        </div>
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Курение</p>
          <p className="text-2xl font-semibold">{smokingLogs.length}</p>
          <p className="text-xs text-slate-500">Записей за день</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-4 space-y-3">
          <h2 className="section-title">Сводка показателей тела</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Вес</p>
              <p className="text-lg font-semibold">
                {weightLog?.weightKg ? `${weightLog.weightKg} кг` : '—'}
              </p>
              <p className="text-xs text-slate-500">
                {weightLog ? weightLog.dateTime.slice(0, 10) : 'Нет измерений'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Талия</p>
              <p className="text-lg font-semibold">
                {waistLog?.waistCm ? `${waistLog.waistCm} см` : '—'}
              </p>
              <p className="text-xs text-slate-500">
                {waistLog ? waistLog.date : 'Нет измерений'}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Сводка помогает отслеживать динамику веса и водного баланса.
          </p>
        </div>

        <div className="space-y-3">
          <div className="card p-4 space-y-3">
            <h2 className="section-title">Инсайты недели</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                Средняя длительность сна: <span className="font-semibold">{sleepInsights.average}</span>
              </p>
              <p>
                Якорь соблюдён: <span className="font-semibold">{sleepInsights.anchorRate}</span>
              </p>
              <p>
                Покрытие сна дневниками: <span className="font-semibold">{sleepInsights.coverage}%</span>
              </p>
              <p className="text-xs text-slate-500">
                Отмечайте отклонения — они помогают скорректировать режим.
              </p>
            </div>
          </div>
          <div className="card p-4 space-y-3">
            <h2 className="section-title">Привычки и самочувствие</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center justify-between">
                <span>Сигареты</span>
                <span className="font-semibold">{smokingLogs.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Вода и напитки</span>
                <span className="font-semibold">{Math.round(drinkTotalMl)} мл</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Сон</span>
                <span className="font-semibold">{formatDuration(sleepDuration)}</span>
              </li>
            </ul>
            <Link className="btn-primary w-full" to="/plan">
              Запланировать привычки
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HealthPage;
