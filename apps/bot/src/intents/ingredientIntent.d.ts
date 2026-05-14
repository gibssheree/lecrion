export type IngredientIntent = {
    type: "ingredient_pop_ice";
} | {
    type: "ingredient_out_summary";
} | {
    type: "ingredient_all_stock";
} | {
    type: "ingredient_low_stock";
} | {
    type: "ingredient_by_category";
    category: string;
} | {
    type: "ingredient_single_stock";
    ingredientRef: string;
} | {
    type: "ingredient_summary";
} | {
    type: "ingredients_all";
    category: string | null;
} | {
    type: "ingredients_single";
    productRef: string;
};
export declare function capitalizeCategory(value?: string): string;
export declare function normalizeIngredientReference(rawText?: string): string;
export declare function detectIngredientInventoryIntent(text: string, normalized: string): IngredientIntent | null;
export declare function detectIngredientIntent(text: string, normalized: string): IngredientIntent | null;
