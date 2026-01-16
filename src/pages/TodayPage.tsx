import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import { formatDate, todayISO } from '../utils/date';
import { TaskInstance } from '../types';

const statusLabels: Record<TaskInstance['status'], string> = {
  planned: 'Запланировано',
  done: 'Сделано',
  skipped: 'Пропущено'
};

const TodayPage = () => {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [detailTask, setDetailTask] = useState<TaskInstance | null>(null);
  const { data, updateData, addActivityMinutes, addSmoking, addWeight, addFoodEntry } = useAppStore();

  const dayPlan = data.planner.dayPlans.find(plan => plan.date === selectedDate);

  const libraryRefs = useMemo(() => {
    if (!detailTask?.assignedRefs) return [];
    return detailTask.assignedRefs.map(ref => {
      switch (ref.kind) {
        case 'protocol':
          return data.library.protocols.find(item => item.id === ref.refId);
        case 'exercise':
          return data.library.exercises.find(item => item.id === ref.refId);
        case 'recipe':
          return data.library.recipes.find(item => item.id === ref.refId);
        case 'rule':
          return data.library.rules.find(item => item.id === ref.refId);
        case 'product':
          return data.library.products.find(item => item.id === ref.refId);
        default:
          return null;
      }
    });
  }, [detailTask, data.library]);

  const updateTaskStatus = (taskId: string, status: TaskInstance['status']) => {
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
      if (!plan) return state;
      plan.tasks = plan.tasks.map(task =>
        task.id === taskId ? { ...task, status } : task
      );
      return { ...state };
    });
  };

  const updateTaskNotes = (taskId: string, notes: string) => {
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === selectedDate);
      if (!plan) return state;
      plan.tasks = plan.tasks.map(task => (task.id === taskId ? { ...task, notes } : task));
      return { ...state };
    });
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Сегодня</h1>
        <div className="card p-4">
          <label className="text-sm font-semibold text-slate-600">Дата</label>
          <input
            type="date"
            value={selectedDate}
            onChange={event => setSelectedDate(event.target.value)}
            className="input mt-2"
          />
          <p className="mt-2 text-sm text-slate-500">{formatDate(selectedDate)}</p>
        </div>
      </header>

      <div className="card p-4">
        <h2 className="section-title">Быстрые действия</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button className="btn-secondary" onClick={() => addActivityMinutes(10, 'stairs')}>
            +10 мин лестницы
          </button>
          <button className="btn-secondary" onClick={() => addActivityMinutes(15, 'march')}>
            +15 мин марша
          </button>
          <button className="btn-secondary" onClick={() => addSmoking(1, 'быстрый лог')}>
            +1 сигарета
          </button>
          <button className="btn-secondary" onClick={() => addWeight(72.0)}>
            Лог веса (72.0)
          </button>
          <button
            className="btn-secondary col-span-2"
            onClick={() =>
              addFoodEntry(selectedDate, {
                id: '',
                kind: 'product',
                refId: 'prod-greek-yogurt',
                grams: 200,
                notes: 'Йогурт + банан',
                time: new Date().toISOString().slice(11, 16)
              })
            }
          >
            Добавить йогурт+банан
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="section-title">Карточки дня</h2>
        {dayPlan ? (
          dayPlan.tasks.map(task => (
            <div key={task.id} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{statusLabels[task.status]}</p>
                  <h3 className="text-lg font-semibold">
                    {data.library.taskTemplates.find(tpl => tpl.id === task.templateRef)?.title ??
                      'Задача'}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => updateTaskStatus(task.id, 'done')}
                  >
                    Готово
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => updateTaskStatus(task.id, 'skipped')}
                  >
                    Пропуск
                  </button>
                </div>
              </div>
              <textarea
                className="input min-h-[80px]"
                placeholder="Заметка"
                value={task.notes ?? ''}
                onChange={event => updateTaskNotes(task.id, event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <span className="badge">{task.target ? 'Есть цель' : 'Без цели'}</span>
                <button className="btn-secondary" onClick={() => setDetailTask(task)}>
                  Детали
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="card p-4 text-sm text-slate-500">
            На эту дату нет плана. Перейдите в планер и добавьте задачи.
          </div>
        )}
      </div>

      <BottomSheet
        open={Boolean(detailTask)}
        title="Детали из словаря"
        onClose={() => setDetailTask(null)}
      >
        {libraryRefs.length === 0 ? (
          <p className="text-sm text-slate-500">Нет привязанных сущностей.</p>
        ) : (
          libraryRefs.map((ref, index) => (
            <div key={index} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">{ref?.name ?? 'Детали'}</p>
              {'description' in (ref ?? {}) && ref?.description ? (
                <p className="mt-1 text-sm text-slate-600">{ref.description}</p>
              ) : null}
              {'text' in (ref ?? {}) && ref?.text ? (
                <p className="mt-1 text-sm text-slate-600">{ref.text}</p>
              ) : null}
            </div>
          ))
        )}
      </BottomSheet>
    </section>
  );
};

export default TodayPage;
