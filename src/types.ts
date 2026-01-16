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

export type TaskInstance = {
  id: UUID;
  templateRef: UUID;
  status: 'planned' | 'done' | 'skipped';
  assignedRefs?: { kind: 'protocol' | 'exercise' | 'recipe' | 'rule' | 'product'; refId: UUID }[];
  target?: Record<string, number | string>;
  actual?: Record<string, number | string>;
  notes?: string;
};

export type DayPlan = {
  id: UUID;
  date: string;
  periodId?: UUID;
  tasks: TaskInstance[];
  notes?: string;
};

export type FoodEntry = {
  id: UUID;
  time?: string;
  kind: 'product' | 'recipe' | 'free';
  refId?: UUID;
  grams?: number;
  servings?: number;
  kcalOverride?: number;
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
  type: 'stairs' | 'march' | 'workout';
  minutes: number;
  blocks?: number;
};

export type SmokingLog = {
  id: UUID;
  dateTime: string;
  count: number;
  trigger: string;
  stressLevel1to5?: number;
  ruleApplied?: boolean;
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
  rules: Rule[];
  taskTemplates: TaskTemplate[];
};

export type PlannerState = {
  periods: Period[];
  dayPlans: DayPlan[];
};

export type LogsState = {
  foodDays: FoodLogDay[];
  activity: ActivityLog[];
  smoking: SmokingLog[];
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
