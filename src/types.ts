export type UUID = string;

export type Exercise = {
  id: UUID;
  name: string;
  tags: string[];
  steps: string[];
  cues: string[];
  mistakes: string[];
  regressions: string[];
  progressions: string[];
  media?: {
    youtubeUrl?: string;
    localVideoBlobKey?: string;
  };
};

export type ProtocolStep = {
  text: string;
  durationSec?: number;
  exerciseRef?: UUID;
};

export type Protocol = {
  id: UUID;
  name: string;
  description: string;
  steps: ProtocolStep[];
};

export type PortionPreset = { label: string; grams: number };

export type Product = {
  id: UUID;
  name: string;
  kcalPer100g: number;
  proteinPer100g?: number;
  fatPer100g?: number;
  carbPer100g?: number;
  portionPresets?: PortionPreset[];
  notes?: string;
};

export type RecipeIngredient = { productRef: UUID; grams: number };

export type Recipe = {
  id: UUID;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  notes?: string;
  tags: string[];
  category: 'breakfast' | 'main' | 'side' | 'salad' | 'snack' | 'dessert' | 'drink' | 'cheat';
  complexity?: 'easy' | 'medium';
};

export type Rule = {
  id: UUID;
  name: string;
  text: string;
  tags: string[];
};

export type TaskTemplate = {
  id: UUID;
  type: 'warmup' | 'movement' | 'strength' | 'nutrition' | 'smoking' | 'sleep' | 'measurement';
  title: string;
  defaultTarget?: Record<string, number | string>;
  suggestedRefs?: { kind: 'protocol' | 'exercise' | 'recipe' | 'rule' | 'product'; refId: UUID }[];
};

export type Period = {
  id: UUID;
  name: string;
  startDate: string;
  endDate: string;
  goals: string[];
  notes?: string;
};

export type TimeOfDay = 'morning' | 'day' | 'evening';

export type TaskInstance = {
  id: UUID;
  templateRef: UUID;
  status: 'planned' | 'done' | 'skipped';
  assignedRefs?: { kind: 'protocol' | 'exercise' | 'recipe' | 'rule' | 'product'; refId: UUID }[];
  target?: Record<string, number | string>;
  actual?: Record<string, number | string>;
  timeOfDay?: TimeOfDay;
  notes?: string;
};

export type DayPlan = {
  id: UUID;
  date: string;
  periodId?: UUID;
  tasks?: TaskInstance[];
  mealsPlan: {
    breakfast: MealPlanItem[];
    lunch: MealPlanItem[];
    dinner: MealPlanItem[];
    snack: MealPlanItem[];
  };
  mealComponents?: {
    breakfast: MealComponent[];
    lunch: MealComponent[];
    dinner: MealComponent[];
    snack: MealComponent[];
  };
  mealTimes?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snack?: string;
  };
  workoutsPlan: WorkoutPlanItem[];
  requirements: {
    requireWeight: boolean;
    requireWaist: boolean;
    requirePhotos: Array<'front' | 'side'>;
    smokingTargetMax?: number;
    kcalTarget?: number;
  };
  notes?: string;
};

export type FoodEntry = {
  id: UUID;
  time?: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  kind: 'product' | 'dish' | 'free' | 'cheat';
  refId?: UUID;
  grams?: number;
  servings?: number;
  kcalOverride?: number;
  title?: string;
  notes?: string;
  cheatCategory?: 'pizza' | 'fastfood' | 'sweets' | 'other';
};

export type MealPlanItem = {
  id: UUID;
  kind: 'product' | 'dish' | 'free' | 'cheat';
  refId?: UUID;
  title?: string;
  plannedGrams?: number;
  plannedServings?: number;
  plannedTime?: string;
  notes?: string;
  cheatCategory?: 'pizza' | 'fastfood' | 'sweets' | 'other';
  completed?: boolean;
};

export type MealComponentType =
  | 'main'
  | 'side'
  | 'salad'
  | 'soup'
  | 'drink'
  | 'dessert'
  | 'snack';

export type MealComponent = {
  id: UUID;
  type: MealComponentType;
  recipeRef?: UUID;
  portion: string;
  extra?: boolean;
  notes?: string;
};

export type WorkoutPlanItem = {
  id: UUID;
  timeOfDay: TimeOfDay;
  plannedTime?: string;
  protocolRef?: UUID;
  isRequired?: boolean;
  kind?: 'workout' | 'movement';
  plannedMinutes?: number;
  completedMinutes?: number;
  completed?: boolean;
  movementActivityRef?: UUID;
  notes?: string;
};

export type FoodLogDay = {
  date: string;
  entries: FoodEntry[];
  notes?: string;
};

export type ActivityLog = {
  id: UUID;
  dateTime: string;
  type: 'workout';
  minutes: number;
  blocks?: number;
  timeOfDay?: TimeOfDay;
};

export type MovementActivity = {
  id: UUID;
  name: string;
  kind: 'run' | 'march' | 'stairs';
};

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type MovementSessionLog = {
  id: UUID;
  dateTime: string;
  activityRef: UUID;
  durationMinutes: number;
  distanceKm?: number;
  startLocation?: GeoPoint;
  endLocation?: GeoPoint;
  plannedFlights?: number;
  actualFlights?: number;
  timeOfDay?: TimeOfDay;
  notes?: string;
};

export type MovementDayLog = {
  date: string;
  steps: number;
};

export type SmokingLog = {
  id: UUID;
  dateTime: string;
  count: number;
  trigger: string;
  stressLevel1to5?: number;
  ruleApplied?: boolean;
};

export type WaterLog = {
  id: UUID;
  dateTime: string;
  amountMl: number;
};

export type DrinkPortion = {
  label: string;
  ml: number;
};

export type Drink = {
  id: UUID;
  name: string;
  hydrationFactor: number;
  portions: DrinkPortion[];
};

export type DrinkLog = {
  id: UUID;
  dateTime: string;
  drinkId: UUID;
  portionLabel: string;
  portionMl: number;
  portionsCount: number;
};

export type WeightLog = {
  id: UUID;
  dateTime: string;
  weightKg: number;
};

export type WaistLog = {
  id: UUID;
  date: string;
  waistCm: number;
};

export type SleepLog = {
  id: UUID;
  date: string;
  wakeTime?: string;
  bedTime?: string;
  anchorMet?: boolean;
};

export type PhotoMeta = {
  id: UUID;
  dateTime: string;
  kind: 'front' | 'side' | 'other';
  blobKey: string;
  notes?: string;
};

export type LibraryState = {
  exercises: Exercise[];
  protocols: Protocol[];
  products: Product[];
  recipes: Recipe[];
  drinks: Drink[];
  rules: Rule[];
  movementActivities: MovementActivity[];
  taskTemplates: TaskTemplate[];
};

export type PlannerState = {
  periods: Period[];
  dayPlans: DayPlan[];
};

export type LogsState = {
  foodDays: FoodLogDay[];
  training: ActivityLog[];
  movementSessions: MovementSessionLog[];
  movementDays: MovementDayLog[];
  smoking: SmokingLog[];
  water: WaterLog[];
  drinks: DrinkLog[];
  weight: WeightLog[];
  waist: WaistLog[];
  sleep: SleepLog[];
  photos: PhotoMeta[];
};

export type AppData = {
  schemaVersion: number;
  library: LibraryState;
  planner: PlannerState;
  logs: LogsState;
  presets: {
    portions: { label: string; grams: number }[];
  };
};
