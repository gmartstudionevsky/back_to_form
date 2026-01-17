import { useAppStore } from '../store/useAppStore';
import { calcFoodEntry } from '../utils/nutrition';
import { seedData } from '../data/seed';

const SettingsPage = () => {
  const { data, setData } = useAppStore();

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'btf-export.json';
    anchor.click();
  };

  const importJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    setData(parsed);
    event.target.value = '';
  };

  const exportCsv = () => {
    const dates = new Set<string>();
    data.logs.foodDays.forEach(day => dates.add(day.date));
    data.logs.training.forEach(log => dates.add(log.dateTime.slice(0, 10)));
    data.logs.movementSessions.forEach(log => dates.add(log.dateTime.slice(0, 10)));
    data.logs.movementDays.forEach(day => dates.add(day.date));
    data.logs.smoking.forEach(log => dates.add(log.dateTime.slice(0, 10)));
    data.logs.weight.forEach(log => dates.add(log.dateTime.slice(0, 10)));
    data.logs.waist.forEach(log => dates.add(log.date));

    const rows = Array.from(dates)
      .sort()
      .map(date => {
        const foodDay = data.logs.foodDays.find(item => item.date === date);
        const totals =
          foodDay?.entries.reduce(
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
          ) ?? { kcal: 0, protein: 0, fat: 0, carb: 0 };

        const trainingMinutes = data.logs.training
          .filter(item => item.dateTime.slice(0, 10) === date)
          .reduce((sum, item) => sum + item.minutes, 0);
        const movementSteps = data.logs.movementDays.find(item => item.date === date)?.steps ?? '';
        const cigarettes = data.logs.smoking
          .filter(item => item.dateTime.slice(0, 10) === date)
          .reduce((sum, item) => sum + item.count, 0);
        const weight = data.logs.weight
          .filter(item => item.dateTime.slice(0, 10) === date)
          .slice(-1)[0]?.weightKg ?? '';
        const waist = data.logs.waist.filter(item => item.date === date).slice(-1)[0]?.waistCm ?? '';
        const plan = data.planner.dayPlans.find(plan => plan.date === date);
        const plannedMeals = plan?.mealsPlan ? Object.values(plan.mealsPlan).flat() : [];
        const doneRatio = plannedMeals.length
          ? `${plannedMeals.filter(item => item.completed).length}/${plannedMeals.length}`
          : '';

        return [
          date,
          Math.round(totals.kcal),
          totals.protein.toFixed(1),
          totals.fat.toFixed(1),
          totals.carb.toFixed(1),
          trainingMinutes,
          movementSteps,
          cigarettes,
          weight,
          waist,
          doneRatio,
          foodDay?.notes ?? ''
        ].join(',');
      });

    const header =
      'date,calories,protein,fat,carb,training_minutes,movement_steps,cigarettes,weight,waist,plan_done_ratio,notes';
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'btf-summary.csv';
    anchor.click();
  };

  const resetData = () => {
    if (!confirm('Сбросить все данные?')) return;
    setData(seedData);
    window.location.reload();
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-sm text-slate-500">Экспорт, импорт и сброс данных.</p>
      </header>

      <div className="card p-4 space-y-3">
        <h2 className="section-title">Экспорт / импорт</h2>
        <button className="btn-primary w-full" onClick={exportJson}>
          Экспорт JSON
        </button>
        <input type="file" accept="application/json" className="input" onChange={importJson} />
        <button className="btn-secondary w-full" onClick={exportCsv}>
          Экспорт CSV summary
        </button>
        <p className="text-xs text-slate-500">Фото в JSON не включаются.</p>
      </div>

      <div className="card p-4">
        <h2 className="section-title">Сброс</h2>
        <button className="btn-secondary mt-3 w-full" onClick={resetData}>
          Сбросить все данные
        </button>
      </div>
    </section>
  );
};

export default SettingsPage;
