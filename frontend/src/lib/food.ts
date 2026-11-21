export const DIETS = ["VEG", "NON_VEG", "VEGAN", "JAIN", "HALAL", "GLUTEN_FREE", "DIABETIC_FRIENDLY", "RAW_VEGAN", "OTHER", "UNKNOWN"];
export const CATEGORIES = ["COOKED_MEAL", "BAKERY", "FRUIT_VEG", "DAIRY", "PACKAGED", "BEVERAGES", "DESSERTS", "OTHER"];
export const foodLabel = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
