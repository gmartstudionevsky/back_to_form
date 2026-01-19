import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useProfileStore } from '../store/useProfileStore';
import { combineDateTime, currentTimeString, todayISO } from '../utils/date';
import { resolveProductGrams } from '../utils/nutrition';
import type { SmokingLog, SleepLog, WaistLog, WeightLog } from '../types';

const HealthPage = () => {
  const activeProfile = useProfileStore(state =>
    state.profiles.find(profile => profile.id === state.activeProfileId)
  );
  const {
    data,
    addSmokingLog,
    updateSmokingLog,
    deleteSmokingLog,
    addSleepLog,
    updateSleepLog,
    deleteSleepLog,
    addWeightLog,
    updateWeightLog,
    deleteWeightLog,
    addWaistLog,
    updateWaistLog,
    deleteWaistLog
  } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [smokingForm, setSmokingForm] = useState({
    id: '',
    count: '',
    trigger: '',
    time: currentTimeString()
  });
  const [editingSmoking, setEditingSmoking] = useState<SmokingLog | null>(null);
  const [sleepForm, setSleepForm] = useState({
    id: '',
    bedTime: '',
    wakeTime: '',
    quality1to5: '',
    anchorMet: false,
    notes: ''
  });
  const [editingSleep, setEditingSleep] = useState<SleepLog | null>(null);
  const [weightForm, setWeightForm] = useState({
    id: '',
    weightKg: '',
    time: currentTimeString()
  });
  const [editingWeight, setEditingWeight] = useState<WeightLog | null>(null);
  const [waistForm, setWaistForm] = useState({
    id: '',
    waistCm: ''
  });
  const [editingWaist, setEditingWaist] = useState<WaistLog | null>(null);

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
  const weightLogForDate = data.logs.weight.find(log => log.dateTime.slice(0, 10) === selectedDate);
  const waistLogForDate = data.logs.waist.find(log => log.date === selectedDate);

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
    if (entry.kind === 'product' && entry.refId) {
      const product = data.library.products.find(item => item.id === entry.refId);
      if (!product?.hydrationContribution) return sum;
      const grams = resolveProductGrams(product, entry.grams, entry.pieces);
      return sum + grams;
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
  const profileWeight = activeProfile?.metrics?.weightKg;
  const hydrationTarget =
    weightLog?.weightKg ?? profileWeight ? (weightLog?.weightKg ?? profileWeight ?? 0) * 30 : undefined;

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
    const base = new Date(selectedDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() - index);
      return date.toISOString().slice(0, 10);
    });
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

  const startSmokingEdit = (log: SmokingLog) => {
    setEditingSmoking(log);
    setSmokingForm({
      id: log.id,
      count: String(log.count),
      trigger: log.trigger ?? '',
      time: new Date(log.dateTime).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  };

  const resetSmokingForm = () => {
    setEditingSmoking(null);
    setSmokingForm({
      id: '',
      count: '',
      trigger: '',
      time: currentTimeString()
    });
  };

  const saveSmokingLog = () => {
    const count = Number(smokingForm.count);
    if (!Number.isFinite(count) || count <= 0) return;
    const log = {
      id: editingSmoking?.id ?? crypto.randomUUID(),
      dateTime: combineDateTime(selectedDate, smokingForm.time),
      count,
      trigger: smokingForm.trigger
    };
    if (editingSmoking) {
      updateSmokingLog(log);
    } else {
      addSmokingLog(log);
    }
    resetSmokingForm();
  };

  const startSleepEdit = (log: SleepLog) => {
    setEditingSleep(log);
    setSleepForm({
      id: log.id,
      bedTime: log.bedTime ?? '',
      wakeTime: log.wakeTime ?? '',
      quality1to5: log.quality1to5?.toString() ?? '',
      anchorMet: log.anchorMet ?? false,
      notes: log.notes ?? ''
    });
  };

  const resetSleepForm = () => {
    setEditingSleep(null);
    setSleepForm({
      id: '',
      bedTime: '',
      wakeTime: '',
      quality1to5: '',
      anchorMet: false,
      notes: ''
    });
  };

  const saveSleepLog = () => {
    const quality = sleepForm.quality1to5 ? Number(sleepForm.quality1to5) : undefined;
    const log = {
      id: editingSleep?.id ?? crypto.randomUUID(),
      date: selectedDate,
      bedTime: sleepForm.bedTime || undefined,
      wakeTime: sleepForm.wakeTime || undefined,
      anchorMet: sleepForm.anchorMet,
      quality1to5: Number.isFinite(quality) ? quality : undefined,
      notes: sleepForm.notes || undefined
    };
    if (editingSleep) {
      updateSleepLog(log);
    } else {
      addSleepLog(log);
    }
    resetSleepForm();
  };

  const startWeightEdit = (log: WeightLog) => {
    setEditingWeight(log);
    setWeightForm({
      id: log.id,
      weightKg: log.weightKg.toString(),
      time: new Date(log.dateTime).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  };

  const resetWeightForm = () => {
    setEditingWeight(null);
    setWeightForm({
      id: '',
      weightKg: '',
      time: currentTimeString()
    });
  };

  const saveWeightLog = () => {
    const weightKg = Number(weightForm.weightKg);
    if (!Number.isFinite(weightKg) || weightKg <= 0) return;
    const log = {
      id: editingWeight?.id ?? crypto.randomUUID(),
      dateTime: combineDateTime(selectedDate, weightForm.time),
      weightKg
    };
    if (editingWeight) {
      updateWeightLog(log);
    } else {
      addWeightLog(log);
    }
    resetWeightForm();
  };

  const startWaistEdit = (log: WaistLog) => {
    setEditingWaist(log);
    setWaistForm({
      id: log.id,
      waistCm: log.waistCm.toString()
    });
  };

  const resetWaistForm = () => {
    setEditingWaist(null);
    setWaistForm({
      id: '',
      waistCm: ''
    });
  };

  const saveWaistLog = () => {
    const waistCm = Number(waistForm.waistCm);
    if (!Number.isFinite(waistCm) || waistCm <= 0) return;
    const log = {
      id: editingWaist?.id ?? crypto.randomUUID(),
      date: selectedDate,
      waistCm
    };
    if (editingWaist) {
      updateWaistLog(log);
    } else {
      addWaistLog(log);
    }
    resetWaistForm();
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Здоровье</h1>
        <p className="text-sm text-slate-500">
          Статистический хаб здоровья: привычки, сон и динамика самочувствия по дням.
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Сводка фиксирует показатели за выбранную дату и аккумулирует тенденции.
        </p>
        <Link className="btn-secondary w-full sm:w-auto" to="/">
          Внести факты за сегодня
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            Покрытие сна дневниками: {sleepInsights.coverage}%
          </div>
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

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-4 space-y-3">
          <h2 className="section-title">Дневные показатели</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Вес за день</p>
              <p className="text-lg font-semibold">
                {weightLogForDate?.weightKg ? `${weightLogForDate.weightKg} кг` : '—'}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                {weightLogForDate ? (
                  <>
                    <button className="btn-secondary" onClick={() => startWeightEdit(weightLogForDate)}>
                      Редактировать
                    </button>
                    <button className="btn-secondary" onClick={() => deleteWeightLog(weightLogForDate.id)}>
                      Удалить
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Талия за день</p>
              <p className="text-lg font-semibold">
                {waistLogForDate?.waistCm ? `${waistLogForDate.waistCm} см` : '—'}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                {waistLogForDate ? (
                  <>
                    <button className="btn-secondary" onClick={() => startWaistEdit(waistLogForDate)}>
                      Редактировать
                    </button>
                    <button className="btn-secondary" onClick={() => deleteWaistLog(waistLogForDate.id)}>
                      Удалить
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <h3 className="text-sm font-semibold">
              {editingWeight ? 'Редактировать вес' : 'Добавить вес'}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-500">
                Вес (кг)
                <input
                  className="input mt-1"
                  type="number"
                  value={weightForm.weightKg}
                  onChange={event =>
                    setWeightForm(prev => ({ ...prev, weightKg: event.target.value }))
                  }
                />
              </label>
              <label className="text-xs text-slate-500">
                Время
                <input
                  className="input input-time mt-1"
                  type="time"
                  value={weightForm.time}
                  onChange={event => setWeightForm(prev => ({ ...prev, time: event.target.value }))}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary w-full" onClick={saveWeightLog}>
                {editingWeight ? 'Сохранить' : 'Добавить'}
              </button>
              {editingWeight ? (
                <button className="btn-secondary w-full" onClick={resetWeightForm}>
                  Отмена
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <h3 className="text-sm font-semibold">
              {editingWaist ? 'Редактировать талию' : 'Добавить талию'}
            </h3>
            <div className="grid gap-2">
              <label className="text-xs text-slate-500">
                Талия (см)
                <input
                  className="input mt-1"
                  type="number"
                  value={waistForm.waistCm}
                  onChange={event => setWaistForm(prev => ({ ...prev, waistCm: event.target.value }))}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary w-full" onClick={saveWaistLog}>
                {editingWaist ? 'Сохранить' : 'Добавить'}
              </button>
              {editingWaist ? (
                <button className="btn-secondary w-full" onClick={resetWaistForm}>
                  Отмена
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card p-4 space-y-3">
            <h2 className="section-title">Сон</h2>
            {sleepLog ? (
              <div className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold">
                  {sleepLog.bedTime ?? '—'} → {sleepLog.wakeTime ?? '—'} · качество{' '}
                  {sleepLog.quality1to5 ?? '—'}
                </p>
                <p className="text-xs text-slate-500">
                  Якорь: {sleepLog.anchorMet ? 'да' : 'нет'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <button className="btn-secondary" onClick={() => startSleepEdit(sleepLog)}>
                    Редактировать
                  </button>
                  <button className="btn-secondary" onClick={() => deleteSleepLog(sleepLog.id)}>
                    Удалить
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Нет записи сна за этот день.</p>
            )}
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <h3 className="text-sm font-semibold">
                {editingSleep ? 'Редактировать сон' : 'Добавить сон'}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-500">
                  Отбой
                  <input
                    className="input input-time mt-1"
                    type="time"
                    value={sleepForm.bedTime}
                    onChange={event => setSleepForm(prev => ({ ...prev, bedTime: event.target.value }))}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Подъём
                  <input
                    className="input input-time mt-1"
                    type="time"
                    value={sleepForm.wakeTime}
                    onChange={event => setSleepForm(prev => ({ ...prev, wakeTime: event.target.value }))}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Качество (1-5)
                  <input
                    className="input mt-1"
                    type="number"
                    min={1}
                    max={5}
                    value={sleepForm.quality1to5}
                    onChange={event =>
                      setSleepForm(prev => ({ ...prev, quality1to5: event.target.value }))
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={sleepForm.anchorMet}
                    onChange={event =>
                      setSleepForm(prev => ({ ...prev, anchorMet: event.target.checked }))
                    }
                  />
                  Якорь соблюдён
                </label>
              </div>
              <textarea
                className="input min-h-[80px]"
                placeholder="Комментарий"
                value={sleepForm.notes}
                onChange={event => setSleepForm(prev => ({ ...prev, notes: event.target.value }))}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button className="btn-primary w-full" onClick={saveSleepLog}>
                  {editingSleep ? 'Сохранить' : 'Добавить'}
                </button>
                {editingSleep ? (
                  <button className="btn-secondary w-full" onClick={resetSleepForm}>
                    Отмена
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h2 className="section-title">Курение</h2>
            {smokingLogs.length ? (
              <div className="space-y-2">
                {smokingLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">Сигареты: {log.count}</p>
                      <p className="text-xs text-slate-500">{log.trigger || 'Причина не указана'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <button className="btn-secondary" onClick={() => startSmokingEdit(log)}>
                        Редактировать
                      </button>
                      <button className="btn-secondary" onClick={() => deleteSmokingLog(log.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Нет записей о курении.</p>
            )}
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <h3 className="text-sm font-semibold">
                {editingSmoking ? 'Редактировать запись' : 'Добавить запись'}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-500">
                  Кол-во
                  <input
                    className="input mt-1"
                    type="number"
                    value={smokingForm.count}
                    onChange={event =>
                      setSmokingForm(prev => ({ ...prev, count: event.target.value }))
                    }
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Время
                  <input
                    className="input input-time mt-1"
                    type="time"
                    value={smokingForm.time}
                    onChange={event => setSmokingForm(prev => ({ ...prev, time: event.target.value }))}
                  />
                </label>
                <label className="text-xs text-slate-500 sm:col-span-2">
                  Триггер
                  <input
                    className="input mt-1"
                    placeholder="Стресс, рутина, компания"
                    value={smokingForm.trigger}
                    onChange={event =>
                      setSmokingForm(prev => ({ ...prev, trigger: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button className="btn-primary w-full" onClick={saveSmokingLog}>
                  {editingSmoking ? 'Сохранить' : 'Добавить'}
                </button>
                {editingSmoking ? (
                  <button className="btn-secondary w-full" onClick={resetSmokingForm}>
                    Отмена
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

export default HealthPage;
