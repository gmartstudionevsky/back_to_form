import { FoodEntry, LibraryState, MealPlanItem, Product, Recipe } from '../types';

const macroForProduct = (product: Product, grams: number) => {
  const factor = grams / 100;
  return {
    kcal: product.kcalPer100g * factor,
    protein: (product.proteinPer100g ?? 0) * factor,
    fat: (product.fatPer100g ?? 0) * factor,
    carb: (product.carbPer100g ?? 0) * factor
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
  return {
    total: totals,
    perServing: {
      kcal: totals.kcal / recipe.servings,
      protein: totals.protein / recipe.servings,
      fat: totals.fat / recipe.servings,
      carb: totals.carb / recipe.servings
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
