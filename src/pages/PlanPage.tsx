import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useAppStore } from '../store/useAppStore';
import {
  DayPlan,
  FoodEntry,
  MealComponent,
  MealComponentType,
  MealPlanItem,
  NutritionTag,
  NutritionTargets,
  Period,
  TaskInstance,
  TimeOfDay,
  WorkoutPlanItem
} from '../types';
import { calcMealPlanItem } from '../utils/nutrition';
import { todayISO } from '../utils/date';
import {
  getDefaultMealTime,
  getDefaultTimeForTimeOfDay,
  getTimeOfDayFromTime,
  timeOfDayLabels
} from '../utils/timeOfDay';

const tabs = ['Обзор', 'Периоды', 'Рацион', 'Активность'] as const;

type Tab = (typeof tabs)[number];

type MealDraft = {
  meal: FoodEntry['meal'];
  kind: MealPlanItem['kind'];
  refId?: string;
  title: string;
  grams: number;
  servings: number;
  cheatCategory: MealPlanItem['cheatCategory'];
  nutritionTags: NutritionTag[];
  plannedKcal: string;
  plannedProtein: string;
  plannedFat: string;
  plannedCarb: string;
  plannedTime: string;
  notes: string;
};

type WorkoutDraft = {
  timeOfDay: WorkoutPlanItem['timeOfDay'];
  kind: WorkoutPlanItem['kind'];
  protocolRef: string;
  plannedTime: string;
  plannedMinutes: number;
  isRequired: boolean;
  movementActivityRef: string;
  notes: string;
};

type TaskDraft = {
  templateRef: string;
  timeOfDay: TimeOfDay;
  notes: string;
  target: Record<string, string>;
  assignedRefs: TaskInstance['assignedRefs'];
};

type MealComponentDraft = {
  meal: FoodEntry['meal'];
  type: MealComponentType;
  recipeRef: string;
  portion: string;
  extra: boolean;
  notes: string;
};

const mealLabels: Record<FoodEntry['meal'], string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const nutritionTagLabels: Record<NutritionTag, string> = {
  snack: 'Перекус',
  cheat: 'Читмил',
  healthy: 'Правильное питание'
};

