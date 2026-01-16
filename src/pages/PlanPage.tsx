import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import { DayPlan, Period, TaskInstance } from '../types';

const timeOptions = [
  { value: '', label: 'Без времени' },
  { value: 'morning', label: 'Утро' },
  { value: 'day', label: 'День' },
  { value: 'evening', label: 'Вечер' }
];

const PlanPage = () => {
  const { data, updateData, createOrGetDayPlan, updateTaskRefsTarget } = useAppStore();
  const [name, setName] = useState('Новый период');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [editorDate, setEditorDate] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskInstance | null>(null);
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [refKind, setRefKind] = useState<
    'protocol' | 'exercise' | 'recipe' | 'rule' | 'product'
  >('protocol');
  const [refId, setRefId] = useState('');

  const refOptions = useMemo(() => {
    switch (refKind) {
      case 'protocol':
        return data.library.protocols.map(item => ({ id: item.id, label: item.name }));
      case 'exercise':
        return data.library.exercises.map(item => ({ id: item.id, label: item.name }));
      case 'recipe':
        return data.library.recipes.map(item => ({ id: item.id, label: item.name }));
      case 'rule':
        return data.library.rules.map(item => ({ id: item.id, label: item.name }));
      case 'product':
        return data.library.products.map(item => ({ id: item.id, label: item.name }));
      default:
        return [];
    }
  }, [data.library, refKind]);

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

  const dayList = useMemo(() => {
    if (!selectedPeriod) return [] as string[];
    const dates: string[] = [];
    const start = new Date(selectedPeriod.startDate);
    const end = new Date(selectedPeriod.endDate);
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().slice(0, 10));
    }
    return dates;
  }, [selectedPeriod]);

  const openDayEditor = (date: string) => {
    createOrGetDayPlan(date, selectedPeriod?.id);
    setEditorDate(date);
  };

  const dayPlan = editorDate
    ? data.planner.dayPlans.find(plan => plan.date === editorDate)
    : undefined;

  const addTaskToDay = (templateId: string) => {
    if (!editorDate) return;
    const template = data.library.taskTemplates.find(item => item.id === templateId);
    if (!template) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.tasks.push({
        id: crypto.randomUUID(),
        templateRef: template.id,
        status: 'planned',
        assignedRefs: template.suggestedRefs ?? [],
        target: template.defaultTarget ?? {}
      });
      return { ...state };
    });
  };

  const moveTask = (taskId: string, direction: 'up' | 'down') => {
    if (!editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      const index = plan.tasks.findIndex(task => task.id === taskId);
      if (index < 0) return { ...state };
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= plan.tasks.length) return { ...state };
      const next = [...plan.tasks];
      const [moved] = next.splice(index, 1);
      next.splice(newIndex, 0, moved);
      plan.tasks = next;
      return { ...state };
    });
  };

  const copyFromPrevDay = () => {
    if (!editorDate) return;
    updateData(state => {
      const current = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!current) return { ...state };
      const prevDate = new Date(editorDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prev = state.planner.dayPlans.find(
        item => item.date === prevDate.toISOString().slice(0, 10)
      );
      if (!prev) return { ...state };
      current.tasks = prev.tasks.map(task => ({
        ...task,
        id: crypto.randomUUID(),
        status: 'planned',
        actual: undefined
      }));
      return { ...state };
    });
  };

  const applyAutoFill = () => {
    if (!selectedPeriod) return;
    updateData(state => {
      const start = new Date(selectedPeriod.startDate);
      const end = new Date(selectedPeriod.endDate);
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const iso = date.toISOString().slice(0, 10);
        let plan = state.planner.dayPlans.find(item => item.date === iso);
        if (!plan) {
          plan = { id: crypto.randomUUID(), date: iso, periodId: selectedPeriod.id, tasks: [] };
          state.planner.dayPlans.push(plan);
        }
        selectedTemplates.forEach(templateId => {
          const template = state.library.taskTemplates.find(item => item.id === templateId);
          if (!template) return;
          plan?.tasks.push({
            id: crypto.randomUUID(),
            templateRef: template.id,
            status: 'planned',
            assignedRefs: template.suggestedRefs ?? [],
            target: template.defaultTarget ?? {}
          });
        });
      }
      return { ...state };
    });
    setAutoFillOpen(false);
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Plan</h1>
        <p className="text-sm text-slate-500">
          Периоды → дни → задачи. Настраивайте цели, ссылки и заметки.
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
        <div className="flex items-center justify-between">
          <h2 className="section-title">Периоды</h2>
          <button
            className="btn-secondary"
            onClick={() => selectedPeriod && setAutoFillOpen(true)}
            disabled={!selectedPeriod}
          >
            Автозаполнение периода
          </button>
        </div>
        {data.planner.periods.map(period => (
          <div key={period.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{period.name}</h3>
                <p className="text-sm text-slate-500">
                  {period.startDate} → {period.endDate}
                </p>
              </div>
              <button className="btn-secondary" onClick={() => setSelectedPeriod(period)}>
                Открыть
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedPeriod && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Дни периода</h2>
            <button className="btn-secondary" onClick={() => setSelectedPeriod(null)}>
              Закрыть
            </button>
          </div>
          {dayList.map(date => {
            const plan = data.planner.dayPlans.find(item => item.date === date);
            return (
              <div key={date} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{date}</p>
                    <p className="text-xs text-slate-500">Задач: {plan?.tasks.length ?? 0}</p>
                  </div>
                  <button className="btn-secondary" onClick={() => openDayEditor(date)}>
                    Редактировать
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet
        open={Boolean(editorDate)}
        title={editorDate ? `День ${editorDate}` : 'День'}
        onClose={() => {
          setEditorDate(null);
          setEditingTask(null);
        }}
      >
        {dayPlan ? (
          <>
            <div className="space-y-2">
              {dayPlan.tasks.map(task => {
                const template = data.library.taskTemplates.find(item => item.id === task.templateRef);
                return (
                  <div key={task.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{template?.title ?? 'Задача'}</p>
                        <p className="text-xs text-slate-500">{template?.type}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-secondary" onClick={() => moveTask(task.id, 'up')}>
                          Вверх
                        </button>
                        <button className="btn-secondary" onClick={() => moveTask(task.id, 'down')}>
                          Вниз
                        </button>
                        <button className="btn-secondary" onClick={() => setEditingTask(task)}>
                          Настройки
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="text-sm font-semibold text-slate-600">Добавить задачу</label>
            <select className="input" onChange={event => addTaskToDay(event.target.value)}>
              <option value="">Выберите шаблон</option>
              {data.library.taskTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>

            <button className="btn-secondary" onClick={copyFromPrevDay}>
              Копировать задачи из предыдущего дня
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500">День не найден.</p>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(editingTask)}
        title="Редактировать задачу"
        onClose={() => setEditingTask(null)}
      >
        {editingTask && editorDate && (
          <>
            <label className="text-sm font-semibold text-slate-600">Цель (ключ)</label>
            <input
              className="input"
              value={Object.keys(editingTask.target ?? {})[0] ?? ''}
              onChange={event =>
                setEditingTask(prev =>
                  prev
                    ? {
                        ...prev,
                        target: event.target.value
                          ? { [event.target.value]: Object.values(prev.target ?? {})[0] ?? '' }
                          : undefined
                      }
                    : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Цель (значение)</label>
            <input
              className="input"
              value={Object.values(editingTask.target ?? {})[0] ?? ''}
              onChange={event =>
                setEditingTask(prev => {
                  if (!prev) return prev;
                  const key = Object.keys(prev.target ?? {})[0] ?? 'value';
                  return { ...prev, target: { [key]: event.target.value } };
                })
              }
            />
            <label className="text-sm font-semibold text-slate-600">Заметки</label>
            <textarea
              className="input min-h-[80px]"
              value={editingTask.notes ?? ''}
              onChange={event =>
                setEditingTask(prev => (prev ? { ...prev, notes: event.target.value } : prev))
              }
            />
            <label className="text-sm font-semibold text-slate-600">Связанные материалы</label>
            <div className="space-y-2">
              {(editingTask.assignedRefs ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">Нет привязок.</p>
              ) : (
                editingTask.assignedRefs?.map((ref, index) => (
                  <div key={`${ref.kind}-${ref.refId}-${index}`} className="flex items-center gap-2">
                    <span className="badge">{ref.kind}</span>
                    <span className="text-xs text-slate-500">{ref.refId}</span>
                    <button
                      className="text-xs text-red-500"
                      onClick={() =>
                        setEditingTask(prev =>
                          prev
                            ? {
                                ...prev,
                                assignedRefs: prev.assignedRefs?.filter(
                                  (_, refIndex) => refIndex !== index
                                )
                              }
                            : prev
                        )
                      }
                    >
                      Удалить
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="input"
                value={refKind}
                onChange={event =>
                  setRefKind(event.target.value as typeof refKind)
                }
              >
                <option value="protocol">Протокол</option>
                <option value="exercise">Упражнение</option>
                <option value="recipe">Рецепт</option>
                <option value="rule">Правило</option>
                <option value="product">Продукт</option>
              </select>
              <select
                className="input"
                value={refId}
                onChange={event => setRefId(event.target.value)}
              >
                <option value="">Выберите</option>
                {refOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-secondary"
              onClick={() => {
                if (!refId) return;
                setEditingTask(prev =>
                  prev
                    ? {
                        ...prev,
                        assignedRefs: [
                          ...(prev.assignedRefs ?? []),
                          { kind: refKind, refId }
                        ]
                      }
                    : prev
                );
                setRefId('');
              }}
            >
              Добавить привязку
            </button>
            <label className="text-sm font-semibold text-slate-600">Время дня</label>
            <select
              className="input"
              value={editingTask.timeOfDay ?? ''}
              onChange={event =>
                setEditingTask(prev =>
                  prev
                    ? {
                        ...prev,
                        timeOfDay: event.target.value
                          ? (event.target.value as TaskInstance['timeOfDay'])
                          : undefined
                      }
                    : prev
                )
              }
            >
              {timeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              className="btn-primary"
              onClick={() => {
                updateTaskRefsTarget(editorDate, editingTask.id, {
                  target: editingTask.target,
                  notes: editingTask.notes,
                  timeOfDay: editingTask.timeOfDay,
                  assignedRefs: editingTask.assignedRefs
                });
                setEditingTask(null);
              }}
            >
              Сохранить
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={autoFillOpen}
        title="Автозаполнение периода"
        onClose={() => setAutoFillOpen(false)}
      >
        <p className="text-sm text-slate-500">
          Выберите шаблоны, которые будут добавлены в каждый день периода.
        </p>
        <div className="space-y-2">
          {data.library.taskTemplates.map(template => (
            <label key={template.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedTemplates.includes(template.id)}
                onChange={event =>
                  setSelectedTemplates(prev =>
                    event.target.checked
                      ? [...prev, template.id]
                      : prev.filter(id => id !== template.id)
                  )
                }
              />
              <span>{template.title}</span>
            </label>
          ))}
        </div>
        <button className="btn-primary" onClick={applyAutoFill}>
          Применить
        </button>
      </BottomSheet>
    </section>
  );
};

export default PlanPage;
