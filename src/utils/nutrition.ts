import { CookingType, FoodEntry, LibraryState, MealPlanItem, Product, Recipe } from '../types';

export const cookingTypeLabels: Record<CookingType, string> = {
  raw: 'Сырое',
  boil: 'Варка',
  fry: 'Жарка',
  stew: 'Тушение',
  bake: 'Запекание',
  steam: 'На пару',
  grill: 'Гриль',
  mix: 'Смешивание'
};

const cookingTypeAdjustments: Record<
  CookingType,
  { overall: number; kcal: number; protein: number; fat: number; carb: number }
> = {
  raw: { overall: 1, kcal: 1, protein: 1, fat: 1, carb: 1 },
  boil: { overall: 0.96, kcal: 0.98, protein: 0.99, fat: 0.96, carb: 1 },
  fry: { overall: 1.08, kcal: 1.05, protein: 0.97, fat: 1.18, carb: 1 },
  stew: { overall: 0.97, kcal: 0.98, protein: 0.98, fat: 0.97, carb: 0.99 },
  bake: { overall: 0.98, kcal: 0.98, protein: 0.98, fat: 0.98, carb: 0.98 },
  steam: { overall: 0.97, kcal: 0.97, protein: 0.99, fat: 0.95, carb: 0.99 },
  grill: { overall: 0.98, kcal: 0.98, protein: 0.98, fat: 0.97, carb: 0.99 },
  mix: { overall: 1, kcal: 1, protein: 1, fat: 1, carb: 1 }
};

export const inferCookingType = (name: string): CookingType => {
  const normalized = name.toLowerCase();
  if (/(вар|отвар|кип|пельмени|вареники)/.test(normalized)) return 'boil';
  if (/(жар|сковород|обжар)/.test(normalized)) return 'fry';
  if (/(туш)/.test(normalized)) return 'stew';
  if (/(запек|духовк)/.test(normalized)) return 'bake';
  if (/(гриль|стейк)/.test(normalized)) return 'grill';
  if (/(пар)/.test(normalized)) return 'steam';
  if (/(салат|смузи|шейк|йогурт|десерт)/.test(normalized)) return 'mix';
  return 'raw';
};

const macroForProduct = (product: Product, grams: number) => {
  const factor = grams / 100;
  return {
    kcal: product.kcalPer100g * factor,
    protein: product.proteinPer100g * factor,
    fat: product.fatPer100g * factor,
    carb: product.carbPer100g * factor
  };
};

export const resolveProductGrams = (
  product: Product | undefined,
  grams?: number,
  pieces?: number
) => {
  if (!product) return 0;
  if (grams) return grams;
  if (pieces && product.pieceGrams) return pieces * product.pieceGrams;
  return 0;
};

export const calcRecipeNutrition = (recipe: Recipe, library: LibraryState) => {
  const totals = recipe.ingredients.reduce(
    (acc, ingredient) => {
      const product = library.products.find(item => item.id === ingredient.productRef);
      if (!product) return acc;
      const macro = macroForProduct(product, ingredient.grams);
      return {
        kcal: acc.kcal + macro.kcal,
        protein: acc.protein + macro.protein,
        fat: acc.fat + macro.fat,
        carb: acc.carb + macro.carb
      };
    },
    { kcal: 0, protein: 0, fat: 0, carb: 0 }
  );
  const adjustments = cookingTypeAdjustments[recipe.cookingType] ?? cookingTypeAdjustments.raw;
  const apply = (value: number, factor: number) => value * adjustments.overall * factor;
  const adjustedTotals = {
    kcal: apply(totals.kcal, adjustments.kcal),
    protein: apply(totals.protein, adjustments.protein),
    fat: apply(totals.fat, adjustments.fat),
    carb: apply(totals.carb, adjustments.carb)
  };
  return {
    total: adjustedTotals,
    perServing: {
      kcal: adjustedTotals.kcal / recipe.servings,
      protein: adjustedTotals.protein / recipe.servings,
      fat: adjustedTotals.fat / recipe.servings,
      carb: adjustedTotals.carb / recipe.servings
    }
  };
};

export const calcFoodEntry = (entry: FoodEntry, library: LibraryState) => {
  const hasOverrides =
    entry.kcalOverride !== undefined ||
    entry.proteinOverride !== undefined ||
    entry.fatOverride !== undefined ||
    entry.carbOverride !== undefined;
  if (hasOverrides) {
    return {
      kcal: entry.kcalOverride ?? 0,
      protein: entry.proteinOverride ?? 0,
      fat: entry.fatOverride ?? 0,
      carb: entry.carbOverride ?? 0
    };
  }
  if (entry.kind === 'product' && entry.refId && entry.grams) {
    const product = library.products.find(item => item.id === entry.refId);
    if (!product) return { kcal: 0, protein: 0, fat: 0, carb: 0 };
    return macroForProduct(product, entry.grams);
  }
  if (entry.kind === 'product' && entry.refId && entry.pieces) {
    const product = library.products.find(item => item.id === entry.refId);
    if (!product) return { kcal: 0, protein: 0, fat: 0, carb: 0 };
    const grams = resolveProductGrams(product, entry.grams, entry.pieces);
    return macroForProduct(product, grams);
  }
  if (entry.kind === 'dish' && entry.refId) {
    const recipe = library.recipes.find(item => item.id === entry.refId);
    if (!recipe) return { kcal: 0, protein: 0, fat: 0, carb: 0 };
    const nutrition = calcRecipeNutrition(recipe, library);
    const servings = entry.servings ?? 1;
    return {
      kcal: nutrition.perServing.kcal * servings,
      protein: nutrition.perServing.protein * servings,
      fat: nutrition.perServing.fat * servings,
      carb: nutrition.perServing.carb * servings
    };
  }
  return { kcal: 0, protein: 0, fat: 0, carb: 0 };
};

export const calcMealPlanItem = (item: MealPlanItem, library: LibraryState) => {
  const hasOverrides =
    item.plannedKcal !== undefined ||
    item.plannedProtein !== undefined ||
    item.plannedFat !== undefined ||
    item.plannedCarb !== undefined;
  if (hasOverrides) {
    return {
      kcal: item.plannedKcal ?? 0,
      protein: item.plannedProtein ?? 0,
      fat: item.plannedFat ?? 0,
      carb: item.plannedCarb ?? 0
    };
  }
  if (item.kind === 'product' && item.refId && item.plannedGrams) {
    const product = library.products.find(prod => prod.id === item.refId);
    if (!product) return { kcal: 0, protein: 0, fat: 0, carb: 0 };
    return macroForProduct(product, item.plannedGrams);
  }
  if (item.kind === 'product' && item.refId && item.plannedPieces) {
    const product = library.products.find(prod => prod.id === item.refId);
    if (!product) return { kcal: 0, protein: 0, fat: 0, carb: 0 };
    const grams = resolveProductGrams(product, item.plannedGrams, item.plannedPieces);
    return macroForProduct(product, grams);
  }
  if (item.kind === 'dish' && item.refId) {
    const recipe = library.recipes.find(rec => rec.id === item.refId);
    if (!recipe) return { kcal: 0, protein: 0, fat: 0, carb: 0 };
    const nutrition = calcRecipeNutrition(recipe, library);
    const servings = item.plannedServings ?? 1;
    return {
      kcal: nutrition.perServing.kcal * servings,
      protein: nutrition.perServing.protein * servings,
      fat: nutrition.perServing.fat * servings,
      carb: nutrition.perServing.carb * servings
    };
  }
  return { kcal: 0, protein: 0, fat: 0, carb: 0 };
};
