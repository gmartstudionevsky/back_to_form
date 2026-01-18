import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { todayISO } from '../utils/date';
import { calcFoodEntry, calcMealPlanItem } from '../utils/nutrition';

const mealLabels: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const NutritionPage = () => {
  const { data } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(todayISO());

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

  const weeklyAverage = useMemo(() => {
    const lastDays = data.logs.foodDays
      .filter(day => day.date <= selectedDate)
      .slice(-7);
    if (!lastDays.length) return 0;
    const sum = lastDays.reduce((total, day) => {
      const entries = day.entries ?? [];
      return (
        total +
        entries.reduce((acc, entry) => acc + calcFoodEntry(entry, data.library).kcal, 0)
      );
    }, 0);
    return Math.round(sum / lastDays.length);
  }, [data.library, data.logs.foodDays, selectedDate]);

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

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Питание</h1>
        <p className="text-sm text-slate-500">
          Управление рационом, балансом и качеством питания по дням.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="date"
            className="input w-full sm:max-w-[220px]"
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value)}
          />
          <Link className="btn-secondary w-full sm:w-auto" to="/track">
            Открыть полный трекер питания
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
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

        <div className="card p-4 space-y-3">
          <h2 className="section-title">План и ориентиры</h2>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              План по калориям: <span className="font-semibold">{formatNumber(plannedTotals.kcal)}</span>
            </p>
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
    </section>
  );
};

export default NutritionPage;
