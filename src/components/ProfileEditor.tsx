import { useMemo, useState } from 'react';
import { ProfileAccess, ProfileGoal, ProfileGoalHorizon, ProfileGoalKind, UserProfile } from '../types';
import { goalKindLabels } from '../utils/goals';

const activityAccessOptions = [
  'Бег на улице',
  'Беговая дорожка',
  'Велосипед (улица)',
  'Велотренажёр',
  'Степпер',
  'Степпер с эспандерами'
];

const homeEquipmentOptions = [
  'Гантели',
  'Кеттлбелл (гири)',
  'Штанга',
  'Резинки/эспандеры',
  'Турник'
];

const gymEquipmentOptions = [
  'Силовые тренажёры',
  'Блочные тренажёры',
  'Свободные веса',
  'Кардио-тренажёры'
];

type ProfileEditorProps = {
  profile: UserProfile;
  submitLabel: string;
  onSubmit: (profile: UserProfile) => void;
  onLogout?: () => void;
  description?: string;
  completeSetup?: boolean;
};

const toggleAccessItem = (items: string[], value: string) =>
  items.includes(value) ? items.filter(item => item !== value) : [...items, value];

export const ProfileEditor = ({
  profile,
  submitLabel,
  onSubmit,
  onLogout,
  description,
  completeSetup
}: ProfileEditorProps) => {
  const defaultAccess: ProfileAccess = {
    activity: [],
    homeEquipment: [],
    gymEquipment: [],
    customEquipment: []
  };
  const metrics = profile.metrics ?? {};
  const [name, setName] = useState(profile.name ?? '');
  const [gender, setGender] = useState(metrics.gender ?? '');
  const [age, setAge] = useState(metrics.age?.toString() ?? '');
  const [heightCm, setHeightCm] = useState(metrics.heightCm?.toString() ?? '');
  const [weightKg, setWeightKg] = useState(metrics.weightKg?.toString() ?? '');
  const [bodyFatPercent, setBodyFatPercent] = useState(
    metrics.bodyFatPercent?.toString() ?? ''
  );
  const [muscleMassKg, setMuscleMassKg] = useState(
    metrics.muscleMassKg?.toString() ?? ''
  );
  const [readinessLevel, setReadinessLevel] = useState(
    profile.readinessLevel ?? 'beginner'
  );
  const [fitnessLevel, setFitnessLevel] = useState(
    profile.currentState?.fitnessLevel?.toString() ?? ''
  );
  const [readinessNote, setReadinessNote] = useState(profile.currentState?.readinessNote ?? '');
  const [longGoals, setLongGoals] = useState<ProfileGoal[]>(profile.goals?.longTerm ?? []);
  const [shortGoals, setShortGoals] = useState<ProfileGoal[]>(profile.goals?.shortTerm ?? []);
  const [goalDraft, setGoalDraft] = useState({
    title: '',
    horizon: 'short' as ProfileGoalHorizon,
    kind: 'custom' as ProfileGoalKind
  });
  const [access, setAccess] = useState<ProfileAccess>(profile.access ?? defaultAccess);
  const [customEquipmentDraft, setCustomEquipmentDraft] = useState('');

  const goalKindOptions = useMemo(
    () =>
      (Object.keys(goalKindLabels) as ProfileGoalKind[]).map(key => ({
        value: key,
        label: goalKindLabels[key]
      })),
    []
  );

  const addGoal = () => {
    const title = goalDraft.title.trim();
    if (!title) return;
    const goal: ProfileGoal = {
      id: crypto.randomUUID(),
      title,
      kind: goalDraft.kind,
      horizon: goalDraft.horizon
    };
    if (goalDraft.horizon === 'long') {
      setLongGoals(prev => [...prev, goal]);
    } else {
      setShortGoals(prev => [...prev, goal]);
    }
    setGoalDraft(prev => ({ ...prev, title: '' }));
  };

  const removeGoal = (goalId: string, horizon: ProfileGoalHorizon) => {
    if (horizon === 'long') {
      setLongGoals(prev => prev.filter(goal => goal.id !== goalId));
      return;
    }
    setShortGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  const addCustomEquipment = () => {
    const trimmed = customEquipmentDraft.trim();
    if (!trimmed) return;
    if (access.customEquipment.includes(trimmed)) {
      setCustomEquipmentDraft('');
      return;
    }
    setAccess(prev => ({ ...prev, customEquipment: [...prev.customEquipment, trimmed] }));
    setCustomEquipmentDraft('');
  };

  const removeCustomEquipment = (item: string) => {
    setAccess(prev => ({
      ...prev,
      customEquipment: prev.customEquipment.filter(value => value !== item)
    }));
  };

  const submit = () => {
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || undefined,
      metrics: {
        gender: gender || undefined,
        age: age ? Number(age) : undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        bodyFatPercent: bodyFatPercent ? Number(bodyFatPercent) : undefined,
        muscleMassKg: muscleMassKg ? Number(muscleMassKg) : undefined
      },
      readinessLevel,
      currentState: {
        fitnessLevel: fitnessLevel ? Number(fitnessLevel) : undefined,
        readinessNote: readinessNote.trim() || undefined,
        updatedAt: new Date().toISOString()
      },
      goals: {
        longTerm: longGoals,
        shortTerm: shortGoals
      },
      access,
      setupCompleted: completeSetup ? true : profile.setupCompleted,
      updatedAt: new Date().toISOString()
    };
    onSubmit(updated);
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Профайл</h1>
        <p className="text-sm text-slate-500">
          {description ?? 'Заполните индивидуальные данные и цели для персональных расчётов.'}
        </p>
      </header>

      <div className="card space-y-4 p-4">
        <h2 className="section-title">Личные данные</h2>
        <label className="text-xs text-slate-500">
          Имя
          <input className="input mt-1" value={name} onChange={event => setName(event.target.value)} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-500">
            Пол
            <select
              className="input mt-1"
              value={gender}
              onChange={event => setGender(event.target.value)}
            >
              <option value="">Не указано</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
              <option value="other">Другое</option>
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Возраст
            <input
              className="input mt-1"
              type="number"
              min={0}
              value={age}
              onChange={event => setAge(event.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500">
            Рост (см)
            <input
              className="input mt-1"
              type="number"
              min={0}
              value={heightCm}
              onChange={event => setHeightCm(event.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500">
            Вес (кг)
            <input
              className="input mt-1"
              type="number"
              min={0}
              value={weightKg}
              onChange={event => setWeightKg(event.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500">
            Жир, %
            <input
              className="input mt-1"
              type="number"
              min={0}
              value={bodyFatPercent}
              onChange={event => setBodyFatPercent(event.target.value)}
            />
          </label>
          <label className="text-xs text-slate-500">
            Мышечная масса (кг)
            <input
              className="input mt-1"
              type="number"
              min={0}
              value={muscleMassKg}
              onChange={event => setMuscleMassKg(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="card space-y-4 p-4">
        <h2 className="section-title">Текущее состояние</h2>
        <label className="text-xs text-slate-500">
          Уровень подготовки (1-5)
          <input
            className="input mt-1"
            type="number"
            min={1}
            max={5}
            value={fitnessLevel}
            onChange={event => setFitnessLevel(event.target.value)}
          />
        </label>
        <label className="text-xs text-slate-500">
          Комментарий
          <textarea
            className="input mt-1 min-h-[88px]"
            value={readinessNote}
            onChange={event => setReadinessNote(event.target.value)}
          />
        </label>
        <label className="text-xs text-slate-500">
          Уровень
          <select
            className="input mt-1"
            value={readinessLevel}
            onChange={event => setReadinessLevel(event.target.value as UserProfile['readinessLevel'])}
          >
            <option value="beginner">Новичок</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </label>
        <p className="text-xs text-slate-400">
          Авто-оценка: {profile.currentState?.autoLevel ? `${profile.currentState.autoLevel}/5` : '—'}{' '}
          {profile.currentState?.autoSummary ? `· ${profile.currentState.autoSummary}` : ''}
        </p>
      </div>

      <div className="card space-y-4 p-4">
        <h2 className="section-title">Цели</h2>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Долгосрочные</p>
          <div className="flex flex-wrap gap-2">
            {longGoals.map(goal => (
              <span key={goal.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {goal.title}
                <button
                  className="ml-2 text-slate-400 hover:text-slate-700"
                  type="button"
                  onClick={() => removeGoal(goal.id, 'long')}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Краткосрочные</p>
          <div className="flex flex-wrap gap-2">
            {shortGoals.map(goal => (
              <span key={goal.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {goal.title}
                <button
                  className="ml-2 text-slate-400 hover:text-slate-700"
                  type="button"
                  onClick={() => removeGoal(goal.id, 'short')}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
          <input
            className="input"
            placeholder="Новая цель"
            value={goalDraft.title}
            onChange={event => setGoalDraft(prev => ({ ...prev, title: event.target.value }))}
          />
          <select
            className="input"
            value={goalDraft.kind}
            onChange={event => setGoalDraft(prev => ({ ...prev, kind: event.target.value as ProfileGoalKind }))}
          >
            {goalKindOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={goalDraft.horizon}
            onChange={event => setGoalDraft(prev => ({ ...prev, horizon: event.target.value as ProfileGoalHorizon }))}
          >
            <option value="short">Краткосрочная</option>
            <option value="long">Долгосрочная</option>
          </select>
          <button className="btn-secondary" type="button" onClick={addGoal}>
            Добавить
          </button>
        </div>
      </div>

      <div className="card space-y-4 p-4">
        <h2 className="section-title">Доступ к активности и инвентарю</h2>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Активность</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {activityAccessOptions.map(option => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={access.activity.includes(option)}
                  onChange={() =>
                    setAccess(prev => ({
                      ...prev,
                      activity: toggleAccessItem(prev.activity, option)
                    }))
                  }
                />
                {option}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Домашний инвентарь</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {homeEquipmentOptions.map(option => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={access.homeEquipment.includes(option)}
                  onChange={() =>
                    setAccess(prev => ({
                      ...prev,
                      homeEquipment: toggleAccessItem(prev.homeEquipment, option)
                    }))
                  }
                />
                {option}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Зал</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {gymEquipmentOptions.map(option => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={access.gymEquipment.includes(option)}
                  onChange={() =>
                    setAccess(prev => ({
                      ...prev,
                      gymEquipment: toggleAccessItem(prev.gymEquipment, option)
                    }))
                  }
                />
                {option}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-400">Дополнительно</p>
          <div className="flex flex-wrap gap-2">
            {access.customEquipment.map(item => (
              <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {item}
                <button
                  className="ml-2 text-slate-400 hover:text-slate-700"
                  type="button"
                  onClick={() => removeCustomEquipment(item)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input flex-1"
              placeholder="Добавить инвентарь"
              value={customEquipmentDraft}
              onChange={event => setCustomEquipmentDraft(event.target.value)}
            />
            <button className="btn-secondary" type="button" onClick={addCustomEquipment}>
              Добавить
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button className="btn-primary w-full" onClick={submit}>
          {submitLabel}
        </button>
        {onLogout ? (
          <button className="btn-secondary w-full" type="button" onClick={onLogout}>
            Выйти
          </button>
        ) : null}
      </div>
    </section>
  );
};