const PlanPage = () => {
  const { data, updateData, createOrGetDayPlan } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('Обзор');
  const [name, setName] = useState('Новый период');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [editorDate, setEditorDate] = useState<string | null>(null);
  const [mealSheet, setMealSheet] = useState<MealDraft | null>(null);
  const [workoutSheet, setWorkoutSheet] = useState<WorkoutDraft | null>(null);
  const [taskSheet, setTaskSheet] = useState<TaskDraft | null>(null);
  const [componentSheet, setComponentSheet] = useState<MealComponentDraft | null>(null);
  const [periodGoalInput, setPeriodGoalInput] = useState('');
  const [periodDefaults, setPeriodDefaults] = useState({
    mealTimes: {
      breakfast: '08:30',
      lunch: '13:30',
      dinner: '19:30',
      snack: '16:30'
    },
    nutritionTargets: {
      kcal: '',
      protein: '',
      fat: '',
      carb: '',
      meals: ''
    },
    activityTargets: {
      coefficient: '',
      trainingMinutes: '',
      movementMinutes: '',
      steps: '',
      distanceKm: '',
      kcal: ''
    },
    requirements: {
      requireWeight: false,
      requireWaist: false,
      requireFront: false,
      requireSide: false,
      smokingTargetMax: '',
      kcalTarget: '',
      sleepWakeTarget: '',
      sleepDurationTargetMinutes: ''
    },
    tasks: [] as string[]
  });
  const [menuCopy, setMenuCopy] = useState({
    sourceDate: '',
    startDate: '',
    endDate: ''
  });
  const canAddPeriod = Boolean(startDate && endDate && startDate <= endDate);
  const canCopyMenu = Boolean(
    menuCopy.sourceDate && menuCopy.startDate && menuCopy.endDate && menuCopy.startDate <= menuCopy.endDate
  );

  const todayDate = todayISO();
  const todayPlan = data.planner.dayPlans.find(plan => plan.date === todayDate);

  useEffect(() => {
    if (!selectedPeriod && data.planner.periods.length) {
      setSelectedPeriod(data.planner.periods[0]);
    }
  }, [data.planner.periods, selectedPeriod]);

  useEffect(() => {
    if (!selectedPeriod) return;
    const firstPlan = data.planner.dayPlans.find(
      plan => plan.date >= selectedPeriod.startDate && plan.date <= selectedPeriod.endDate
    );
    if (!firstPlan) return;
    setPeriodDefaults(prev => ({
      ...prev,
      mealTimes: {
        breakfast: firstPlan.mealTimes?.breakfast ?? prev.mealTimes.breakfast,
        lunch: firstPlan.mealTimes?.lunch ?? prev.mealTimes.lunch,
        dinner: firstPlan.mealTimes?.dinner ?? prev.mealTimes.dinner,
        snack: firstPlan.mealTimes?.snack ?? prev.mealTimes.snack
      },
      nutritionTargets: {
        kcal: firstPlan.nutritionTargets?.kcal?.toString() ?? prev.nutritionTargets.kcal,
        protein: firstPlan.nutritionTargets?.protein?.toString() ?? prev.nutritionTargets.protein,
        fat: firstPlan.nutritionTargets?.fat?.toString() ?? prev.nutritionTargets.fat,
        carb: firstPlan.nutritionTargets?.carb?.toString() ?? prev.nutritionTargets.carb,
        meals: firstPlan.nutritionTargets?.meals?.toString() ?? prev.nutritionTargets.meals
      },
      activityTargets: {
        coefficient:
          firstPlan.activityTargets?.coefficient?.toString() ?? prev.activityTargets.coefficient,
        trainingMinutes:
          firstPlan.activityTargets?.trainingMinutes?.toString() ??
          prev.activityTargets.trainingMinutes,
        movementMinutes:
          firstPlan.activityTargets?.movementMinutes?.toString() ??
          prev.activityTargets.movementMinutes,
        steps: firstPlan.activityTargets?.steps?.toString() ?? prev.activityTargets.steps,
        distanceKm:
          firstPlan.activityTargets?.distanceKm?.toString() ?? prev.activityTargets.distanceKm,
        kcal: firstPlan.activityTargets?.kcal?.toString() ?? prev.activityTargets.kcal
      },
      requirements: {
        requireWeight: firstPlan.requirements.requireWeight,
        requireWaist: firstPlan.requirements.requireWaist,
        requireFront: firstPlan.requirements.requirePhotos.includes('front'),
        requireSide: firstPlan.requirements.requirePhotos.includes('side'),
        smokingTargetMax: firstPlan.requirements.smokingTargetMax?.toString() ?? '',
        kcalTarget: firstPlan.requirements.kcalTarget?.toString() ?? '',
        sleepWakeTarget: firstPlan.requirements.sleepWakeTarget ?? '',
        sleepDurationTargetMinutes:
          firstPlan.requirements.sleepDurationTargetMinutes?.toString() ?? ''
      }
    }));
  }, [data.planner.dayPlans, selectedPeriod]);

  const addPeriod = () => {
    if (!canAddPeriod) return;
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
  const mealTimes = dayPlan?.mealTimes ?? {
    breakfast: '',
    lunch: '',
    dinner: '',
    snack: ''
  };
  const mealComponents = dayPlan?.mealComponents ?? {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  };
  const nutritionTargets = dayPlan?.nutritionTargets ?? {};

  const plannedNutrition = (planDate: string) => {
    const plan = data.planner.dayPlans.find(item => item.date === planDate);
    if (!plan?.mealsPlan) return { kcal: 0, protein: 0, fat: 0, carb: 0 };
    return Object.values(plan.mealsPlan)
      .flat()
      .reduce(
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
  };

  const summarizePlan = (plan?: DayPlan) => {
    if (!plan) return { meals: 0, workouts: 0, tasks: 0, kcal: 0 };
    const meals = Object.values(plan.mealsPlan).flat().length;
    const workouts = plan.workoutsPlan.length;
    const tasks = plan.tasks?.length ?? 0;
    const kcal = Object.values(plan.mealsPlan)
      .flat()
      .reduce((sum, item) => sum + calcMealPlanItem(item, data.library).kcal, 0);
    return { meals, workouts, tasks, kcal };
  };

  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const updateSelectedPeriod = (patch: Partial<Period>) => {
    if (!selectedPeriod) return;
    updateData(state => {
      state.planner.periods = state.planner.periods.map(period =>
        period.id === selectedPeriod.id ? { ...period, ...patch } : period
      );
      return { ...state };
    });
    setSelectedPeriod(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const deleteSelectedPeriod = () => {
    if (!selectedPeriod) return;
    if (!window.confirm(`Удалить период «${selectedPeriod.name}»?`)) return;
    const remaining = data.planner.periods.filter(period => period.id !== selectedPeriod.id);
    updateData(state => {
      state.planner.periods = state.planner.periods.filter(
        period => period.id !== selectedPeriod.id
      );
      state.planner.dayPlans = state.planner.dayPlans.map(plan =>
        plan.periodId === selectedPeriod.id ? { ...plan, periodId: undefined } : plan
      );
      return { ...state };
    });
    setSelectedPeriod(remaining[0] ?? null);
  };

  const addGoalToPeriod = () => {
    if (!selectedPeriod || !periodGoalInput.trim()) return;
    const nextGoals = Array.from(new Set([...selectedPeriod.goals, periodGoalInput.trim()]));
    updateSelectedPeriod({ goals: nextGoals });
    setPeriodGoalInput('');
  };

  const removeGoalFromPeriod = (goal: string) => {
    if (!selectedPeriod) return;
    updateSelectedPeriod({ goals: selectedPeriod.goals.filter(item => item !== goal) });
  };

  const ensureDayPlan = (state: typeof data, date: string) => {
    let plan = state.planner.dayPlans.find(item => item.date === date);
    if (!plan) {
      plan = {
        id: crypto.randomUUID(),
        date,
        periodId: selectedPeriod?.id,
        tasks: [],
        mealsPlan: { breakfast: [], lunch: [], dinner: [], snack: [] },
        mealComponents: { breakfast: [], lunch: [], dinner: [], snack: [] },
        mealTimes: { breakfast: '', lunch: '', dinner: '', snack: '' },
        workoutsPlan: [],
        nutritionTargets: {},
        requirements: {
          requireWeight: false,
          requireWaist: false,
          requirePhotos: [],
          sleepWakeTarget: '07:30',
          sleepDurationTargetMinutes: 450
        }
      };
      state.planner.dayPlans.push(plan);
    }
    return plan;
  };

  const applyPeriodDefaults = () => {
    if (!selectedPeriod) return;
    updateData(state => {
      dayList.forEach(date => {
        const plan = ensureDayPlan(state, date);
        plan.mealTimes = {
          breakfast: periodDefaults.mealTimes.breakfast,
          lunch: periodDefaults.mealTimes.lunch,
          dinner: periodDefaults.mealTimes.dinner,
          snack: periodDefaults.mealTimes.snack
        };
        plan.nutritionTargets = {
          kcal: parseNumber(periodDefaults.nutritionTargets.kcal),
          protein: parseNumber(periodDefaults.nutritionTargets.protein),
          fat: parseNumber(periodDefaults.nutritionTargets.fat),
          carb: parseNumber(periodDefaults.nutritionTargets.carb),
          meals: parseNumber(periodDefaults.nutritionTargets.meals)
        };
        plan.activityTargets = {
          coefficient: parseNumber(periodDefaults.activityTargets.coefficient),
          trainingMinutes: parseNumber(periodDefaults.activityTargets.trainingMinutes),
          movementMinutes: parseNumber(periodDefaults.activityTargets.movementMinutes),
          steps: parseNumber(periodDefaults.activityTargets.steps),
          distanceKm: parseNumber(periodDefaults.activityTargets.distanceKm),
          kcal: parseNumber(periodDefaults.activityTargets.kcal)
        };
        plan.requirements = {
          ...plan.requirements,
          requireWeight: periodDefaults.requirements.requireWeight,
          requireWaist: periodDefaults.requirements.requireWaist,
          requirePhotos: [
            ...(periodDefaults.requirements.requireFront ? ['front'] : []),
            ...(periodDefaults.requirements.requireSide ? ['side'] : [])
          ],
          smokingTargetMax: parseNumber(periodDefaults.requirements.smokingTargetMax),
          kcalTarget: parseNumber(periodDefaults.requirements.kcalTarget),
          sleepWakeTarget: periodDefaults.requirements.sleepWakeTarget,
          sleepDurationTargetMinutes: parseNumber(periodDefaults.requirements.sleepDurationTargetMinutes)
        };
        if (periodDefaults.tasks.length) {
          const templates = state.library.taskTemplates.filter(template =>
            periodDefaults.tasks.includes(template.id)
          );
          plan.tasks = templates.map(template => ({
            id: crypto.randomUUID(),
            templateRef: template.id,
            status: 'planned',
            assignedRefs: template.suggestedRefs ?? [],
            target: template.defaultTarget ?? {},
            timeOfDay: 'morning'
          }));
        }
      });
      return { ...state };
    });
  };

  const autoPlanPeriod = () => {
    if (!selectedPeriod) return;
    const goalsText = selectedPeriod.goals.join(' ').toLowerCase();
    const latestWeight = data.logs.weight.reduce((latest, log) => {
      if (!latest) return log;
      return log.dateTime > latest.dateTime ? log : latest;
    }, undefined as typeof data.logs.weight[number] | undefined);
    const latestWaist = data.logs.waist.reduce((latest, log) => {
      if (!latest) return log;
      return log.date > latest.date ? log : latest;
    }, undefined as typeof data.logs.waist[number] | undefined);
    const latestSleep = data.logs.sleep.reduce((latest, log) => {
      if (!latest) return log;
      return log.date > latest.date ? log : latest;
    }, undefined as typeof data.logs.sleep[number] | undefined);
    const latestSmoking = data.logs.smoking.reduce((latest, log) => {
      if (!latest) return log;
      return log.dateTime > latest.dateTime ? log : latest;
    }, undefined as typeof data.logs.smoking[number] | undefined);

    const weightKg = latestWeight?.weightKg ?? 65;
    const baseKcal = Math.round(weightKg * 30);
    const goalMultiplier = goalsText.includes('набор')
      ? 1.1
      : goalsText.includes('снижен') || goalsText.includes('сброс') || goalsText.includes('минус')
        ? 0.9
        : 1;
    const kcalTarget = Math.round(baseKcal * goalMultiplier);
    const stepsTarget = goalsText.includes('актив') ? 10000 : 8000;
    const movementMinutes = goalsText.includes('движ') ? 30 : 20;
    const trainingMinutes = goalsText.includes('сил') ? 35 : 25;

    const breakfastRecipes = data.library.recipes.filter(item => item.category === 'breakfast');
    const mainRecipes = data.library.recipes.filter(item => item.category === 'main');
    const sideRecipes = data.library.recipes.filter(item => item.category === 'side');
    const saladRecipes = data.library.recipes.filter(item => item.category === 'salad');
    const snackRecipes = data.library.recipes.filter(
      item => item.category === 'snack' || item.category === 'dessert'
    );
    const drinkRecipes = data.library.recipes.filter(item => item.category === 'drink');
    const productSnacks = data.library.products.filter(product =>
      product.nutritionTags?.includes('snack')
    );

    const pick = <T,>(list: T[], index: number, fallback: T) =>
      list.length ? list[index % list.length] : fallback;

    updateData(state => {
      dayList.forEach((date, index) => {
        const plan = ensureDayPlan(state, date);
        const breakfastRecipe =
          breakfastRecipes.length > 0 ? pick(breakfastRecipes, index, breakfastRecipes[0]) : null;
        const mainRecipe = pick(mainRecipes, index, mainRecipes[0] ?? breakfastRecipes[0]);
        const sideRecipe = pick(sideRecipes, index, sideRecipes[0] ?? breakfastRecipes[0]);
        const saladRecipe = pick(saladRecipes, index, saladRecipes[0] ?? breakfastRecipes[0]);
        const snackRecipe = snackRecipes.length
          ? pick(snackRecipes, index, snackRecipes[0])
          : null;
        const drinkRecipe = drinkRecipes.length
          ? pick(drinkRecipes, index, drinkRecipes[0])
          : null;
        const snackProduct = productSnacks.length
          ? pick(productSnacks, index, productSnacks[0])
          : state.library.products[0];

        plan.mealsPlan = {
          breakfast: breakfastRecipe
            ? [
                {
                  id: crypto.randomUUID(),
                  kind: 'dish',
                  refId: breakfastRecipe.id,
                  plannedServings: 1,
                  plannedTime: '08:30',
                  notes: 'Авто-меню: лёгкий старт'
                }
              ]
            : [],
          lunch: [
            {
              id: crypto.randomUUID(),
              kind: 'dish',
              refId: mainRecipe?.id,
              plannedServings: 1,
              plannedTime: '13:30'
            },
            {
              id: crypto.randomUUID(),
              kind: 'dish',
              refId: sideRecipe?.id,
              plannedServings: 1
            },
            {
              id: crypto.randomUUID(),
              kind: 'dish',
              refId: saladRecipe?.id,
              plannedServings: 1
            }
          ],
          dinner: [
            {
              id: crypto.randomUUID(),
              kind: 'dish',
              refId: mainRecipe?.id,
              plannedServings: 1,
              plannedTime: '19:00'
            },
            {
              id: crypto.randomUUID(),
              kind: 'dish',
              refId: sideRecipe?.id,
              plannedServings: 1
            }
          ],
          snack: [
            snackRecipe
              ? {
                  id: crypto.randomUUID(),
                  kind: 'dish',
                  refId: snackRecipe.id,
                  plannedServings: 1,
                  plannedTime: '16:30'
                }
              : {
                  id: crypto.randomUUID(),
                  kind: 'product',
                  refId: snackProduct?.id,
                  plannedGrams: snackProduct?.portionPresets?.[0]?.grams ?? 120,
                  plannedTime: '16:30'
                }
          ]
        };

        if (index % 5 === 4) {
          plan.mealsPlan.snack.push({
            id: crypto.randomUUID(),
            kind: 'cheat',
            title: 'Свободный читмил',
            plannedKcal: 450,
            plannedProtein: 15,
            plannedFat: 20,
            plannedCarb: 55,
            cheatCategory: 'sweets',
            nutritionTags: ['cheat', 'snack'],
            plannedTime: '20:00'
          });
        }

        plan.mealComponents = {
          breakfast: breakfastRecipe
            ? [
                {
                  id: crypto.randomUUID(),
                  type: 'main',
                  recipeRef: breakfastRecipe?.id,
                  portion: '1 порция',
                  notes: 'Фокус на белок'
                }
              ]
            : [],
          lunch: [
            {
              id: crypto.randomUUID(),
              type: 'main',
              recipeRef: mainRecipe?.id,
              portion: '1 порция'
            },
            {
              id: crypto.randomUUID(),
              type: 'side',
              recipeRef: sideRecipe?.id,
              portion: '1 порция'
            },
            {
              id: crypto.randomUUID(),
              type: 'salad',
              recipeRef: saladRecipe?.id,
              portion: '1 порция',
              extra: true
            }
          ],
          dinner: [
            {
              id: crypto.randomUUID(),
              type: 'main',
              recipeRef: mainRecipe?.id,
              portion: '1 порция'
            },
            ...(drinkRecipe
              ? [
                  {
                    id: crypto.randomUUID(),
                    type: 'drink',
                    recipeRef: drinkRecipe?.id,
                    portion: '250 мл'
                  }
                ]
              : [])
          ],
          snack: snackRecipe
            ? [
                {
                  id: crypto.randomUUID(),
                  type: 'dessert',
                  recipeRef: snackRecipe.id,
                  portion: '1 порция'
                }
              ]
            : []
        };

        plan.mealTimes = {
          breakfast: '08:30',
          lunch: '13:30',
          dinner: '19:00',
          snack: '16:30'
        };
        plan.nutritionTargets = {
          kcal: kcalTarget,
          protein: Math.round(weightKg * 1.8),
          fat: Math.round((kcalTarget * 0.25) / 9),
          carb: Math.round((kcalTarget * 0.45) / 4),
          meals: 4
        };
        plan.activityTargets = {
          steps: stepsTarget,
          trainingMinutes,
          movementMinutes,
          coefficient: 1.1
        };
        plan.plannedSteps = stepsTarget;
        plan.requirements = {
          requireWeight: true,
          requireWaist: goalsText.includes('тал') || Boolean(latestWaist),
          requirePhotos: ['front', 'side'],
          smokingTargetMax: latestSmoking?.count ? Math.max(1, latestSmoking.count - 1) : 4,
          kcalTarget,
          sleepWakeTarget: latestSleep?.wakeTime ?? '07:30',
          sleepDurationTargetMinutes: 450
        };
        const templateDefaults = state.library.taskTemplates;
        plan.tasks = templateDefaults.map(template => ({
          id: crypto.randomUUID(),
          templateRef: template.id,
          status: 'planned',
          assignedRefs: template.suggestedRefs ?? [],
          target: template.defaultTarget ?? {},
          timeOfDay: template.type === 'sleep' ? 'evening' : 'morning',
          notes: template.type === 'measurement' ? 'Свериться с текущими данными.' : ''
        }));
        plan.workoutsPlan = [
          {
            id: crypto.randomUUID(),
            timeOfDay: 'morning',
            protocolRef: state.library.protocols[0]?.id,
            isRequired: true,
            kind: 'workout',
            plannedTime: '08:00'
          },
          {
            id: crypto.randomUUID(),
            timeOfDay: 'day',
            plannedMinutes: movementMinutes,
            kind: 'movement',
            movementActivityRef: state.library.movementActivities[0]?.id,
            plannedTime: '12:30'
          },
          {
            id: crypto.randomUUID(),
            timeOfDay: 'evening',
            protocolRef: state.library.protocols[1]?.id,
            isRequired: true,
            kind: 'workout',
            plannedTime: '18:30'
          }
        ];
        plan.notes = 'Авто-план с учетом целей, текущих данных и библиотек.';
      });
      return { ...state };
    });
  };

  const addMealToPlan = () => {
    if (!mealSheet || !editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      const resolveTags = () => {
        const tags = mealSheet.nutritionTags.length ? [...mealSheet.nutritionTags] : [];
        if (mealSheet.kind === 'product' && mealSheet.refId) {
          const product = state.library.products.find(item => item.id === mealSheet.refId);
          if (product?.nutritionTags?.length) {
            tags.push(...product.nutritionTags);
          }
        }
        if (mealSheet.kind === 'dish' && mealSheet.refId) {
          const recipe = state.library.recipes.find(item => item.id === mealSheet.refId);
          if (recipe?.nutritionTags?.length) {
            tags.push(...recipe.nutritionTags);
          }
        }
        if (mealSheet.kind === 'cheat') {
          tags.push('cheat');
        }
        if (mealSheet.meal === 'snack') {
          tags.push('snack');
        }
        return Array.from(new Set(tags));
      };
      const entry: MealPlanItem = {
        id: crypto.randomUUID(),
        kind: mealSheet.kind,
        refId:
          mealSheet.kind === 'product' || mealSheet.kind === 'dish' ? mealSheet.refId : undefined,
        plannedGrams: mealSheet.kind === 'product' ? mealSheet.grams : undefined,
        plannedServings: mealSheet.kind === 'dish' ? mealSheet.servings : undefined,
        title: mealSheet.kind === 'free' || mealSheet.kind === 'cheat' ? mealSheet.title : undefined,
        plannedKcal:
          mealSheet.kind === 'free' || mealSheet.kind === 'cheat'
            ? Number(mealSheet.plannedKcal) || undefined
            : undefined,
        plannedProtein:
          mealSheet.kind === 'free' || mealSheet.kind === 'cheat'
            ? Number(mealSheet.plannedProtein) || undefined
            : undefined,
        plannedFat:
          mealSheet.kind === 'free' || mealSheet.kind === 'cheat'
            ? Number(mealSheet.plannedFat) || undefined
            : undefined,
        plannedCarb:
          mealSheet.kind === 'free' || mealSheet.kind === 'cheat'
            ? Number(mealSheet.plannedCarb) || undefined
            : undefined,
        cheatCategory: mealSheet.kind === 'cheat' ? mealSheet.cheatCategory : undefined,
        nutritionTags: resolveTags(),
        plannedTime: mealSheet.plannedTime?.trim() || undefined,
        notes: mealSheet.notes?.trim() || undefined
      };
      plan.mealsPlan[mealSheet.meal].push(entry);
      return { ...state };
    });
    setMealSheet(null);
  };

  const defaultMovementActivityId = data.library.movementActivities[0]?.id ?? '';

  const addWorkoutToPlan = () => {
    if (!workoutSheet || !editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      const plannedTime = workoutSheet.plannedTime?.trim() || undefined;
      const timeOfDay = plannedTime
        ? getTimeOfDayFromTime(plannedTime)
        : workoutSheet.timeOfDay;
      plan.workoutsPlan.push({
        id: crypto.randomUUID(),
        timeOfDay,
        plannedTime,
        kind: workoutSheet.kind,
        protocolRef: workoutSheet.protocolRef || undefined,
        plannedMinutes: workoutSheet.kind === 'movement' ? workoutSheet.plannedMinutes : undefined,
        isRequired: workoutSheet.isRequired,
        movementActivityRef:
          workoutSheet.kind === 'movement' && workoutSheet.movementActivityRef
            ? workoutSheet.movementActivityRef
            : workoutSheet.kind === 'movement'
              ? defaultMovementActivityId
              : undefined,
        notes: workoutSheet.notes?.trim() || undefined
      });
      return { ...state };
    });
    setWorkoutSheet(null);
  };

  const updateMealTime = (meal: FoodEntry['meal'], time: string) => {
    if (!editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.mealTimes ??= { breakfast: '', lunch: '', dinner: '', snack: '' };
      plan.mealTimes[meal] = time;
      return { ...state };
    });
  };

  const updateNutritionTarget = (field: keyof NutritionTargets, value: number | undefined) => {
    if (!editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.nutritionTargets ??= {};
      plan.nutritionTargets[field] = value;
      return { ...state };
    });
  };

  const updateWorkoutTime = (id: string, time: string) => {
    if (!editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.workoutsPlan = plan.workoutsPlan.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          plannedTime: time || undefined,
          timeOfDay: time ? getTimeOfDayFromTime(time) : item.timeOfDay
        };
      });
      return { ...state };
    });
  };

  const updateWorkoutTimeOfDay = (id: string, timeOfDay: WorkoutPlanItem['timeOfDay']) => {
    if (!editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.workoutsPlan = plan.workoutsPlan.map(item =>
        item.id === id ? { ...item, timeOfDay } : item
      );
      return { ...state };
    });
  };

  const toggleMealSheetTag = (tag: NutritionTag) => {
    setMealSheet(prev => {
      if (!prev) return prev;
      const exists = prev.nutritionTags.includes(tag);
      return {
        ...prev,
        nutritionTags: exists
          ? prev.nutritionTags.filter(item => item !== tag)
          : [...prev.nutritionTags, tag]
      };
    });
  };

  const addTaskToPlan = () => {
    if (!taskSheet || !editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.tasks ??= [];
      plan.tasks.push({
        id: crypto.randomUUID(),
        templateRef: taskSheet.templateRef,
        status: 'planned',
        timeOfDay: taskSheet.timeOfDay,
        notes: taskSheet.notes?.trim() || undefined,
        assignedRefs: taskSheet.assignedRefs ?? [],
        target: Object.fromEntries(
          Object.entries(taskSheet.target).map(([key, value]) => [
            key,
            Number.isFinite(Number(value)) ? Number(value) : value
          ])
        )
      });
      return { ...state };
    });
    setTaskSheet(null);
  };

  const addComponentToPlan = () => {
    if (!componentSheet || !editorDate) return;
    updateData(state => {
      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
      if (!plan) return { ...state };
      plan.mealComponents ??= { breakfast: [], lunch: [], dinner: [], snack: [] };
      const entry: MealComponent = {
        id: crypto.randomUUID(),
        type: componentSheet.type,
        recipeRef: componentSheet.recipeRef || undefined,
        portion: componentSheet.portion,
        extra: componentSheet.extra,
        notes: componentSheet.notes?.trim() || undefined
      };
      plan.mealComponents[componentSheet.meal].push(entry);
      return { ...state };
    });
    setComponentSheet(null);
  };

  const copyMenuRange = () => {
    if (!canCopyMenu) return;
    updateData(state => {
      const sourcePlan = state.planner.dayPlans.find(item => item.date === menuCopy.sourceDate);
      if (!sourcePlan) return { ...state };
      const start = new Date(menuCopy.startDate);
      const end = new Date(menuCopy.endDate);
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const iso = date.toISOString().slice(0, 10);
        let plan = state.planner.dayPlans.find(item => item.date === iso);
        if (!plan) {
          plan = {
            id: crypto.randomUUID(),
            date: iso,
            periodId: selectedPeriod?.id,
            tasks: [],
            mealsPlan: { breakfast: [], lunch: [], dinner: [], snack: [] },
            workoutsPlan: [],
            nutritionTargets: sourcePlan.nutritionTargets ?? {},
            requirements: {
              requireWeight: false,
              requireWaist: false,
              requirePhotos: [],
              sleepWakeTarget: '07:30',
              sleepDurationTargetMinutes: 450
            }
          };
          state.planner.dayPlans.push(plan);
        }
        plan.mealsPlan = JSON.parse(JSON.stringify(sourcePlan.mealsPlan));
        plan.mealComponents = JSON.parse(JSON.stringify(sourcePlan.mealComponents ?? plan.mealComponents));
        plan.mealTimes = sourcePlan.mealTimes ?? plan.mealTimes;
        plan.nutritionTargets = sourcePlan.nutritionTargets ?? plan.nutritionTargets;
      }
      return { ...state };
    });
  };

  const periodStats = useMemo(() => {
    if (!selectedPeriod) return { days: 0, plannedDays: 0, workouts: 0, meals: 0 };
    const plans = data.planner.dayPlans.filter(plan => plan.date >= selectedPeriod.startDate && plan.date <= selectedPeriod.endDate);
    const meals = plans.reduce((sum, plan) => sum + summarizePlan(plan).meals, 0);
    const workouts = plans.reduce((sum, plan) => sum + plan.workoutsPlan.length, 0);
    return {
      days: dayList.length,
      plannedDays: plans.length,
      workouts,
      meals
    };
  }, [data.planner.dayPlans, dayList.length, selectedPeriod]);

  const periodPlans = useMemo(() => {
    if (!selectedPeriod) return [];
    return data.planner.dayPlans.filter(
      plan => plan.date >= selectedPeriod.startDate && plan.date <= selectedPeriod.endDate
    );
  }, [data.planner.dayPlans, selectedPeriod]);

  const periodProductList = useMemo(() => {
    if (!selectedPeriod) return [];
    const map = new Map<string, { name: string; grams: number }>();
    const addProduct = (productId: string, grams: number) => {
      const product = data.library.products.find(item => item.id === productId);
      if (!product) return;
      const existing = map.get(productId) ?? { name: product.name, grams: 0 };
      existing.grams += grams;
      map.set(productId, existing);
    };
    periodPlans.forEach(plan => {
      Object.values(plan.mealsPlan)
        .flat()
        .forEach(item => {
          if (item.kind === 'product' && item.refId && item.plannedGrams) {
            addProduct(item.refId, item.plannedGrams);
          }
          if (item.kind === 'dish' && item.refId) {
            const recipe = data.library.recipes.find(rec => rec.id === item.refId);
            if (!recipe) return;
            const servings = item.plannedServings ?? 1;
            recipe.ingredients.forEach(ingredient => {
              const grams = (ingredient.grams / recipe.servings) * servings;
              addProduct(ingredient.productRef, grams);
            });
          }
        });
    });
    return Array.from(map.values()).sort((a, b) => b.grams - a.grams);
  }, [data.library.products, data.library.recipes, periodPlans, selectedPeriod]);

  const deleteDayPlan = () => {
    if (!editorDate) return;
    const confirmed = window.confirm(`Удалить план на ${editorDate}? Данные дня будут потеряны.`);
    if (!confirmed) return;
    updateData(state => ({
      ...state,
      planner: {
        ...state.planner,
        dayPlans: state.planner.dayPlans.filter(plan => plan.date !== editorDate)
      }
    }));
    setEditorDate(null);
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Планирование</h1>
        <p className="text-sm text-slate-500">
          Формируйте план на периоды, дни и направления — питание, активность и привычки.
        </p>
        <div className="control-row">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'Обзор' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-400">Сегодня</p>
              <p className="text-lg font-semibold">{todayDate}</p>
              <p className="text-xs text-slate-500">
                Приёмов: {summarizePlan(todayPlan).meals} · Активностей:{' '}
                {summarizePlan(todayPlan).workouts}
              </p>
              <button className="btn-secondary w-full" onClick={() => openDayEditor(todayDate)}>
                Открыть редактор дня
              </button>
            </div>
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-400">Период</p>
              <p className="text-lg font-semibold">{selectedPeriod?.name ?? 'Не выбран'}</p>
              <p className="text-xs text-slate-500">
                Дней: {periodStats.days} · Запланировано: {periodStats.plannedDays}
              </p>
              <button className="btn-secondary w-full" onClick={() => setActiveTab('Периоды')}>
                Управлять периодами
              </button>
            </div>
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-400">Рацион</p>
              <p className="text-lg font-semibold">{summarizePlan(todayPlan).kcal.toFixed(0)} ккал</p>
              <p className="text-xs text-slate-500">Планирование меню и целей</p>
              <button className="btn-secondary w-full" onClick={() => setActiveTab('Рацион')}>
                Настроить меню
              </button>
            </div>
          </div>

          {selectedPeriod ? (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Дни периода</h2>
                <span className="text-xs text-slate-400">
                  Тренировок: {periodStats.workouts} · Приёмов: {periodStats.meals}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {dayList.slice(0, 8).map(date => {
                  const plan = data.planner.dayPlans.find(item => item.date === date);
                  const summary = summarizePlan(plan);
                  return (
                    <button
                      key={date}
                      className="rounded-xl border border-slate-200 p-3 text-left text-xs"
                      onClick={() => openDayEditor(date)}
                    >
                      <p className="text-sm font-semibold">{date}</p>
                      <p className="text-slate-500">
                        Питание: {summary.meals} · Активность: {summary.workouts}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card p-4 text-sm text-slate-500">
              Выберите период для детального обзора планирования.
            </div>
          )}
        </div>
      )}

      {activeTab === 'Периоды' && (
        <>
          <div className="card p-4 space-y-3">
            <h2 className="section-title">Создать период</h2>
            <input
              className="input"
              placeholder="Название"
              value={name}
              onChange={event => setName(event.target.value)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <button className="btn-primary w-full" onClick={addPeriod} disabled={!canAddPeriod}>
              Добавить период
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="section-title">Периоды</h2>
            {data.planner.periods.map(period => (
              <button
                key={period.id}
                className={`card flex w-full items-center justify-between p-4 text-left ${
                  selectedPeriod?.id === period.id ? 'border border-slate-900' : ''
                }`}
                onClick={() => setSelectedPeriod(period)}
              >
                <div>
                  <h3 className="text-lg font-semibold">{period.name}</h3>
                  <p className="text-sm text-slate-500">
                    {period.startDate} → {period.endDate}
                  </p>
                </div>
                <span className="text-slate-400">Открыть</span>
              </button>
            ))}
          </div>

          {selectedPeriod ? (
            <div className="card space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Настройки периода</h2>
                <span className="text-xs text-slate-400">ID: {selectedPeriod.id}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs text-slate-500">
                  Название
                  <input
                    className="input mt-1"
                    value={selectedPeriod.name}
                    onChange={event => updateSelectedPeriod({ name: event.target.value })}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Начало
                  <input
                    className="input mt-1"
                    type="date"
                    value={selectedPeriod.startDate}
                    onChange={event => updateSelectedPeriod({ startDate: event.target.value })}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Конец
                  <input
                    className="input mt-1"
                    type="date"
                    value={selectedPeriod.endDate}
                    onChange={event => updateSelectedPeriod({ endDate: event.target.value })}
                  />
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-400">Цели</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPeriod.goals.map(goal => (
                    <span
                      key={goal}
                      className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs"
                    >
                      {goal}
                      <button
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => removeGoalFromPeriod(goal)}
                        type="button"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="input flex-1"
                    placeholder="Добавить цель"
                    value={periodGoalInput}
                    onChange={event => setPeriodGoalInput(event.target.value)}
                  />
                  <button className="btn-secondary" onClick={addGoalToPeriod}>
                    Добавить
                  </button>
                </div>
                <textarea
                  className="input min-h-[88px]"
                  placeholder="Заметки по периоду"
                  value={selectedPeriod.notes ?? ''}
                  onChange={event => updateSelectedPeriod({ notes: event.target.value })}
                />
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <h3 className="text-sm font-semibold">Шаблон дня для периода</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
                  {(Object.keys(mealLabels) as FoodEntry['meal'][]).map(meal => (
                    <label key={meal}>
                      {mealLabels[meal]}
                      <input
                        type="time"
                        className="input input-time mt-1"
                        value={periodDefaults.mealTimes[meal]}
                        onChange={event =>
                          setPeriodDefaults(prev => ({
                            ...prev,
                            mealTimes: { ...prev.mealTimes, [meal]: event.target.value }
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <input
                    className="input"
                    type="number"
                    placeholder="Ккал"
                    value={periodDefaults.nutritionTargets.kcal}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        nutritionTargets: { ...prev.nutritionTargets, kcal: event.target.value }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Белки"
                    value={periodDefaults.nutritionTargets.protein}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        nutritionTargets: {
                          ...prev.nutritionTargets,
                          protein: event.target.value
                        }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Жиры"
                    value={periodDefaults.nutritionTargets.fat}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        nutritionTargets: { ...prev.nutritionTargets, fat: event.target.value }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Углеводы"
                    value={periodDefaults.nutritionTargets.carb}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        nutritionTargets: { ...prev.nutritionTargets, carb: event.target.value }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Приёмы"
                    value={periodDefaults.nutritionTargets.meals}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        nutritionTargets: { ...prev.nutritionTargets, meals: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                  <input
                    className="input"
                    type="number"
                    placeholder="Шаги"
                    value={periodDefaults.activityTargets.steps}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        activityTargets: { ...prev.activityTargets, steps: event.target.value }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Мин трен."
                    value={periodDefaults.activityTargets.trainingMinutes}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        activityTargets: {
                          ...prev.activityTargets,
                          trainingMinutes: event.target.value
                        }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Мин движ."
                    value={periodDefaults.activityTargets.movementMinutes}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        activityTargets: {
                          ...prev.activityTargets,
                          movementMinutes: event.target.value
                        }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Км"
                    value={periodDefaults.activityTargets.distanceKm}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        activityTargets: {
                          ...prev.activityTargets,
                          distanceKm: event.target.value
                        }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Ккал актив."
                    value={periodDefaults.activityTargets.kcal}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        activityTargets: { ...prev.activityTargets, kcal: event.target.value }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Коэфф."
                    value={periodDefaults.activityTargets.coefficient}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        activityTargets: {
                          ...prev.activityTargets,
                          coefficient: event.target.value
                        }
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={periodDefaults.requirements.requireWeight}
                      onChange={event =>
                        setPeriodDefaults(prev => ({
                          ...prev,
                          requirements: {
                            ...prev.requirements,
                            requireWeight: event.target.checked
                          }
                        }))
                      }
                    />
                    Вес
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={periodDefaults.requirements.requireWaist}
                      onChange={event =>
                        setPeriodDefaults(prev => ({
                          ...prev,
                          requirements: {
                            ...prev.requirements,
                            requireWaist: event.target.checked
                          }
                        }))
                      }
                    />
                    Талия
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={periodDefaults.requirements.requireFront}
                      onChange={event =>
                        setPeriodDefaults(prev => ({
                          ...prev,
                          requirements: {
                            ...prev.requirements,
                            requireFront: event.target.checked
                          }
                        }))
                      }
                    />
                    Фото front
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={periodDefaults.requirements.requireSide}
                      onChange={event =>
                        setPeriodDefaults(prev => ({
                          ...prev,
                          requirements: {
                            ...prev.requirements,
                            requireSide: event.target.checked
                          }
                        }))
                      }
                    />
                    Фото side
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    className="input"
                    type="number"
                    placeholder="Лимит сигарет"
                    value={periodDefaults.requirements.smokingTargetMax}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        requirements: {
                          ...prev.requirements,
                          smokingTargetMax: event.target.value
                        }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Ккал лимит"
                    value={periodDefaults.requirements.kcalTarget}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        requirements: {
                          ...prev.requirements,
                          kcalTarget: event.target.value
                        }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="time"
                    placeholder="Подъём"
                    value={periodDefaults.requirements.sleepWakeTarget}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        requirements: {
                          ...prev.requirements,
                          sleepWakeTarget: event.target.value
                        }
                      }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Сон (мин)"
                    value={periodDefaults.requirements.sleepDurationTargetMinutes}
                    onChange={event =>
                      setPeriodDefaults(prev => ({
                        ...prev,
                        requirements: {
                          ...prev.requirements,
                          sleepDurationTargetMinutes: event.target.value
                        }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-slate-400">Задачи по умолчанию</p>
                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    {data.library.taskTemplates.map(template => (
                      <label key={template.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={periodDefaults.tasks.includes(template.id)}
                          onChange={event =>
                            setPeriodDefaults(prev => ({
                              ...prev,
                              tasks: event.target.checked
                                ? [...prev.tasks, template.id]
                                : prev.tasks.filter(id => id !== template.id)
                            }))
                          }
                        />
                        {template.title}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button className="btn-secondary w-full" onClick={applyPeriodDefaults}>
                    Применить шаблон к дням
                  </button>
                  <button className="btn-primary w-full" onClick={autoPlanPeriod}>
                    Автосоставить план
                  </button>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                  <p className="font-semibold">Удаление периода</p>
                  <p className="text-xs text-rose-600">
                    Период будет удалён, а дни останутся без привязки.
                  </p>
                  <button className="btn-secondary mt-3 w-full" onClick={deleteSelectedPeriod}>
                    Удалить период
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {selectedPeriod ? (
            <div className="card p-4 space-y-3">
              <h2 className="section-title">Дни периода</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {dayList.map(date => (
                  <button
                    key={date}
                    className={`btn-secondary w-full ${
                      editorDate === date ? 'border border-slate-900' : ''
                    }`}
                    onClick={() => openDayEditor(date)}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {dayPlan ? (
            <div className="card p-4 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="section-title">Редактор дня · {editorDate}</h2>
                <button
                  className="btn-secondary w-full text-rose-600 sm:w-auto"
                  onClick={deleteDayPlan}
                >
                  Удалить план дня
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Требования</h3>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={dayPlan.requirements.requireWeight}
                      onChange={event =>
                        updateData(state => {
                          const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                          if (!plan) return { ...state };
                          plan.requirements.requireWeight = event.target.checked;
                          return { ...state };
                        })
                      }
                    />
                    Вес
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={dayPlan.requirements.requireWaist}
                      onChange={event =>
                        updateData(state => {
                          const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                          if (!plan) return { ...state };
                          plan.requirements.requireWaist = event.target.checked;
                          return { ...state };
                        })
                      }
                    />
                    Талия
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={dayPlan.requirements.requirePhotos.includes('front')}
                      onChange={event =>
                        updateData(state => {
                          const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                          if (!plan) return { ...state };
                          plan.requirements.requirePhotos = event.target.checked
                            ? Array.from(new Set([...plan.requirements.requirePhotos, 'front']))
                            : plan.requirements.requirePhotos.filter(photo => photo !== 'front');
                          return { ...state };
                        })
                      }
                    />
                    Фото front
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={dayPlan.requirements.requirePhotos.includes('side')}
                      onChange={event =>
                        updateData(state => {
                          const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                          if (!plan) return { ...state };
                          plan.requirements.requirePhotos = event.target.checked
                            ? Array.from(new Set([...plan.requirements.requirePhotos, 'side']))
                            : plan.requirements.requirePhotos.filter(photo => photo !== 'side');
                          return { ...state };
                        })
                      }
                    />
                    Фото side
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    className="input"
                    type="number"
                    placeholder="Лимит сигарет"
                    value={dayPlan.requirements.smokingTargetMax ?? ''}
                    onChange={event =>
                      updateData(state => {
                        const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                        if (!plan) return { ...state };
                        plan.requirements.smokingTargetMax = Number(event.target.value) || undefined;
                        return { ...state };
                      })
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Ккал лимит"
                    value={dayPlan.requirements.kcalTarget ?? ''}
                    onChange={event =>
                      updateData(state => {
                        const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                        if (!plan) return { ...state };
                        plan.requirements.kcalTarget = Number(event.target.value) || undefined;
                        return { ...state };
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-xs text-slate-500">
                    План подъёма
                    <input
                      className="input"
                      type="time"
                      value={dayPlan.requirements.sleepWakeTarget ?? ''}
                      onChange={event =>
                        updateData(state => {
                          const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                          if (!plan) return { ...state };
                          plan.requirements.sleepWakeTarget = event.target.value;
                          return { ...state };
                        })
                      }
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Цель сна (мин)
                    <input
                      className="input"
                      type="number"
                      value={dayPlan.requirements.sleepDurationTargetMinutes ?? ''}
                      onChange={event =>
                        updateData(state => {
                          const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                          if (!plan) return { ...state };
                          plan.requirements.sleepDurationTargetMinutes =
                            Number(event.target.value) || undefined;
                          return { ...state };
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Цели питания</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <input
                    className="input"
                    type="number"
                    placeholder="Ккал"
                    value={nutritionTargets.kcal ?? ''}
                    onChange={event =>
                      updateNutritionTarget('kcal', Number(event.target.value) || undefined)
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Белки"
                    value={nutritionTargets.protein ?? ''}
                    onChange={event =>
                      updateNutritionTarget('protein', Number(event.target.value) || undefined)
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Жиры"
                    value={nutritionTargets.fat ?? ''}
                    onChange={event =>
                      updateNutritionTarget('fat', Number(event.target.value) || undefined)
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Углеводы"
                    value={nutritionTargets.carb ?? ''}
                    onChange={event =>
                      updateNutritionTarget('carb', Number(event.target.value) || undefined)
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Приёмы"
                    value={nutritionTargets.meals ?? ''}
                    onChange={event =>
                      updateNutritionTarget('meals', Number(event.target.value) || undefined)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Нормы активности</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <input
                    className="input"
                    type="number"
                    placeholder="Шаги"
                    value={dayPlan.plannedSteps ?? ''}
                    onChange={event =>
                      updateData(state => {
                        const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                        if (!plan) return { ...state };
                        plan.plannedSteps = Number(event.target.value) || undefined;
                        return { ...state };
                      })
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Мин трен."
                    value={dayPlan.activityTargets?.trainingMinutes ?? ''}
                    onChange={event =>
                      updateData(state => {
                        const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                        if (!plan) return { ...state };
                        plan.activityTargets ??= {};
                        plan.activityTargets.trainingMinutes =
                          Number(event.target.value) || undefined;
                        return { ...state };
                      })
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Мин движ."
                    value={dayPlan.activityTargets?.movementMinutes ?? ''}
                    onChange={event =>
                      updateData(state => {
                        const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                        if (!plan) return { ...state };
                        plan.activityTargets ??= {};
                        plan.activityTargets.movementMinutes =
                          Number(event.target.value) || undefined;
                        return { ...state };
                      })
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Км"
                    value={dayPlan.activityTargets?.distanceKm ?? ''}
                    onChange={event =>
                      updateData(state => {
                        const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                        if (!plan) return { ...state };
                        plan.activityTargets ??= {};
                        plan.activityTargets.distanceKm = Number(event.target.value) || undefined;
                        return { ...state };
                      })
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Ккал актив."
                    value={dayPlan.activityTargets?.kcal ?? ''}
                    onChange={event =>
                      updateData(state => {
                        const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                        if (!plan) return { ...state };
                        plan.activityTargets ??= {};
                        plan.activityTargets.kcal = Number(event.target.value) || undefined;
                        return { ...state };
                      })
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Коэфф."
                    value={dayPlan.activityTargets?.coefficient ?? ''}
                    onChange={event =>
                      updateData(state => {
                        const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                        if (!plan) return { ...state };
                        plan.activityTargets ??= {};
                        plan.activityTargets.coefficient =
                          Number(event.target.value) || undefined;
                        return { ...state };
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">План питания</h3>
                <div className="space-y-2">
                  {(Object.keys(mealLabels) as FoodEntry['meal'][]).map(meal => (
                    <div key={meal} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{mealLabels[meal]}</p>
                        <button
                          className="btn-secondary"
                          onClick={() =>
                            setMealSheet({
                              meal,
                              kind: 'dish',
                              refId: '',
                              title: '',
                              grams: 120,
                              servings: 1,
                              cheatCategory: 'pizza',
                              nutritionTags: [],
                              plannedKcal: '',
                              plannedProtein: '',
                              plannedFat: '',
                              plannedCarb: '',
                              plannedTime: mealTimes[meal] ?? getDefaultMealTime(meal),
                              notes: ''
                            })
                          }
                        >
                          + Добавить
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <label>
                          Время
                          <input
                            type="time"
                            className="input input-time mt-1 w-24"
                            value={mealTimes[meal] ?? getDefaultMealTime(meal)}
                            onChange={event => updateMealTime(meal, event.target.value)}
                          />
                        </label>
                        <label>
                          Цель ккал
                          <input
                            type="number"
                            className="input input-time mt-1 w-24"
                            value={nutritionTargets.kcal ?? ''}
                            onChange={event =>
                              updateNutritionTarget('kcal', Number(event.target.value) || undefined)
                            }
                          />
                        </label>
                      </div>
                      <div className="mt-2 space-y-2">
                        {dayPlan.mealsPlan[meal].length === 0 ? (
                          <p className="text-xs text-slate-500">Нет блюд</p>
                        ) : (
                          dayPlan.mealsPlan[meal].map(item => (
                            <div
                              key={item.id}
                              className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2 text-sm"
                            >
                              <div>
                                {item.kind === 'dish'
                                  ? data.library.recipes.find(recipe => recipe.id === item.refId)?.name
                                  : item.kind === 'product'
                                  ? data.library.products.find(product => product.id === item.refId)?.name
                                  : item.title}
                              </div>
                              <div className="text-xs text-slate-500">
                                {item.plannedTime ? `Время: ${item.plannedTime}` : ''}
                                {item.plannedGrams ? ` · ${item.plannedGrams} г` : ''}
                                {item.plannedServings ? ` · ${item.plannedServings} порц.` : ''}
                                {item.plannedKcal ? ` · ${item.plannedKcal} ккал` : ''}
                              </div>
                              {item.notes ? (
                                <div className="text-xs text-slate-400">{item.notes}</div>
                              ) : null}
                              <button
                                className="btn-secondary w-full text-red-500 sm:w-auto"
                                onClick={() =>
                                  updateData(state => {
                                    const plan = state.planner.dayPlans.find(
                                      itemPlan => itemPlan.date === editorDate
                                    );
                                    if (!plan) return { ...state };
                                    plan.mealsPlan[meal] = plan.mealsPlan[meal].filter(
                                      itemPlan => itemPlan.id !== item.id
                                    );
                                    return { ...state };
                                  })
                                }
                              >
                                Удалить
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-500">Состав блюда</p>
                          <button
                            className="btn-secondary"
                            onClick={() =>
                              setComponentSheet({
                                meal,
                                type: meal === 'snack' ? 'snack' : 'main',
                                recipeRef: '',
                                portion: '1 порция',
                                extra: false,
                                notes: ''
                              })
                            }
                          >
                            + Компонент
                          </button>
                        </div>
                        {mealComponents[meal].length === 0 ? (
                          <p className="text-xs text-slate-500">Нет компонентов</p>
                        ) : (
                          <div className="space-y-2">
                            {mealComponents[meal].map(component => (
                              <div
                                key={component.id}
                                className="flex flex-col gap-1 rounded-lg border border-slate-200 p-2 text-xs text-slate-600"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    {component.type.toUpperCase()} ·{' '}
                                    {component.recipeRef
                                      ? data.library.recipes.find(
                                          recipe => recipe.id === component.recipeRef
                                        )?.name
                                      : 'Без рецепта'}
                                  </div>
                                  <button
                                    className="text-red-500"
                                    onClick={() =>
                                      updateData(state => {
                                        const plan = state.planner.dayPlans.find(
                                          itemPlan => itemPlan.date === editorDate
                                        );
                                        if (!plan) return { ...state };
                                        plan.mealComponents ??= {
                                          breakfast: [],
                                          lunch: [],
                                          dinner: [],
                                          snack: []
                                        };
                                        plan.mealComponents[meal] = plan.mealComponents[meal].filter(
                                          itemPlan => itemPlan.id !== component.id
                                        );
                                        return { ...state };
                                      })
                                    }
                                  >
                                    Удалить
                                  </button>
                                </div>
                                <div>
                                  {component.portion}
                                  {component.extra ? ' · доп.' : ''}
                                  {component.notes ? ` · ${component.notes}` : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Задачи и привычки</h3>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      const template = data.library.taskTemplates[0];
                      if (!template) return;
                      setTaskSheet({
                        templateRef: template.id,
                        timeOfDay: 'morning',
                        notes: '',
                        target: Object.fromEntries(
                          Object.entries(template.defaultTarget ?? {}).map(([key, value]) => [
                            key,
                            String(value)
                          ])
                        ),
                        assignedRefs: template.suggestedRefs ?? []
                      });
                    }}
                  >
                    + Добавить задачу
                  </button>
                </div>
                {dayPlan.tasks?.length ? (
                  <div className="space-y-2">
                    {dayPlan.tasks.map(task => {
                      const template = data.library.taskTemplates.find(
                        item => item.id === task.templateRef
                      );
                      return (
                        <div
                          key={task.id}
                          className="flex flex-col gap-2 rounded-xl border p-2 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              {template?.title ?? 'Задача'} · {task.status}
                            </div>
                            <button
                              className="text-red-500"
                              onClick={() =>
                                updateData(state => {
                                  const plan = state.planner.dayPlans.find(
                                    itemPlan => itemPlan.date === editorDate
                                  );
                                  if (!plan) return { ...state };
                                  plan.tasks = (plan.tasks ?? []).filter(
                                    itemPlan => itemPlan.id !== task.id
                                  );
                                  return { ...state };
                                })
                              }
                            >
                              Удалить
                            </button>
                          </div>
                          {task.timeOfDay ? (
                            <div className="text-xs text-slate-500">
                              Время суток: {timeOfDayLabels[task.timeOfDay]}
                            </div>
                          ) : null}
                          {task.notes ? (
                            <div className="text-xs text-slate-400">{task.notes}</div>
                          ) : null}
                          {task.target ? (
                            <div className="text-xs text-slate-500">
                              Цели:{' '}
                              {Object.entries(task.target)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Нет задач</p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Тренировки и движение</h3>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      setWorkoutSheet({
                        timeOfDay: 'morning',
                        kind: 'workout',
                        protocolRef: '',
                        plannedTime: '',
                        plannedMinutes: 10,
                        isRequired: true,
                        movementActivityRef: data.library.movementActivities[0]?.id ?? '',
                        notes: ''
                      })
                    }
                  >
                    Добавить сессию
                  </button>
                </div>
                {dayPlan.workoutsPlan.length === 0 ? (
                  <p className="text-xs text-slate-500">Нет тренировок</p>
                ) : (
                  dayPlan.workoutsPlan.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-xl border p-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-sm">
                        {item.kind === 'movement'
                          ? `Движение · ${
                              data.library.movementActivities.find(
                                activity => activity.id === item.movementActivityRef
                              )?.name ?? 'Активность'
                            } · ${item.plannedMinutes ?? 10} мин`
                          : data.library.protocols.find(proto => proto.id === item.protocolRef)?.name}
                      </div>
                      {item.notes ? (
                        <div className="text-xs text-slate-500">{item.notes}</div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <label>
                          Время
                          <input
                            type="time"
                            className="input input-time mt-1 w-32"
                            value={item.plannedTime ?? getDefaultTimeForTimeOfDay(item.timeOfDay)}
                            onChange={event => updateWorkoutTime(item.id, event.target.value)}
                          />
                        </label>
                        <label>
                          Время суток
                          <select
                            className="input input-time mt-1"
                            value={item.timeOfDay}
                            onChange={event =>
                              updateWorkoutTimeOfDay(
                                item.id,
                                event.target.value as WorkoutPlanItem['timeOfDay']
                              )
                            }
                          >
                            {(Object.keys(timeOfDayLabels) as WorkoutPlanItem['timeOfDay'][]).map(
                              option => (
                                <option key={option} value={option}>
                                  {timeOfDayLabels[option]}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                      </div>
                      <button
                        className="btn-secondary w-full text-red-500 sm:w-auto"
                        onClick={() =>
                          updateData(state => {
                            const plan = state.planner.dayPlans.find(
                              itemPlan => itemPlan.date === editorDate
                            );
                            if (!plan) return { ...state };
                            plan.workoutsPlan = plan.workoutsPlan.filter(
                              itemPlan => itemPlan.id !== item.id
                            );
                            return { ...state };
                          })
                        }
                      >
                        Удалить
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Заметки дня</h3>
                <textarea
                  className="input min-h-[90px]"
                  placeholder="Комментарий, ощущение, акценты."
                  value={dayPlan.notes ?? ''}
                  onChange={event =>
                    updateData(state => {
                      const plan = state.planner.dayPlans.find(item => item.date === editorDate);
                      if (!plan) return { ...state };
                      plan.notes = event.target.value;
                      return { ...state };
                    })
                  }
                />
              </div>
            </div>
          ) : null}
        </>
      )}

      {activeTab === 'Рацион' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-2">
            <h2 className="section-title">Меню на период</h2>
            {selectedPeriod ? (
              <p className="text-sm text-slate-500">
                {selectedPeriod.name}: {selectedPeriod.startDate} → {selectedPeriod.endDate}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Выберите период в разделе «Периоды».</p>
            )}
          </div>

          {selectedPeriod ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {dayList.map(date => {
                  const plan = data.planner.dayPlans.find(item => item.date === date);
                  if (!plan) return null;
                  const nutrition = plannedNutrition(date);
                  return (
                    <div key={date} className="card space-y-3 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">{date}</h3>
                          <p className="text-xs text-slate-500">
                            План: {nutrition.kcal.toFixed(0)} ккал · Б{' '}
                            {nutrition.protein.toFixed(0)} / Ж {nutrition.fat.toFixed(0)} / У{' '}
                            {nutrition.carb.toFixed(0)}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">
                          Цель: {plan.nutritionTargets?.kcal ?? '—'} ккал · приёмов{' '}
                          {plan.nutritionTargets?.meals ?? '—'}
                        </span>
                      </div>
                      <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                        {(Object.keys(mealLabels) as FoodEntry['meal'][]).map(meal => (
                          <div key={meal} className="rounded-lg border border-slate-200 p-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{mealLabels[meal]}</span>
                              <span className="text-slate-400">
                                {plan.mealTimes?.[meal] || getDefaultMealTime(meal)}
                              </span>
                            </div>
                            <ul className="mt-1 space-y-1">
                              {plan.mealsPlan[meal].length ? (
                                plan.mealsPlan[meal].map(item => (
                                  <li key={item.id}>
                                    •{' '}
                                    {item.kind === 'dish'
                                      ? data.library.recipes.find(
                                          recipe => recipe.id === item.refId
                                        )?.name
                                      : item.kind === 'product'
                                      ? data.library.products.find(
                                          product => product.id === item.refId
                                        )?.name
                                      : item.title}
                                    {item.plannedGrams ? ` (${item.plannedGrams} г)` : ''}
                                    {item.plannedServings ? ` (${item.plannedServings} порц.)` : ''}
                                  </li>
                                ))
                              ) : (
                                <li className="text-slate-400">Нет записей</li>
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card space-y-2 p-4">
                <h3 className="text-sm font-semibold">Список продуктов периода</h3>
                {periodProductList.length ? (
                  <ul className="space-y-1 text-sm text-slate-600">
                    {periodProductList.map(product => (
                      <li key={product.name} className="flex items-center justify-between">
                        <span>{product.name}</span>
                        <span className="text-slate-400">{product.grams.toFixed(0)} г</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">Нет продуктов для периода.</p>
                )}
              </div>
            </div>
          ) : null}

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Скопировать меню на диапазон</h3>
            <input
              className="input"
              type="date"
              value={menuCopy.sourceDate}
              onChange={event => setMenuCopy(prev => ({ ...prev, sourceDate: event.target.value }))}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                className="input"
                type="date"
                value={menuCopy.startDate}
                onChange={event => setMenuCopy(prev => ({ ...prev, startDate: event.target.value }))}
              />
              <input
                className="input"
                type="date"
                value={menuCopy.endDate}
                onChange={event => setMenuCopy(prev => ({ ...prev, endDate: event.target.value }))}
              />
            </div>
            <button className="btn-secondary w-full" onClick={copyMenuRange} disabled={!canCopyMenu}>
              Скопировать меню
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Активность' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-2">
            <h2 className="section-title">План активности</h2>
            {selectedPeriod ? (
              <p className="text-sm text-slate-500">
                Период: {selectedPeriod.name} · Дней {dayList.length}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Выберите период, чтобы управлять планом.</p>
            )}
          </div>

          {selectedPeriod ? (
            <div className="space-y-2">
              {dayList.map(date => {
                const plan = data.planner.dayPlans.find(item => item.date === date);
                const workouts = plan?.workoutsPlan ?? [];
                return (
                  <div key={date} className="card p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{date}</h3>
                        <p className="text-xs text-slate-500">
                          Сессий: {workouts.length} · Обязательных:{' '}
                          {workouts.filter(item => item.isRequired).length}
                        </p>
                      </div>
                      <button className="btn-secondary" onClick={() => openDayEditor(date)}>
                        Редактировать
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      <BottomSheet open={Boolean(mealSheet)} title="Добавить в меню" onClose={() => setMealSheet(null)}>
        {mealSheet && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-600">Приём пищи</label>
            <select
              className="input"
              value={mealSheet.meal}
              onChange={event =>
                setMealSheet(prev =>
                  prev ? { ...prev, meal: event.target.value as FoodEntry['meal'] } : prev
                )
              }
            >
              {Object.entries(mealLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Тип</label>
            <select
              className="input"
              value={mealSheet.kind}
              onChange={event =>
                setMealSheet(prev =>
                  prev ? { ...prev, kind: event.target.value as MealPlanItem['kind'] } : prev
                )
              }
            >
              <option value="dish">Блюдо</option>
              <option value="product">Продукт</option>
              <option value="free">Свободно</option>
              <option value="cheat">Читмил</option>
            </select>

            <label className="text-sm font-semibold text-slate-600">Время</label>
            <input
              type="time"
              className="input"
              value={mealSheet.plannedTime}
              onChange={event =>
                setMealSheet(prev => (prev ? { ...prev, plannedTime: event.target.value } : prev))
              }
            />

            {(mealSheet.kind === 'dish' || mealSheet.kind === 'product') && (
              <>
                <label className="text-sm font-semibold text-slate-600">Справочник</label>
                <select
                  className="input"
                  value={mealSheet.refId ?? ''}
                  onChange={event =>
                    setMealSheet(prev => {
                      if (!prev) return prev;
                      const refId = event.target.value;
                      const tags =
                        prev.kind === 'dish'
                          ? data.library.recipes.find(item => item.id === refId)?.nutritionTags ?? []
                          : data.library.products.find(item => item.id === refId)?.nutritionTags ?? [];
                      return { ...prev, refId, nutritionTags: tags };
                    })
                  }
                >
                  <option value="">Выберите</option>
                  {(mealSheet.kind === 'dish' ? data.library.recipes : data.library.products).map(
                    item => (
                      <option key={item.id} value={item.id}>
                        {'name' in item ? item.name : 'Название'}
                      </option>
                    )
                  )}
                </select>
              </>
            )}

            {mealSheet.kind === 'dish' ? (
              <input
                className="input"
                type="number"
                placeholder="Порции"
                value={mealSheet.servings}
                onChange={event =>
                  setMealSheet(prev =>
                    prev ? { ...prev, servings: Number(event.target.value) } : prev
                  )
                }
              />
            ) : null}

            {mealSheet.kind === 'product' ? (
              <input
                className="input"
                type="number"
                placeholder="Граммы"
                value={mealSheet.grams}
                onChange={event =>
                  setMealSheet(prev => prev ? { ...prev, grams: Number(event.target.value) } : prev)
                }
              />
            ) : null}

            {(mealSheet.kind === 'free' || mealSheet.kind === 'cheat') && (
              <>
                <input
                  className="input"
                  placeholder="Название"
                  value={mealSheet.title}
                  onChange={event =>
                    setMealSheet(prev => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                />
                {mealSheet.kind === 'cheat' ? (
                  <select
                    className="input"
                    value={mealSheet.cheatCategory ?? 'pizza'}
                    onChange={event =>
                      setMealSheet(prev =>
                        prev
                          ? {
                              ...prev,
                              cheatCategory: event.target.value as MealPlanItem['cheatCategory']
                            }
                          : prev
                      )
                    }
                  >
                    <option value="pizza">Пицца</option>
                    <option value="fastfood">Фастфуд</option>
                    <option value="sweets">Сладкое</option>
                    <option value="other">Другое</option>
                  </select>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input"
                    type="number"
                    placeholder="Ккал"
                    value={mealSheet.plannedKcal}
                    onChange={event =>
                      setMealSheet(prev =>
                        prev ? { ...prev, plannedKcal: event.target.value } : prev
                      )
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Белки"
                    value={mealSheet.plannedProtein}
                    onChange={event =>
                      setMealSheet(prev =>
                        prev ? { ...prev, plannedProtein: event.target.value } : prev
                      )
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Жиры"
                    value={mealSheet.plannedFat}
                    onChange={event =>
                      setMealSheet(prev =>
                        prev ? { ...prev, plannedFat: event.target.value } : prev
                      )
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Углеводы"
                    value={mealSheet.plannedCarb}
                    onChange={event =>
                      setMealSheet(prev =>
                        prev ? { ...prev, plannedCarb: event.target.value } : prev
                      )
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600">Метки питания</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {(Object.keys(nutritionTagLabels) as NutritionTag[]).map(tag => (
                  <label key={tag} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={mealSheet.nutritionTags.includes(tag)}
                      onChange={() => toggleMealSheetTag(tag)}
                    />
                    {nutritionTagLabels[tag]}
                  </label>
                ))}
              </div>
            </div>

            <textarea
              className="input min-h-[72px]"
              placeholder="Комментарий к приёму"
              value={mealSheet.notes}
              onChange={event =>
                setMealSheet(prev => (prev ? { ...prev, notes: event.target.value } : prev))
              }
            />

            <button className="btn-primary w-full" onClick={addMealToPlan}>
              Сохранить в план
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={Boolean(workoutSheet)} title="Добавить сессию" onClose={() => setWorkoutSheet(null)}>
        {workoutSheet && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-600">Время суток</label>
            <select
              className="input"
              value={workoutSheet.timeOfDay}
              onChange={event =>
                setWorkoutSheet(prev =>
                  prev
                    ? { ...prev, timeOfDay: event.target.value as WorkoutPlanItem['timeOfDay'] }
                    : prev
                )
              }
            >
              {(Object.keys(timeOfDayLabels) as WorkoutPlanItem['timeOfDay'][]).map(option => (
                <option key={option} value={option}>
                  {timeOfDayLabels[option]}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Точное время</label>
            <input
              type="time"
              className="input"
              value={workoutSheet.plannedTime}
              onChange={event =>
                setWorkoutSheet(prev =>
                  prev
                    ? {
                        ...prev,
                        plannedTime: event.target.value,
                        timeOfDay: event.target.value
                          ? getTimeOfDayFromTime(event.target.value)
                          : prev.timeOfDay
                      }
                    : prev
                )
              }
            />
            <label className="text-sm font-semibold text-slate-600">Тип</label>
            <select
              className="input"
              value={workoutSheet.kind}
              onChange={event =>
                setWorkoutSheet(prev =>
                  prev ? { ...prev, kind: event.target.value as WorkoutPlanItem['kind'] } : prev
                )
              }
            >
              <option value="workout">Тренировка</option>
              <option value="movement">Движение</option>
            </select>
            {workoutSheet.kind === 'workout' ? (
              <select
                className="input"
                value={workoutSheet.protocolRef}
                onChange={event =>
                  setWorkoutSheet(prev => (prev ? { ...prev, protocolRef: event.target.value } : prev))
                }
              >
                <option value="">Выберите протокол</option>
                {data.library.protocols.map(protocol => (
                  <option key={protocol.id} value={protocol.id}>
                    {protocol.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <select
                  className="input"
                  value={workoutSheet.movementActivityRef || defaultMovementActivityId}
                  onChange={event =>
                    setWorkoutSheet(prev =>
                      prev ? { ...prev, movementActivityRef: event.target.value } : prev
                    )
                  }
                >
                  {data.library.movementActivities.map(activity => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  placeholder="Минуты движения"
                  value={workoutSheet.plannedMinutes}
                  onChange={event =>
                    setWorkoutSheet(prev =>
                      prev ? { ...prev, plannedMinutes: Number(event.target.value) } : prev
                    )
                  }
                />
              </>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={workoutSheet.isRequired}
                onChange={event =>
                  setWorkoutSheet(prev => (prev ? { ...prev, isRequired: event.target.checked } : prev))
                }
              />
              Обязательная
            </label>
            <textarea
              className="input min-h-[72px]"
              placeholder="Комментарий к сессии"
              value={workoutSheet.notes}
              onChange={event =>
                setWorkoutSheet(prev => (prev ? { ...prev, notes: event.target.value } : prev))
              }
            />
            <button className="btn-primary w-full" onClick={addWorkoutToPlan}>
              Сохранить
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={Boolean(taskSheet)} title="Добавить задачу" onClose={() => setTaskSheet(null)}>
        {taskSheet && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-600">Шаблон</label>
            <select
              className="input"
              value={taskSheet.templateRef}
              onChange={event => {
                const template = data.library.taskTemplates.find(
                  item => item.id === event.target.value
                );
                setTaskSheet(prev =>
                  prev
                    ? {
                        ...prev,
                        templateRef: event.target.value,
                        target: Object.fromEntries(
                          Object.entries(template?.defaultTarget ?? {}).map(([key, value]) => [
                            key,
                            String(value)
                          ])
                        ),
                        assignedRefs: template?.suggestedRefs ?? []
                      }
                    : prev
                );
              }}
            >
              {data.library.taskTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Время суток</label>
            <select
              className="input"
              value={taskSheet.timeOfDay}
              onChange={event =>
                setTaskSheet(prev =>
                  prev
                    ? { ...prev, timeOfDay: event.target.value as TaskInstance['timeOfDay'] }
                    : prev
                )
              }
            >
              {(Object.keys(timeOfDayLabels) as TimeOfDay[]).map(option => (
                <option key={option} value={option}>
                  {timeOfDayLabels[option]}
                </option>
              ))}
            </select>
            {Object.keys(taskSheet.target).length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-400">Цели</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(taskSheet.target).map(([key, value]) => (
                    <input
                      key={key}
                      className="input"
                      placeholder={key}
                      value={value}
                      onChange={event =>
                        setTaskSheet(prev =>
                          prev
                            ? { ...prev, target: { ...prev.target, [key]: event.target.value } }
                            : prev
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {taskSheet.assignedRefs?.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-400">Связанные элементы</p>
                <div className="space-y-1 text-xs text-slate-500">
                  {taskSheet.assignedRefs.map(ref => (
                    <label key={`${ref.kind}-${ref.refId}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked
                        onChange={event =>
                          setTaskSheet(prev =>
                            prev
                              ? {
                                  ...prev,
                                  assignedRefs: event.target.checked
                                    ? prev.assignedRefs
                                    : prev.assignedRefs?.filter(
                                        item => !(item.kind === ref.kind && item.refId === ref.refId)
                                      )
                                }
                              : prev
                          )
                        }
                      />
                      {ref.kind}: {ref.refId}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <textarea
              className="input min-h-[72px]"
              placeholder="Комментарий"
              value={taskSheet.notes}
              onChange={event =>
                setTaskSheet(prev => (prev ? { ...prev, notes: event.target.value } : prev))
              }
            />
            <button className="btn-primary w-full" onClick={addTaskToPlan}>
              Сохранить задачу
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={Boolean(componentSheet)}
        title="Добавить компонент блюда"
        onClose={() => setComponentSheet(null)}
      >
        {componentSheet && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-600">Приём</label>
            <select
              className="input"
              value={componentSheet.meal}
              onChange={event =>
                setComponentSheet(prev =>
                  prev ? { ...prev, meal: event.target.value as FoodEntry['meal'] } : prev
                )
              }
            >
              {Object.entries(mealLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Тип компонента</label>
            <select
              className="input"
              value={componentSheet.type}
              onChange={event =>
                setComponentSheet(prev =>
                  prev ? { ...prev, type: event.target.value as MealComponentType } : prev
                )
              }
            >
              {['main', 'side', 'salad', 'soup', 'drink', 'dessert', 'snack'].map(option => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-600">Рецепт (опционально)</label>
            <select
              className="input"
              value={componentSheet.recipeRef}
              onChange={event =>
                setComponentSheet(prev => (prev ? { ...prev, recipeRef: event.target.value } : prev))
              }
            >
              <option value="">Без рецепта</option>
              {data.library.recipes.map(recipe => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Порция"
              value={componentSheet.portion}
              onChange={event =>
                setComponentSheet(prev => (prev ? { ...prev, portion: event.target.value } : prev))
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={componentSheet.extra}
                onChange={event =>
                  setComponentSheet(prev =>
                    prev ? { ...prev, extra: event.target.checked } : prev
                  )
                }
              />
              Дополнительный компонент
            </label>
            <textarea
              className="input min-h-[72px]"
              placeholder="Комментарий"
              value={componentSheet.notes}
              onChange={event =>
                setComponentSheet(prev => (prev ? { ...prev, notes: event.target.value } : prev))
              }
            />
            <button className="btn-primary w-full" onClick={addComponentToPlan}>
              Сохранить компонент
            </button>
          </div>
        )}
      </BottomSheet>
    </section>
  );
};

export default PlanPage;
