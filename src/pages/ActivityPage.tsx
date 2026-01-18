import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { combineDateTime, currentTimeString, todayISO } from '../utils/date';
import {
  calcMovementActivityMetrics,
  calcStepsCoefficient,
  calcTrainingActivityMetrics,
  resolveActivityDefaults
} from '../utils/activity';
import type { ActivityLog, MovementSessionLog } from '../types';

const ActivityPage = () => {
  const {
    data,
    addTrainingLog,
    updateTrainingLog,
    deleteTrainingLog,
    addMovementSessionLog,
    updateMovementSessionLog,
    deleteMovementSessionLog,
    setMovementDayLog,
    deleteMovementDayLog
  } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [trainingForm, setTrainingForm] = useState({
    id: '',
    minutes: '',
    time: currentTimeString(),
    protocolRef: ''
  });
  const [editingTraining, setEditingTraining] = useState<ActivityLog | null>(null);
  const [movementForm, setMovementForm] = useState({
    id: '',
    activityRef: '',
    durationMinutes: '',
    distanceKm: '',
    steps: '',
    time: currentTimeString()
  });
  const [editingMovement, setEditingMovement] = useState<MovementSessionLog | null>(null);
  const [stepsInput, setStepsInput] = useState('');

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
    const base = new Date(selectedDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() - index);
      return date.toISOString().slice(0, 10);
    });
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

  useEffect(() => {
    if (!trainingForm.protocolRef && data.library.protocols[0]) {
      setTrainingForm(prev => ({ ...prev, protocolRef: data.library.protocols[0].id }));
    }
    if (!movementForm.activityRef && data.library.movementActivities[0]) {
      setMovementForm(prev => ({ ...prev, activityRef: data.library.movementActivities[0].id }));
    }
  }, [data.library.movementActivities, data.library.protocols, movementForm.activityRef, trainingForm.protocolRef]);

  useEffect(() => {
    setStepsInput(movementDay?.steps?.toString() ?? '');
  }, [movementDay?.steps, selectedDate]);

  const startTrainingEdit = (log: ActivityLog) => {
    setEditingTraining(log);
    setTrainingForm({
      id: log.id,
      minutes: String(log.minutes),
      time: new Date(log.dateTime).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      protocolRef: log.protocolRef ?? ''
    });
  };

  const resetTrainingForm = () => {
    setEditingTraining(null);
    setTrainingForm({
      id: '',
      minutes: '',
      time: currentTimeString(),
      protocolRef: data.library.protocols[0]?.id ?? ''
    });
  };

  const saveTrainingLog = () => {
    const minutes = Number(trainingForm.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const log = {
      id: editingTraining?.id ?? crypto.randomUUID(),
      dateTime: combineDateTime(selectedDate, trainingForm.time),
      type: 'workout' as const,
      minutes,
      protocolRef: trainingForm.protocolRef || undefined
    };
    if (editingTraining) {
      updateTrainingLog(log);
    } else {
      addTrainingLog(log);
    }
    resetTrainingForm();
  };

  const startMovementEdit = (log: MovementSessionLog) => {
    setEditingMovement(log);
    setMovementForm({
      id: log.id,
      activityRef: log.activityRef,
      durationMinutes: String(log.durationMinutes),
      distanceKm: log.distanceKm?.toString() ?? '',
      steps: log.steps?.toString() ?? '',
      time: new Date(log.dateTime).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  };

  const resetMovementForm = () => {
    setEditingMovement(null);
    setMovementForm({
      id: '',
      activityRef: data.library.movementActivities[0]?.id ?? '',
      durationMinutes: '',
      distanceKm: '',
      steps: '',
      time: currentTimeString()
    });
  };

  const saveMovementLog = () => {
    const durationMinutes = Number(movementForm.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return;
    const log = {
      id: editingMovement?.id ?? crypto.randomUUID(),
      dateTime: combineDateTime(selectedDate, movementForm.time),
      activityRef: movementForm.activityRef,
      durationMinutes,
      distanceKm: movementForm.distanceKm ? Number(movementForm.distanceKm) : undefined,
      steps: movementForm.steps ? Number(movementForm.steps) : undefined
    };
    if (editingMovement) {
      updateMovementSessionLog(log);
    } else {
      addMovementSessionLog(log);
    }
    resetMovementForm();
  };

  const saveSteps = () => {
    const stepsValue = Number(stepsInput);
    if (!Number.isFinite(stepsValue)) return;
    setMovementDayLog({ date: selectedDate, steps: stepsValue });
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Активность</h1>
        <p className="text-sm text-slate-500">
          Статистический хаб по движению: тренды нагрузок, паттерны активности и прогресс.
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Сводка показывает активность за выбранную дату и недельные тренды.
        </p>
        <Link className="btn-secondary w-full sm:w-auto" to="/">
          Внести факты за сегодня
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="card p-4 space-y-3">
        <h2 className="section-title">Последняя неделя</h2>
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
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-xs text-slate-500">
            Выберите дату
            <input
              className="input mt-1"
              type="date"
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value)}
            />
          </label>
          <div className="text-xs text-slate-400 sm:text-right">
            Покрытие активности: {weeklyMovement.coverage}%
          </div>
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
                  <div
                    key={log.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">
                        {protocol?.name ?? 'Тренировка'} · {log.minutes} мин
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(log.dateTime).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <button className="btn-secondary" onClick={() => startTrainingEdit(log)}>
                        Редактировать
                      </button>
                      <button className="btn-secondary" onClick={() => deleteTrainingLog(log.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Нет записанных тренировок.</p>
          )}
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <h3 className="text-sm font-semibold">
              {editingTraining ? 'Редактировать тренировку' : 'Добавить тренировку'}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-500">
                Протокол
                <select
                  className="input mt-1"
                  value={trainingForm.protocolRef}
                  onChange={event =>
                    setTrainingForm(prev => ({ ...prev, protocolRef: event.target.value }))
                  }
                >
                  {data.library.protocols.map(protocol => (
                    <option key={protocol.id} value={protocol.id}>
                      {protocol.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-500">
                Время
                <input
                  className="input input-time mt-1"
                  type="time"
                  value={trainingForm.time}
                  onChange={event => setTrainingForm(prev => ({ ...prev, time: event.target.value }))}
                />
              </label>
              <label className="text-xs text-slate-500 sm:col-span-2">
                Минуты
                <input
                  className="input mt-1"
                  type="number"
                  value={trainingForm.minutes}
                  onChange={event =>
                    setTrainingForm(prev => ({ ...prev, minutes: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary w-full" onClick={saveTrainingLog}>
                {editingTraining ? 'Сохранить' : 'Добавить'}
              </button>
              {editingTraining ? (
                <button className="btn-secondary w-full" onClick={resetTrainingForm}>
                  Отмена
                </button>
              ) : null}
            </div>
          </div>
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
                    <div
                      key={log.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold">
                          {activity?.name ?? 'Активность'} · {log.durationMinutes} мин
                        </p>
                        <p className="text-xs text-slate-500">
                          Шаги: {log.steps ?? 0} · {log.distanceKm ?? 0} км
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <button className="btn-secondary" onClick={() => startMovementEdit(log)}>
                          Редактировать
                        </button>
                        <button className="btn-secondary" onClick={() => deleteMovementSessionLog(log.id)}>
                          Удалить
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Нет записей о движении.</p>
            )}
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <h3 className="text-sm font-semibold">
                {editingMovement ? 'Редактировать активность' : 'Добавить активность'}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-500">
                  Активность
                  <select
                    className="input mt-1"
                    value={movementForm.activityRef}
                    onChange={event =>
                      setMovementForm(prev => ({ ...prev, activityRef: event.target.value }))
                    }
                  >
                    {data.library.movementActivities.map(activity => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  Время
                  <input
                    className="input input-time mt-1"
                    type="time"
                    value={movementForm.time}
                    onChange={event => setMovementForm(prev => ({ ...prev, time: event.target.value }))}
                  />
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder="Минуты"
                  value={movementForm.durationMinutes}
                  onChange={event =>
                    setMovementForm(prev => ({ ...prev, durationMinutes: event.target.value }))
                  }
                />
                <input
                  className="input"
                  type="number"
                  placeholder="Дистанция (км)"
                  value={movementForm.distanceKm}
                  onChange={event =>
                    setMovementForm(prev => ({ ...prev, distanceKm: event.target.value }))
                  }
                />
                <input
                  className="input"
                  type="number"
                  placeholder="Шаги"
                  value={movementForm.steps}
                  onChange={event => setMovementForm(prev => ({ ...prev, steps: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button className="btn-primary w-full" onClick={saveMovementLog}>
                  {editingMovement ? 'Сохранить' : 'Добавить'}
                </button>
                {editingMovement ? (
                  <button className="btn-secondary w-full" onClick={resetMovementForm}>
                    Отмена
                  </button>
                ) : null}
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <h3 className="text-sm font-semibold">Шаги за день</h3>
              <input
                className="input"
                type="number"
                placeholder="Количество шагов"
                value={stepsInput}
                onChange={event => setStepsInput(event.target.value)}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button className="btn-primary w-full" onClick={saveSteps}>
                  Сохранить шаги
                </button>
                {movementDay ? (
                  <button
                    className="btn-secondary w-full"
                    onClick={() => deleteMovementDayLog(selectedDate)}
                  >
                    Удалить запись
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ActivityPage;
