import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { todayISO } from '../utils/date';
import {
  calcMovementActivityMetrics,
  calcStepsCoefficient,
  calcTrainingActivityMetrics,
  resolveActivityDefaults
} from '../utils/activity';

const ActivityPage = () => {
  const { data } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const trainingLogs = data.logs.training.filter(log => log.dateTime.slice(0, 10) === selectedDate);
  const movementSessions = data.logs.movementSessions.filter(
    log => log.dateTime.slice(0, 10) === selectedDate
  );
  const movementDay = data.logs.movementDays.find(day => day.date === selectedDate);

  const activityDefaults = resolveActivityDefaults(data.library.activityDefaults);

  const resolveWeightForDateTime = (dateTime: string) =>
    data.logs.weight
      .filter(log => log.dateTime <= dateTime)
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
      .slice(-1)[0]?.weightKg;

  const activityContext = {
    weightKg: resolveWeightForDateTime(`${selectedDate}T23:59:00.000Z`),
    intakeKcal: 0,
    activityCoefficient: 0
  };

  const trainingStats = useMemo(() => {
    const totals = trainingLogs.reduce(
      (sum, log) => {
        const protocol = log.protocolRef
          ? data.library.protocols.find(item => item.id === log.protocolRef)
          : undefined;
        const metrics = calcTrainingActivityMetrics(log, activityDefaults, activityContext, {
          protocol,
          exercises: data.library.exercises
        });
        return {
          minutes: sum.minutes + log.minutes,
          calories: sum.calories + metrics.calories
        };
      },
      { minutes: 0, calories: 0 }
    );
    return { count: trainingLogs.length, ...totals };
  }, [activityDefaults, activityContext, data.library, trainingLogs]);

  const movementStats = useMemo(() => {
    const totals = movementSessions.reduce(
      (sum, log) => {
        const activity = data.library.movementActivities.find(item => item.id === log.activityRef);
        const metrics = calcMovementActivityMetrics(log, activity, activityDefaults, {
          ...activityContext,
          weightKg: resolveWeightForDateTime(log.dateTime)
        });
        return {
          minutes: sum.minutes + log.durationMinutes,
          calories: sum.calories + metrics.calories
        };
      },
      { minutes: 0, calories: 0 }
    );
    return { count: movementSessions.length, ...totals };
  }, [activityDefaults, activityContext, data.library.movementActivities, movementSessions]);

  const steps = movementDay?.steps ?? 0;
  const stepsScore = calcStepsCoefficient(steps, activityDefaults);

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

  const weeklyMovement = useMemo(() => {
    const recentDates = weeklyDates.slice(0, 7);
    const totals = recentDates.map(date => {
      const dayTrainings = data.logs.training.filter(log => log.dateTime.slice(0, 10) === date);
      const dayMovements = data.logs.movementSessions.filter(
        log => log.dateTime.slice(0, 10) === date
      );
      const minutes =
        dayTrainings.reduce((sum, log) => sum + log.minutes, 0) +
        dayMovements.reduce((sum, log) => sum + log.durationMinutes, 0);
      const stepsForDay = data.logs.movementDays.find(day => day.date === date)?.steps ?? 0;
      return { date, minutes, steps: stepsForDay };
    });
    const totalMinutes = totals.reduce((sum, entry) => sum + entry.minutes, 0);
    const averageMinutes = totals.length ? Math.round(totalMinutes / totals.length) : 0;
    const peakSteps = totals.sort((a, b) => b.steps - a.steps)[0];
    return {
      averageMinutes,
      peakSteps: peakSteps?.steps ? peakSteps : null,
      coverage: Math.round((totals.filter(item => item.minutes > 0).length / 7) * 100)
    };
  }, [data.logs.movementDays, data.logs.movementSessions, data.logs.training, weeklyDates]);

  const formatDayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Активность</h1>
        <p className="text-sm text-slate-500">
          Статистический хаб по движению: тренды нагрузок, паттерны активности и прогресс.
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
          <p className="text-xs font-semibold uppercase text-slate-400">Тренировки</p>
          <p className="text-2xl font-semibold">{trainingStats.count}</p>
          <p className="text-xs text-slate-500">
            {trainingStats.minutes} мин · {trainingStats.calories.toFixed(0)} ккал
          </p>
        </div>
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Движение</p>
          <p className="text-2xl font-semibold">{movementStats.count}</p>
          <p className="text-xs text-slate-500">
            {movementStats.minutes} мин · {movementStats.calories.toFixed(0)} ккал
          </p>
        </div>
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Шаги</p>
          <p className="text-2xl font-semibold">{steps}</p>
          <p className="text-xs text-slate-500">Коэффициент активности: {stepsScore.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-4 space-y-3">
          <h2 className="section-title">Тренировки дня</h2>
          {trainingLogs.length ? (
            <div className="space-y-2">
              {trainingLogs.map(log => {
                const protocol = log.protocolRef
                  ? data.library.protocols.find(item => item.id === log.protocolRef)
                  : undefined;
                return (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold">
                      {protocol?.name ?? 'Тренировка'} · {log.minutes} мин
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(log.dateTime).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Нет записанных тренировок.</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="card p-4 space-y-3">
            <h2 className="section-title">Инсайты недели</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                Средняя нагрузка: <span className="font-semibold">{weeklyMovement.averageMinutes}</span> мин
                в день
              </p>
              <p>
                День с максимумом шагов:{' '}
                <span className="font-semibold">{weeklyMovement.peakSteps?.date ?? '—'}</span> ·{' '}
                {weeklyMovement.peakSteps?.steps ?? '—'} шагов
              </p>
              <p>
                Покрытие активности: <span className="font-semibold">{weeklyMovement.coverage}%</span>
              </p>
              <p className="text-xs text-slate-500">
                Используйте пики и провалы для корректировки недельной нагрузки.
              </p>
            </div>
          </div>
          <div className="card p-4 space-y-3">
            <h2 className="section-title">Движение и привычки</h2>
            {movementSessions.length ? (
              <div className="space-y-2">
                {movementSessions.map(log => {
                  const activity = data.library.movementActivities.find(
                    item => item.id === log.activityRef
                  );
                  return (
                    <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold">
                        {activity?.name ?? 'Активность'} · {log.durationMinutes} мин
                      </p>
                      <p className="text-xs text-slate-500">
                        Шаги: {log.steps ?? 0} · {log.distanceKm ?? 0} км
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Нет записей о движении.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ActivityPage;
