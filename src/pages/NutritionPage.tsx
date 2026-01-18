import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { combineDateTime, currentTimeString, todayISO } from '../utils/date';
import { calcFoodEntry, calcMealPlanItem } from '../utils/nutrition';
import type { DrinkLog, FoodEntry } from '../types';

const mealLabels: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const NutritionPage = () => {
  const {
    data,
    addFoodEntry,
    updateFoodEntry,
    deleteFoodEntry,
    addDrinkLog,
    updateDrinkLog,
    deleteDrinkLog
  } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [foodForm, setFoodForm] = useState({
    id: '',
    meal: 'breakfast' as FoodEntry['meal'],
    title: '',
    time: currentTimeString(),
    kcal: '',
    protein: '',
    fat: '',
    carb: ''
  });
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);
  const [drinkForm, setDrinkForm] = useState({
    id: '',
    drinkId: '',
    portionLabel: '',
    portionMl: '',
    portionsCount: '1',
    time: currentTimeString()
  });
  const [editingDrink, setEditingDrink] = useState<DrinkLog | null>(null);

  const foodDay = data.logs.foodDays.find(day => day.date === selectedDate);
  const dayPlan = data.planner.dayPlans.find(plan => plan.date === selectedDate);
  const drinkLogs = data.logs.drinks.filter(log => log.dateTime.slice(0, 10) === selectedDate);

  const drinkNutritionTotals = useMemo(() => {
    return drinkLogs.reduce(
      (acc, log) => {
        const drink = data.library.drinks.find(item => item.id === log.drinkId);
        const factor = (log.portionMl * log.portionsCount) / 100;
        return {
          kcal: acc.kcal + (drink?.kcalPer100ml ?? 0) * factor,
          protein: acc.protein + (drink?.proteinPer100ml ?? 0) * factor,
          fat: acc.fat + (drink?.fatPer100ml ?? 0) * factor,
          carb: acc.carb + (drink?.carbPer100ml ?? 0) * factor
        };
      },
      { kcal: 0, protein: 0, fat: 0, carb: 0 }
    );
  }, [drinkLogs, data.library.drinks]);

  const totals = useMemo(() => {
    const entries = foodDay?.entries ?? [];
    const foodTotals = entries.reduce(
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
    return {
      kcal: foodTotals.kcal + drinkNutritionTotals.kcal,
      protein: foodTotals.protein + drinkNutritionTotals.protein,
      fat: foodTotals.fat + drinkNutritionTotals.fat,
      carb: foodTotals.carb + drinkNutritionTotals.carb
    };
  }, [data.library, drinkNutritionTotals, foodDay]);

  const plannedTotals = useMemo(() => {
    const plannedMeals = dayPlan?.mealsPlan ? Object.values(dayPlan.mealsPlan).flat() : [];
    return plannedMeals.reduce(
      (sum, item) => {
        const nutrition = calcMealPlanItem(item, data.library);
        return {
          kcal: sum.kcal + nutrition.kcal,
          protein: sum.protein + nutrition.protein,
          fat: sum.fat + nutrition.fat,
          carb: sum.carb + nutrition.carb
        };
      },
      { kcal: 0, protein: 0, fat: 0, carb: 0 }
    );
  }, [dayPlan?.mealsPlan, data.library]);

  const mealCompletion = useMemo(() => {
    if (!dayPlan?.mealsPlan) return { done: 0, total: 0, percent: 0 };
    const allItems = Object.values(dayPlan.mealsPlan).flat();
    const done = allItems.filter(item => item.completed).length;
    const total = allItems.length;
    return {
      done,
      total,
      percent: total ? Math.round((done / total) * 100) : 0
    };
  }, [dayPlan?.mealsPlan]);

  const macroTarget = {
    kcal: dayPlan?.nutritionTargets?.kcal ?? plannedTotals.kcal,
    protein: dayPlan?.nutritionTargets?.protein ?? plannedTotals.protein,
    fat: dayPlan?.nutritionTargets?.fat ?? plannedTotals.fat,
    carb: dayPlan?.nutritionTargets?.carb ?? plannedTotals.carb
  };

  const weeklyDays = useMemo(() => {
    return data.logs.foodDays.filter(day => day.date <= selectedDate).slice(-7);
  }, [data.logs.foodDays, selectedDate]);

  const weeklyAverage = useMemo(() => {
    const lastDays = weeklyDays;
    if (!lastDays.length) return 0;
    const sum = lastDays.reduce((total, day) => {
      const entries = day.entries ?? [];
      return (
        total +
        entries.reduce((acc, entry) => acc + calcFoodEntry(entry, data.library).kcal, 0)
      );
    }, 0);
    return Math.round(sum / lastDays.length);
  }, [data.library, selectedDate, weeklyDays]);

  const weeklyPeak = useMemo(() => {
    if (!weeklyDays.length) return null;
    return weeklyDays
      .map(day => ({
        date: day.date,
        kcal: (day.entries ?? []).reduce(
          (sum, entry) => sum + calcFoodEntry(entry, data.library).kcal,
          0
        )
      }))
      .sort((a, b) => b.kcal - a.kcal)[0];
  }, [data.library, weeklyDays]);

  const weeklyCoverage = Math.round((weeklyDays.length / 7) * 100);

  const weekDates = useMemo(() => {
    const base = new Date(selectedDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() - index);
      return date.toISOString().slice(0, 10);
    });
  }, [selectedDate]);

  const formatDayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });

  const mealSummary = useMemo(() => {
    const entries = foodDay?.entries ?? [];
    const meals = new Map<string, number>();
    entries.forEach(entry => {
      meals.set(entry.meal, (meals.get(entry.meal) ?? 0) + 1);
    });
    return Array.from(meals.entries());
  }, [foodDay?.entries]);

  const formatNumber = (value: number) => value.toFixed(0);
  const percent = (value: number, target?: number) =>
    target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const defaultDrink = data.library.drinks[0];
  const selectedDrink = data.library.drinks.find(item => item.id === drinkForm.drinkId);
  const drinkPortions = selectedDrink?.portions ?? defaultDrink?.portions ?? [];

  useEffect(() => {
    if (!defaultDrink) return;
    setDrinkForm(prev => {
      if (prev.drinkId) return prev;
      const portion = defaultDrink.portions[0];
      return {
        ...prev,
        drinkId: defaultDrink.id,
        portionLabel: portion?.label ?? '',
        portionMl: portion ? String(portion.ml) : ''
      };
    });
  }, [defaultDrink]);

  const startFoodEdit = (entry: FoodEntry) => {
    setEditingFood(entry);
    setFoodForm({
      id: entry.id,
      meal: entry.meal,
      title: entry.title ?? '',
      time: entry.time ?? currentTimeString(),
      kcal: entry.kcalOverride?.toString() ?? '',
      protein: entry.proteinOverride?.toString() ?? '',
      fat: entry.fatOverride?.toString() ?? '',
      carb: entry.carbOverride?.toString() ?? ''
    });
  };

  const resetFoodForm = () => {
    setEditingFood(null);
    setFoodForm({
      id: '',
      meal: 'breakfast',
      title: '',
      time: currentTimeString(),
      kcal: '',
      protein: '',
      fat: '',
      carb: ''
    });
  };

  const saveFoodEntry = () => {
    if (editingFood) {
      updateFoodEntry(selectedDate, {
        ...editingFood,
        meal: foodForm.meal,
        title: foodForm.title || editingFood.title,
        time: foodForm.time || undefined,
        kcalOverride: parseNumber(foodForm.kcal),
        proteinOverride: parseNumber(foodForm.protein),
        fatOverride: parseNumber(foodForm.fat),
        carbOverride: parseNumber(foodForm.carb)
      });
    } else {
      addFoodEntry(selectedDate, {
        id: crypto.randomUUID(),
        meal: foodForm.meal,
        kind: 'free',
        title: foodForm.title || 'Свободный ввод',
        time: foodForm.time || undefined,
        kcalOverride: parseNumber(foodForm.kcal),
        proteinOverride: parseNumber(foodForm.protein),
        fatOverride: parseNumber(foodForm.fat),
        carbOverride: parseNumber(foodForm.carb)
      });
    }
    resetFoodForm();
  };

  const startDrinkEdit = (log: DrinkLog) => {
    setEditingDrink(log);
    setDrinkForm({
      id: log.id,
      drinkId: log.drinkId,
      portionLabel: log.portionLabel,
      portionMl: String(log.portionMl),
      portionsCount: String(log.portionsCount),
      time: new Date(log.dateTime).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  };

  const resetDrinkForm = () => {
    setEditingDrink(null);
    setDrinkForm(prev => ({
      ...prev,
      id: '',
      portionsCount: '1',
      time: currentTimeString()
    }));
  };

  const saveDrinkLog = () => {
    if (!drinkForm.drinkId) return;
    const log = {
      id: editingDrink?.id ?? crypto.randomUUID(),
      drinkId: drinkForm.drinkId,
      portionLabel: drinkForm.portionLabel,
      portionMl: Number(drinkForm.portionMl) || 0,
      portionsCount: Number(drinkForm.portionsCount) || 1,
      dateTime: combineDateTime(selectedDate, drinkForm.time)
    };
    if (editingDrink) {
      updateDrinkLog(log);
    } else {
      addDrinkLog(log);
    }
    resetDrinkForm();
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Питание</h1>
        <p className="text-sm text-slate-500">
          Статистический хаб по рациону: прогресс, паттерны питания и динамика по дням.
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          Сводка показывает значения за выбранную дату и подтягивает ориентиры из плана.
        </div>
        <Link className="btn-secondary w-full sm:w-auto" to="/">
          Внести факты за сегодня
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Калории</p>
          <p className="text-2xl font-semibold">{formatNumber(totals.kcal)} ккал</p>
          <p className="text-xs text-slate-500">
            План: {macroTarget.kcal ? formatNumber(macroTarget.kcal) : '—'} ккал
          </p>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-900"
              style={{ width: `${percent(totals.kcal, macroTarget.kcal)}%` }}
            />
          </div>
        </div>
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">БЖУ</p>
          <p className="text-sm text-slate-600">
            Б {formatNumber(totals.protein)} · Ж {formatNumber(totals.fat)} · У{' '}
            {formatNumber(totals.carb)}
          </p>
          <div className="space-y-2 text-xs text-slate-500">
            <div>
              <span>Белки</span>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${percent(totals.protein, macroTarget.protein)}%` }}
                />
              </div>
            </div>
            <div>
              <span>Жиры</span>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-amber-400"
                  style={{ width: `${percent(totals.fat, macroTarget.fat)}%` }}
                />
              </div>
            </div>
            <div>
              <span>Углеводы</span>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-sky-400"
                  style={{ width: `${percent(totals.carb, macroTarget.carb)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Выполнение плана</p>
          <p className="text-2xl font-semibold">{mealCompletion.percent}%</p>
          <p className="text-xs text-slate-500">
            Выполнено {mealCompletion.done} из {mealCompletion.total} приёмов
          </p>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${mealCompletion.percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="section-title">Последняя неделя</h2>
        <div className="flex flex-wrap gap-2">
          {weekDates.map(date => (
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
            Покрытие дневниками: {weeklyCoverage}%
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Сводка по приёмам пищи</h2>
            <span className="text-xs text-slate-400">
              Средняя калорийность за 7 дней: {weeklyAverage} ккал
            </span>
          </div>
          {mealSummary.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {mealSummary.map(([meal, count]) => (
                <div key={meal} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold">{mealLabels[meal as keyof typeof mealLabels]}</p>
                  <p className="text-xs text-slate-500">Записей: {count}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">За выбранный день нет записей.</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="card p-4 space-y-3">
            <h2 className="section-title">Инсайты недели</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                Покрытие дневниками: <span className="font-semibold">{weeklyCoverage}%</span>
              </p>
              <p>
                Пиковый день: <span className="font-semibold">{weeklyPeak?.date ?? '—'}</span> ·{' '}
                {weeklyPeak ? `${formatNumber(weeklyPeak.kcal)} ккал` : '—'}
              </p>
              <p>
                План по калориям: <span className="font-semibold">{formatNumber(plannedTotals.kcal)}</span>
              </p>
              <p className="text-xs text-slate-500">
                Сравнивайте пики и провалы, чтобы корректировать недельное планирование.
              </p>
            </div>
          </div>
          <div className="card p-4 space-y-3">
            <h2 className="section-title">План и ориентиры</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                План БЖУ: Б {formatNumber(plannedTotals.protein)} · Ж{' '}
                {formatNumber(plannedTotals.fat)} · У {formatNumber(plannedTotals.carb)}
              </p>
              <p>
                Приёмов запланировано: <span className="font-semibold">{mealCompletion.total}</span>
              </p>
              <p className="text-xs text-slate-500">
                Используйте планирование для распределения приёмов пищи на неделю.
              </p>
            </div>
            <Link className="btn-primary w-full" to="/plan">
              Открыть планирование
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">Дневные записи еды</h2>
            <span className="text-xs text-slate-400">{selectedDate}</span>
          </div>
          {foodDay?.entries.length ? (
            <div className="space-y-2">
              {foodDay.entries.map(entry => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">
                      {entry.title ??
                        (entry.kind === 'product' ? 'Продукт' : entry.kind === 'dish' ? 'Блюдо' : 'Запись')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {mealLabels[entry.meal]} · {entry.time ?? 'время не указано'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 sm:text-right">
                    <span>Ккал: {formatNumber(calcFoodEntry(entry, data.library).kcal)}</span>
                    <button className="btn-secondary" onClick={() => startFoodEdit(entry)}>
                      Редактировать
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => deleteFoodEntry(selectedDate, entry.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">За выбранный день нет записей еды.</p>
          )}
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <h3 className="text-sm font-semibold">
              {editingFood ? 'Редактировать запись' : 'Добавить запись'}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-500">
                Приём пищи
                <select
                  className="input mt-1"
                  value={foodForm.meal}
                  onChange={event =>
                    setFoodForm(prev => ({ ...prev, meal: event.target.value as FoodEntry['meal'] }))
                  }
                >
                  {(Object.keys(mealLabels) as FoodEntry['meal'][]).map(meal => (
                    <option key={meal} value={meal}>
                      {mealLabels[meal]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-500">
                Время
                <input
                  className="input input-time mt-1"
                  type="time"
                  value={foodForm.time}
                  onChange={event => setFoodForm(prev => ({ ...prev, time: event.target.value }))}
                />
              </label>
              <label className="text-xs text-slate-500 sm:col-span-2">
                Название
                <input
                  className="input mt-1"
                  placeholder="Например, салат или перекус"
                  value={foodForm.title}
                  onChange={event => setFoodForm(prev => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <input
                className="input"
                type="number"
                placeholder="Ккал"
                value={foodForm.kcal}
                onChange={event => setFoodForm(prev => ({ ...prev, kcal: event.target.value }))}
              />
              <input
                className="input"
                type="number"
                placeholder="Белки"
                value={foodForm.protein}
                onChange={event => setFoodForm(prev => ({ ...prev, protein: event.target.value }))}
              />
              <input
                className="input"
                type="number"
                placeholder="Жиры"
                value={foodForm.fat}
                onChange={event => setFoodForm(prev => ({ ...prev, fat: event.target.value }))}
              />
              <input
                className="input"
                type="number"
                placeholder="Углеводы"
                value={foodForm.carb}
                onChange={event => setFoodForm(prev => ({ ...prev, carb: event.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary w-full" onClick={saveFoodEntry}>
                {editingFood ? 'Сохранить' : 'Добавить'}
              </button>
              {editingFood ? (
                <button className="btn-secondary w-full" onClick={resetFoodForm}>
                  Отмена
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">Напитки за день</h2>
            <span className="text-xs text-slate-400">{selectedDate}</span>
          </div>
          {drinkLogs.length ? (
            <div className="space-y-2">
              {drinkLogs.map(log => {
                const drink = data.library.drinks.find(item => item.id === log.drinkId);
                return (
                  <div
                    key={log.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{drink?.name ?? 'Напиток'}</p>
                      <p className="text-xs text-slate-500">
                        {log.portionLabel} · {log.portionsCount} порц.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 sm:text-right">
                      <span>{Math.round(log.portionMl * log.portionsCount)} мл</span>
                      <button className="btn-secondary" onClick={() => startDrinkEdit(log)}>
                        Редактировать
                      </button>
                      <button className="btn-secondary" onClick={() => deleteDrinkLog(log.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Записей напитков за день нет.</p>
          )}
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <h3 className="text-sm font-semibold">
              {editingDrink ? 'Редактировать напиток' : 'Добавить напиток'}
            </h3>
            <div className="grid gap-2">
              <label className="text-xs text-slate-500">
                Напиток
                <select
                  className="input mt-1"
                  value={drinkForm.drinkId}
                  onChange={event => {
                    const nextDrink = data.library.drinks.find(
                      item => item.id === event.target.value
                    );
                    const nextPortion = nextDrink?.portions[0];
                    setDrinkForm(prev => ({
                      ...prev,
                      drinkId: event.target.value,
                      portionLabel: nextPortion?.label ?? '',
                      portionMl: nextPortion ? String(nextPortion.ml) : ''
                    }));
                  }}
                >
                  {data.library.drinks.map(drink => (
                    <option key={drink.id} value={drink.id}>
                      {drink.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-500">
                  Порция
                  <select
                    className="input mt-1"
                    value={drinkForm.portionLabel}
                    onChange={event => {
                      const portion = drinkPortions.find(item => item.label === event.target.value);
                      setDrinkForm(prev => ({
                        ...prev,
                        portionLabel: event.target.value,
                        portionMl: portion ? String(portion.ml) : prev.portionMl
                      }));
                    }}
                  >
                    {drinkPortions.map(portion => (
                      <option key={portion.label} value={portion.label}>
                        {portion.label} · {portion.ml} мл
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  Кол-во порций
                  <input
                    className="input mt-1"
                    type="number"
                    min={1}
                    value={drinkForm.portionsCount}
                    onChange={event =>
                      setDrinkForm(prev => ({ ...prev, portionsCount: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="text-xs text-slate-500">
                Время
                <input
                  className="input input-time mt-1"
                  type="time"
                  value={drinkForm.time}
                  onChange={event => setDrinkForm(prev => ({ ...prev, time: event.target.value }))}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary w-full" onClick={saveDrinkLog}>
                {editingDrink ? 'Сохранить' : 'Добавить'}
              </button>
              {editingDrink ? (
                <button className="btn-secondary w-full" onClick={resetDrinkForm}>
                  Отмена
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NutritionPage;
