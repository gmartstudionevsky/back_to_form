import { FoodEntry, LibraryState, Product, Recipe } from '../types';

const macroForProduct = (product: Product, grams: number) => {
  const factor = grams / 100;
  return {
    kcal: product.kcalPer100g * factor,
    protein: (product.proteinPer100g ?? 0) * factor,
    fat: (product.fatPer100g ?? 0) * factor,
    carb: (product.carbPer100g ?? 0) * factor
  };
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
  if (entry.kcalOverride) {
    return { kcal: entry.kcalOverride, protein: 0, fat: 0, carb: 0 };
  }
  if (entry.kind === 'product' && entry.refId && entry.grams) {
    const product = library.products.find(item => item.id === entry.refId);
    if (!product) return { kcal: 0, protein: 0, fat: 0, carb: 0 };
    return macroForProduct(product, entry.grams);
  }
  if (entry.kind === 'recipe' && entry.refId) {
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
