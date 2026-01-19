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
  activityMetrics?: ActivityMetrics;
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

export type ActivityMetrics = {
  calculationModel?:
    | 'time'
    | 'reps'
    | 'sets'
    | 'distance'
    | 'steps'
    | 'stairs'
    | 'combined';
  intensityMultiplier?: number;
  perMinute?: number;
  perRep?: number;
  perSet?: number;
  perKm?: number;
  perStep?: number;
  perFlight?: number;
  perKcal?: number;
  base?: number;
};

export type ActivityDefaults = {
  workoutPerMinute: number;
  movementPerMinute: number;
  step: number;
  distanceKm: number;
  set: number;
  rep: number;
  kcal: number;
  flight: number;
  exerciseBase: number;
};

export type PortionPreset = { label: string; grams: number };

export type NutritionTag = 'snack' | 'cheat' | 'healthy';

export type CookingType =
  | 'raw'
  | 'boil'
  | 'fry'
  | 'stew'
  | 'bake'
  | 'steam'
  | 'grill'
  | 'mix';

export type NutritionTargets = {
  kcal?: number;
  protein?: number;
  fat?: number;
  carb?: number;
  meals?: number;
};

export type Product = {
  id: UUID;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbPer100g: number;
  hydrationContribution?: boolean;
  portionPresets?: PortionPreset[];
  pieceGrams?: number;
  pieceLabel?: string;
  nutritionTags?: NutritionTag[];
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
  category:
    | 'breakfast'
    | 'main'
    | 'side'
    | 'salad'
    | 'soup'
    | 'snack'
    | 'dessert'
    | 'drink'
    | 'cheat';
  cookingType: CookingType;
  complexity?: 'easy' | 'medium';
  nutritionTags?: NutritionTag[];
  hydrationContribution?: boolean;
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
  plannedSteps?: number;
  activityTargets?: {
    coefficient?: number;
    units?: number;
    trainingMinutes?: number;
    movementMinutes?: number;
    steps?: number;
    distanceKm?: number;
    kcal?: number;
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
  nutritionTargets?: NutritionTargets;
  requirements: {
    requireWeight: boolean;
    requireWaist: boolean;
    requirePhotos: Array<'front' | 'side'>;
    smokingTargetMax?: number;
    kcalTarget?: number;
    sleepWakeTarget?: string;
    sleepDurationTargetMinutes?: number;
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
  pieces?: number;
  servings?: number;
  portionLabel?: string;
  kcalOverride?: number;
  proteinOverride?: number;
  fatOverride?: number;
  carbOverride?: number;
  title?: string;
  notes?: string;
  cheatCategory?: 'pizza' | 'fastfood' | 'sweets' | 'other';
  nutritionTags?: NutritionTag[];
};

export type MealPlanItem = {
  id: UUID;
  kind: 'product' | 'dish' | 'free' | 'cheat';
  refId?: UUID;
  title?: string;
  plannedGrams?: number;
  plannedPieces?: number;
  plannedServings?: number;
  plannedPortionLabel?: string;
  plannedKcal?: number;
  plannedProtein?: number;
  plannedFat?: number;
  plannedCarb?: number;
  plannedTime?: string;
  notes?: string;
  cheatCategory?: 'pizza' | 'fastfood' | 'sweets' | 'other';
  completed?: boolean;
  nutritionTags?: NutritionTag[];
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
  sets?: number;
  reps?: number;
  calories?: number;
  protocolRef?: UUID;
  timeOfDay?: TimeOfDay;
};

export type MovementActivity = {
  id: UUID;
  name: string;
  kind: 'run' | 'march' | 'stairs';
  activityMetrics?: ActivityMetrics;
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
  steps?: number;
  calories?: number;
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
  kcalPer100ml?: number;
  proteinPer100ml?: number;
  fatPer100ml?: number;
  carbPer100ml?: number;
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
  quality1to5?: number;
  notes?: string;
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
  activityDefaults: ActivityDefaults;
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
    dishPortions: { label: string; servings: number }[];
  };
};

export type ProfileGoalKind =
  | 'lose_weight'
  | 'gain_muscle'
  | 'maintain'
  | 'endurance'
  | 'health'
  | 'custom';

export type ProfileGoalHorizon = 'short' | 'long';

export type ProfileGoal = {
  id: UUID;
  title: string;
  kind: ProfileGoalKind;
  horizon: ProfileGoalHorizon;
  notes?: string;
};

export type ProfileMetrics = {
  gender?: 'male' | 'female' | 'other';
  age?: number;
  heightCm?: number;
  weightKg?: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
};

export type ProfileCurrentState = {
  fitnessLevel?: number;
  readinessNote?: string;
  updatedAt?: string;
  autoLevel?: number;
  autoSummary?: string;
  autoUpdatedAt?: string;
};

export type ProfileAccess = {
  activity: string[];
  homeEquipment: string[];
  gymEquipment: string[];
  customEquipment: string[];
};

export type UserProfile = {
  id: UUID;
  login: string;
  password: string;
  name?: string;
  metrics: ProfileMetrics;
  readinessLevel?: 'beginner' | 'intermediate' | 'advanced';
  currentState: ProfileCurrentState;
  goals: {
    longTerm: ProfileGoal[];
    shortTerm: ProfileGoal[];
  };
  access: ProfileAccess;
  setupCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};
