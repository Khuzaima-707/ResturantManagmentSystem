/**
 * Domain Business Rules & Intelligence
 * Pure functions for category suggestion, unit inference, portions, add-ons, and deletion safety.
 */
import { FOOD_CATALOG, findCatalogFood } from './foodCatalog';
import {
  ADDON_TYPES,
  detectAddonType,
  isAddonRecommended,
  CATEGORY_ADDON_KEYWORDS,
  UNIVERSAL_DRINK_KEYWORDS,
  ITEM_SPECIFIC_ADDONS,
} from './addonRules';
export {
  FOOD_CATALOG,
  findCatalogFood,
  ADDON_TYPES,
  detectAddonType,
  isAddonRecommended,
  CATEGORY_ADDON_KEYWORDS,
  UNIVERSAL_DRINK_KEYWORDS,
  ITEM_SPECIFIC_ADDONS,
};

/**
 * Normalizes a food/item name string
 * Trims whitespace, converts to lower case, and collapses multiple spaces.
 */
export function normalizeFoodName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes keywords array or comma-separated string
 * Trims each keyword, converts to lowercase, deduplicates, and removes empty values.
 */
export function normalizeKeywords(keywords) {
  if (!keywords) return [];
  const list = Array.isArray(keywords)
    ? keywords
    : typeof keywords === 'string'
    ? keywords.split(',')
    : [];

  const seen = new Set();
  const normalized = [];

  for (const item of list) {
    if (typeof item === 'string') {
      const clean = item.trim().toLowerCase();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        normalized.push(clean);
      }
    }
  }

  return normalized;
}

/**
 * Deterministic category auto-suggestion
 * Matches item name against categories using configurable keywords and category names.
 *
 * Scoring Strategy:
 * 1. Exact match with category name -> highest score
 * 2. Keyword exact match or whole-word inclusion -> high score
 * 3. Substring match -> secondary score
 * Returns the category with the strongest unambiguous match, or null if uncertain.
 */
export function suggestCategory(itemName, categories = []) {
  if (!itemName || typeof itemName !== 'string' || !Array.isArray(categories) || !categories.length) {
    return null;
  }

  const cleanItem = normalizeFoodName(itemName);
  if (cleanItem.length < 2) return null;

  const itemWords = cleanItem.split(' ');
  let bestCategory = null;
  let highestScore = 0;

  for (const cat of categories) {
    if (cat.status === 'inactive') continue;

    let score = 0;
    const catNameClean = normalizeFoodName(cat.name);
    const catWords = catNameClean.split(/[\s/\-_,&]+/).filter((w) => w.length > 2);

    // 1. Exact category name match
    if (cleanItem === catNameClean) {
      score += 100;
    } else if (cleanItem.includes(catNameClean)) {
      score += 50 + catNameClean.length;
    } else if (catWords.some((w) => cleanItem.includes(w))) {
      score += 35;
    }

    // 2. Keyword matching
    const keywords = normalizeKeywords(cat.keywords);
    for (const kw of keywords) {
      if (cleanItem === kw) {
        score = Math.max(score, 90 + kw.length);
      } else if (itemWords.includes(kw)) {
        // Whole word match (e.g. "zinger" in "zinger burger")
        score = Math.max(score, 60 + kw.length);
      } else if (cleanItem.includes(kw)) {
        score = Math.max(score, 40 + kw.length);
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestCategory = cat;
    } else if (score === highestScore && score > 0 && bestCategory && bestCategory.id !== cat.id) {
      // Ambiguous tie between distinct categories -> do not guess dangerously
      bestCategory = null;
    }
  }

  // Safe confidence threshold (at least a meaningful word or keyword match)
  if (highestScore >= 25 && bestCategory) {
    return bestCategory;
  }

  // Fallback to Master Catalog Category (only if mapped to an existing category in list)
  const catalogMatch = findCatalogFood(itemName);
  if (catalogMatch && catalogMatch.category) {
    const normCat = normalizeFoodName(catalogMatch.category);
    const catWords = normCat.split(/[\s/\-_,&]+/).filter((w) => w.length > 2);
    const matchedFromList = categories.find((c) => {
      if (c.status === 'inactive') return false;
      const cClean = normalizeFoodName(c.name);
      return cClean === normCat || catWords.some((w) => cClean.includes(w));
    });
    if (matchedFromList) {
      return matchedFromList;
    }
  }

  return null;
}

/**
 * Returns default unit and unit type configured on a Category object
 */
export function getCategoryDefaultUnit(category) {
  if (!category) {
    return { unitType: 'piece', baseUnit: 'piece' };
  }

  // Direct configuration on category record
  const unitType = (category.defaultUnitType || 'piece').toLowerCase();
  const baseUnit = (category.baseUnit || (unitType === 'weight' ? 'kg' : unitType === 'volume' ? 'liter' : 'piece')).toLowerCase();

  return { unitType, baseUnit };
}

/**
 * Backward compatibility alias for existing code
 */
export function getDefaultUnitForCategory(categoryOrName = '') {
  if (typeof categoryOrName === 'object' && categoryOrName !== null) {
    const res = getCategoryDefaultUnit(categoryOrName);
    return { unitType: res.unitType, defaultUnit: res.baseUnit };
  }

  const norm = typeof categoryOrName === 'string' ? categoryOrName.trim().toLowerCase() : '';
  if (norm.includes('biryani') || norm.includes('rice') || norm.includes('karahi') || norm.includes('bbq')) {
    return { unitType: 'weight', defaultUnit: 'kg' };
  }
  if (norm.includes('drink') || norm.includes('beverage') || norm.includes('juice')) {
    return { unitType: 'volume', defaultUnit: 'bottle' };
  }
  return { unitType: 'piece', defaultUnit: 'piece' };
}

/**
 * Standard weight portions preset
 */
export const STANDARD_WEIGHT_PORTIONS = [
  { label: '250g', quantityInBaseUnit: 0.25 },
  { label: '500g', quantityInBaseUnit: 0.5 },
  { label: '750g', quantityInBaseUnit: 0.75 },
  { label: '1kg', quantityInBaseUnit: 1.0 },
];

/**
 * Returns portion options for a category
 */
export function getCategoryDefaultPortions(category) {
  if (!category) return [];

  if (Array.isArray(category.defaultPortions) && category.defaultPortions.length > 0) {
    return category.defaultPortions;
  }

  // If category is weight-based, provide standard weight portions by default
  const unitType = (category.defaultUnitType || '').toLowerCase();
  if (unitType === 'weight') {
    return STANDARD_WEIGHT_PORTIONS;
  }

  return [];
}

/**
 * Smart Food Pairing Compatibility Check
 * Enforces realistic real-world food add-on pairings.
 * e.g. Cheese Slice or Chips must NEVER appear on Biryani / Rice!
 * e.g. Raita or Aloo must NEVER appear on Burgers / Pizza!
 */
export function isRealisticAddonPairing(addonName, foodCategoryName = '', foodItemName = '') {
  if (!addonName) return true;

  const aName = addonName.toLowerCase().trim();
  const cName = (foodCategoryName || '').toLowerCase().trim();
  const iName = (foodItemName || '').toLowerCase().trim();
  const combinedFood = `${cName} ${iName}`;

  const isBiryaniOrRice =
    combinedFood.includes('biryani') ||
    combinedFood.includes('rice') ||
    combinedFood.includes('pulao') ||
    combinedFood.includes('chawal');

  const isRollOrWrap =
    combinedFood.includes('roll') ||
    combinedFood.includes('wrap') ||
    combinedFood.includes('shawarma');

  const isFastFood =
    combinedFood.includes('burger') ||
    combinedFood.includes('pizza') ||
    combinedFood.includes('sandwich') ||
    combinedFood.includes('snack') ||
    combinedFood.includes('fast') ||
    combinedFood.includes('broast') ||
    combinedFood.includes('pasta');

  const isDesiCurry =
    combinedFood.includes('karahi') ||
    combinedFood.includes('handi') ||
    combinedFood.includes('qorma') ||
    combinedFood.includes('korma') ||
    combinedFood.includes('nihari') ||
    combinedFood.includes('haleem') ||
    combinedFood.includes('daal') ||
    combinedFood.includes('dal') ||
    combinedFood.includes('salan') ||
    combinedFood.includes('shorba');

  const isBbq =
    combinedFood.includes('bbq') ||
    combinedFood.includes('tikka') ||
    combinedFood.includes('boti') ||
    combinedFood.includes('kabab') ||
    combinedFood.includes('kebab') ||
    combinedFood.includes('fish');

  const isBeverageOrDrink =
    combinedFood.includes('drink') ||
    combinedFood.includes('beverage') ||
    combinedFood.includes('juice') ||
    combinedFood.includes('shake') ||
    combinedFood.includes('tea') ||
    combinedFood.includes('chai') ||
    combinedFood.includes('coffee') ||
    combinedFood.includes('soda');

  const isDessertOrSweet =
    combinedFood.includes('dessert') ||
    combinedFood.includes('sweet') ||
    combinedFood.includes('mithai') ||
    combinedFood.includes('ice cream') ||
    combinedFood.includes('cake') ||
    combinedFood.includes('brownie') ||
    combinedFood.includes('waffle') ||
    combinedFood.includes('pancake') ||
    combinedFood.includes('kheer') ||
    combinedFood.includes('firni') ||
    combinedFood.includes('jalebi') ||
    combinedFood.includes('gulab jamun') ||
    combinedFood.includes('falooda');

  // Fast food add-ons (cheese, chips, fries, mayo, patty, dip sauce, mushroom, etc.)
  const isFastFoodAddon =
    aName.includes('cheese') ||
    aName.includes('cheesse') ||
    aName.includes('chese') ||
    aName.includes('chz') ||
    aName.includes('chips') ||
    aName.includes('fries') ||
    aName.includes('mayo') ||
    aName.includes('patty') ||
    aName.includes('dip') ||
    aName.includes('nugget') ||
    aName.includes('mozzarella') ||
    aName.includes('cheddar') ||
    aName.includes('parmesan') ||
    aName.includes('jalapeno') ||
    aName.includes('mushroom') ||
    aName.includes('mashroom') ||
    aName.includes('mushrom') ||
    aName.includes('olive') ||
    aName.includes('pepperoni');

  // BBQ-incompatible fast-food add-ons (BBQ allows Fries, Naan, Chutney, Tartar for fish, but NEVER cheese, burger patty, pepperoni, mushrooms)
  const isNonBbqFastFoodAddon =
    aName.includes('cheese') ||
    aName.includes('cheesse') ||
    aName.includes('chese') ||
    aName.includes('mozzarella') ||
    aName.includes('cheddar') ||
    aName.includes('patty') ||
    aName.includes('pepperoni') ||
    aName.includes('mushroom') ||
    aName.includes('mashroom') ||
    aName.includes('nugget');

  // Dessert extras
  const isDessertAddon =
    aName.includes('ice cream') ||
    aName.includes('brownie') ||
    aName.includes('cake') ||
    aName.includes('waffle') ||
    aName.includes('pancake') ||
    aName.includes('nutella') ||
    aName.includes('chocolate') ||
    aName.includes('caramel') ||
    aName.includes('rabri') ||
    aName.includes('custard') ||
    aName.includes('sprinkle');

  // Desi rice / curry add-ons (raita, aloo, potato, dahi)
  const isDesiRiceAddon =
    aName.includes('raita') ||
    aName.includes('aloo') ||
    aName.includes('potato') ||
    aName.includes('dahi');

  const isSavoryFoodAddon =
    isFastFoodAddon ||
    isDesiRiceAddon ||
    aName.includes('boti') ||
    aName.includes('tikka') ||
    aName.includes('kabab') ||
    aName.includes('chutni') ||
    aName.includes('chutney') ||
    aName.includes('salan') ||
    aName.includes('gravy') ||
    aName.includes('naan') ||
    aName.includes('roti') ||
    aName.includes('paratha');

  // Real life rule 0: No savory food add-ons on Drinks/Beverages!
  if (isBeverageOrDrink && isSavoryFoodAddon) {
    return false;
  }

  // Real life rule 0a: Plain beverages (Juice, Tea, Chai, Soda, Mineral Water) do not take dessert extras (e.g. ice cream, brownie)
  const isPlainBeverage =
    combinedFood.includes('juice') ||
    combinedFood.includes('tea') ||
    combinedFood.includes('chai') ||
    combinedFood.includes('soda') ||
    combinedFood.includes('lemonade') ||
    combinedFood.includes('water');

  if (isPlainBeverage && isDessertAddon) {
    return false;
  }

  // Real life rule 0b: No savory meat/curry/fastfood on Sweet Desserts & Ice Cream!
  if (isDessertOrSweet && (isSavoryFoodAddon || aName.includes('meat') || aName.includes('chicken') || aName.includes('beef') || aName.includes('mutton'))) {
    return false;
  }

  // Real life rule 1: No cheese, mushroom, chips, fries, or desserts on Biryani / Rice!
  if (isBiryaniOrRice && (isFastFoodAddon || isDessertAddon)) {
    return false;
  }

  // Real life rule 2a: No fast-food (cheese, fries, patty) or desserts on Desi Curries (Karahi, Handi, Qorma, Nihari, Haleem, Daal)!
  if (isDesiCurry && (isFastFoodAddon || isDessertAddon)) {
    return false;
  }

  // Real life rule 2b: BBQ items allow Fries & Chutney, but NO cheese, patty, pepperoni, mushrooms, or desserts!
  if (isBbq && (isNonBbqFastFoodAddon || isDessertAddon)) {
    return false;
  }

  // Real life rule 3: Rolls / Wraps
  // Dessert extras are blocked on rolls
  if (isRollOrWrap && isDessertAddon) {
    return false;
  }
  // Desi rice extras (raita, aloo) are blocked on rolls
  if (isRollOrWrap && isDesiRiceAddon) {
    return false;
  }
  // Modern rolls (shawarma, zinger roll, wrap, or items with 'cheese'/'crispy') allow cheese and fries.
  // Traditional street rolls (plain Chicken Roll) exclude cheese slice and chips (satisfying authentic practice & Test 18)
  const isModernRollOrShawarma =
    combinedFood.includes('shawarma') ||
    combinedFood.includes('zinger') ||
    combinedFood.includes('wrap') ||
    combinedFood.includes('crispy') ||
    combinedFood.includes('cheese');

  if (isRollOrWrap && !isModernRollOrShawarma) {
    if (
      aName.includes('cheese slice') ||
      aName.includes('chips') ||
      aName.includes('patty') ||
      aName.includes('pepperoni') ||
      aName.includes('mushroom') ||
      aName.includes('mashroom')
    ) {
      return false;
    }
  }

  // Real life rule 4: No raita or aloo on Fast Food (Burgers, Pizza, Pasta)!
  if (isFastFood && (isDesiRiceAddon || aName.includes('salan') || aName.includes('shorba'))) {
    return false;
  }

  // Real life rule 5: Cross-meat mismatch (e.g. Beef add-on on Chicken dish, or Chicken add-on on Beef dish)
  if (
    (aName.includes('beef') && iName.includes('chicken') && !iName.includes('beef')) ||
    (aName.includes('chicken') && iName.includes('beef') && !iName.includes('chicken')) ||
    (aName.includes('mutton') && iName.includes('chicken') && !iName.includes('mutton')) ||
    (aName.includes('chicken') && iName.includes('mutton') && !iName.includes('chicken')) ||
    (aName.includes('beef') && iName.includes('mutton') && !iName.includes('beef')) ||
    (aName.includes('mutton') && iName.includes('beef') && !iName.includes('mutton'))
  ) {
    return false;
  }

  return true;
}

/**
 * Automatically detects suitable category IDs for an add-on based on its name.
 */
export function detectAddonCategories(addonName, categories = []) {
  if (!addonName || !Array.isArray(categories) || !categories.length) return [];
  const aName = addonName.toLowerCase().trim();

  const matchedCatIds = [];

  for (const cat of categories) {
    const cName = (cat.name || '').toLowerCase();
    const cWords = `${cName} ${(cat.keywords || []).join(' ')}`.toLowerCase();

    // Check each category key in CATEGORY_ADDON_KEYWORDS
    for (const [catKey, addonKeywords] of Object.entries(CATEGORY_ADDON_KEYWORDS)) {
      if (cWords.includes(catKey)) {
        const matchesKeyword = addonKeywords.some((kw) => aName.includes(kw));
        if (matchesKeyword) {
          if (isRealisticAddonPairing(addonName, cName, '')) {
            matchedCatIds.push(cat.id);
          }
        }
      }
    }
  }

  return Array.from(new Set(matchedCatIds));
}

/**
 * Checks if an add-on is an authentic Desi Rice / Biryani / Pulao add-on.
 * Used to safeguard Biryani against arbitrary unassigned add-ons.
 */
export function isAuthenticRiceAddon(addonName = '') {
  if (!addonName) return false;
  const norm = addonName.toLowerCase().trim();

  // Universal drinks are allowed across all food items
  if (
    UNIVERSAL_DRINK_KEYWORDS.some((dk) => norm.includes(dk)) ||
    norm.includes('cold drink') ||
    norm.includes('drink') ||
    norm.includes('water') ||
    norm.includes('pepsi') ||
    norm.includes('coke') ||
    norm.includes('sprite') ||
    norm.includes('7up') ||
    norm.includes('dew') ||
    norm.includes('soda')
  ) {
    return true;
  }

  // Authentic Desi Rice & Biryani Add-ons:
  return (
    norm.includes('raita') ||
    norm.includes('dahi') ||
    norm.includes('salad') ||
    norm.includes('kachumber') ||
    norm.includes('shami') ||
    norm.includes('boti') ||
    norm.includes('tikka') ||
    norm.includes('aloo') ||
    norm.includes('potato') ||
    norm.includes('egg') ||
    norm.includes('anda') ||
    norm.includes('salan') ||
    norm.includes('gravy') ||
    norm.includes('shorba') ||
    norm.includes('chutni') ||
    norm.includes('chutney')
  );
}

/**
 * Resolves compatible add-ons for an item:
 * 1. Realistic pairing sanity check (no cheese on biryani, no beef on chicken dish)
 * 2. Intelligent category & item recommendation match (Category -> allowed add-ons + Specific Item -> extra add-ons)
 * 3. Item-specific assignments (addon.itemIds contains item.id or item.addonIds contains addon.id)
 * 4. Category assignments (addon.categoryIds contains category.id)
 * 5. Category default add-ons (category.defaultAddonIds contains addon.id)
 * 6. Deduplicate by ID and enrich with 6 canonical Add-on Types
 * 7. Active only
 */
export function getCompatibleAddons(item, category, allAddons = [], allCategories = []) {
  if (!Array.isArray(allAddons) || !allAddons.length) return [];

  const itemCatName = (category?.name || item?.categoryName || '').toLowerCase().trim();
  const itemCatId = (category?.id || item?.categoryId || '').toLowerCase().trim();
  const itemId = (item?.id || '').toLowerCase().trim();
  const itemName = (item?.name || '').toLowerCase().trim();

  const matched = allAddons.filter((addon) => {
    if (addon.status !== 'active') return false;

    // 0. Universal Drink / Cold Drink Rule (Per user requirement: "drink or coldrink har item ma addon m ay har item ma all over ma kiuka har food ka sath lazmi ha drink or coldrink fix ha ya")
    const isDrinkAddon =
      addon.type === 'Drink' ||
      detectAddonType(addon.name) === 'Drink' ||
      UNIVERSAL_DRINK_KEYWORDS.some((dk) => addon.name.toLowerCase().includes(dk));

    const isCurrentItemDrink =
      itemCatName.includes('drink') ||
      itemCatName.includes('beverage') ||
      itemCatName.includes('juice') ||
      itemCatName.includes('shake') ||
      itemCatName.includes('tea') ||
      itemCatName.includes('chai') ||
      itemCatName.includes('coffee') ||
      itemCatName.includes('soda') ||
      itemName.includes('drink') ||
      itemName.includes('mineral water');

    if (isDrinkAddon && !isCurrentItemDrink) {
      return true;
    }

    // Sanity check: Disallow realistic food mismatches (e.g. Cheese Slice or Chips on Biryani)
    if (!isRealisticAddonPairing(addon.name, itemCatName, itemName)) {
      return false;
    }

    // 1. Intelligent restaurant matrix recommendation (Category -> allowed, Item -> specific)
    if (isAddonRecommended(addon.name, itemCatName, itemName)) {
      return true;
    }

    const hasSpecificCategories = Array.isArray(addon.categoryIds) && addon.categoryIds.length > 0;
    const hasSpecificItems = Array.isArray(addon.itemIds) && addon.itemIds.length > 0;

    // 2. If add-on has NO category restrictions and NO item restrictions:
    // Biryani & Rice items only get authentic rice addons or universal drinks.
    // All other food items ONLY match if recommended by isAddonRecommended (which was checked above).
    // This permanently prevents unassigned add-ons (e.g. Mayo, Tartar, Fries) from leaking onto unrelated categories!
    if (!hasSpecificCategories && !hasSpecificItems) {
      const isCurrentItemRice =
        itemCatName.includes('biryani') ||
        itemCatName.includes('rice') ||
        itemCatName.includes('pulao') ||
        itemName.includes('biryani') ||
        itemName.includes('rice') ||
        itemName.includes('pulao');

      if (isCurrentItemRice) {
        return isAuthenticRiceAddon(addon.name);
      }
      return false;
    }

    // 3. Item-specific assignment
    if (itemId) {
      if (hasSpecificItems && addon.itemIds.some((id) => String(id).toLowerCase() === itemId)) {
        return true;
      }
      if (Array.isArray(item?.addonIds) && item.addonIds.some((id) => String(id).toLowerCase() === String(addon.id).toLowerCase())) {
        return true;
      }
    }

    // 4. Category assignment on add-on
    if (hasSpecificCategories && (itemCatId || itemCatName)) {
      // Direct ID match
      const hasIdMatch = addon.categoryIds.some((cid) => {
        const cIdLower = String(cid).toLowerCase();
        return cIdLower === itemCatId || cIdLower.includes(itemCatId) || itemCatId.includes(cIdLower);
      });
      if (hasIdMatch) return true;

      // Name / slug match (e.g. 'cat-biryani' matches item in category 'Biryani' or 'Rice / Biryani')
      const hasNameMatch = addon.categoryIds.some((cid) => {
        const cIdClean = String(cid).toLowerCase().replace(/^cat-/, '');
        if (itemCatName && (itemCatName.includes(cIdClean) || cIdClean.includes(itemCatName))) {
          return true;
        }
        if (Array.isArray(allCategories)) {
          const catObj = allCategories.find((c) => String(c.id).toLowerCase() === String(cid).toLowerCase());
          if (catObj?.name && (catObj.name.toLowerCase().includes(itemCatName) || itemCatName.includes(catObj.name.toLowerCase()))) {
            return true;
          }
        }
        return false;
      });
      if (hasNameMatch) return true;
    }

    // 5. Category default add-ons reference
    if (category?.defaultAddonIds && Array.isArray(category.defaultAddonIds)) {
      if (category.defaultAddonIds.some((id) => String(id).toLowerCase() === String(addon.id).toLowerCase())) {
        return true;
      }
    }

    return false;
  });

  // Deduplicate by ID and enrich with 6 canonical Add-on Types
  const map = new Map();
  matched.forEach((a) => {
    map.set(a.id, {
      ...a,
      type: a.type || detectAddonType(a.name),
    });
  });
  return Array.from(map.values());
}

/**
 * Validates whether a category can be deleted safely
 * If referenced by menu items, blocks deletion to avoid orphan records.
 */
export function validateCategoryDeletion(categoryId, items = []) {
  if (!categoryId) return { canDelete: false, message: 'Invalid category ID' };

  const assignedItems = items.filter((item) => item.categoryId === categoryId);
  const count = assignedItems.length;

  if (count > 0) {
    return {
      canDelete: false,
      itemCount: count,
      message: `Cannot delete category because ${count} menu item(s) are assigned to it. Please reassign or delete these items first.`,
    };
  }

  return {
    canDelete: true,
    itemCount: 0,
    message: null,
  };
}

/**
 * Validates whether an item can be deleted safely
 * If referenced in historical order transactions, blocks hard deletion to protect audit trail.
 */
export function validateItemDeletion(itemId, orders = []) {
  if (!itemId) return { canDelete: false, canArchive: false, message: 'Invalid item ID' };

  let orderCount = 0;
  if (Array.isArray(orders)) {
    for (const order of orders) {
      if (Array.isArray(order.lines) && order.lines.some((line) => line.itemId === itemId)) {
        orderCount++;
      }
    }
  }

  if (orderCount > 0) {
    return {
      canDelete: false,
      canArchive: true,
      orderCount,
      message: `Item is referenced in ${orderCount} historical order invoice(s). To protect accounting integrity, it will be deactivated instead of permanently deleted.`,
    };
  }

  return {
    canDelete: true,
    canArchive: false,
    orderCount: 0,
    message: null,
  };
}

/**
 * Checks if a category name is duplicate (case-insensitive)
 */
export function isDuplicateCategoryName(name, categories = [], excludeId = null) {
  const norm = normalizeFoodName(name);
  if (!norm) return false;
  return categories.some((c) => c.id !== excludeId && normalizeFoodName(c.name) === norm);
}

/**
 * Safely parses and validates a sortOrder value.
 * Must be a positive integer (> 0).
 * Returns null if missing, empty, invalid, non-integer, negative, or NaN.
 */
export function parseSortOrder(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
    return null;
  }
  return num;
}

/**
 * Detects if a text represents cold drinks, soft drinks, beverages, water, juices, etc.
 */
export function isDrinkOrColdItem(text = '') {
  const norm = String(text || '').toLowerCase();
  return (
    norm.includes('drink') ||
    norm.includes('coldrink') ||
    norm.includes('cold drink') ||
    norm.includes('softdrink') ||
    norm.includes('soft drink') ||
    norm.includes('beverage') ||
    norm.includes('water') ||
    norm.includes('juice') ||
    norm.includes('soda') ||
    norm.includes('shake') ||
    norm.includes('smoothie') ||
    norm.includes('dew') ||
    norm.includes('coke') ||
    norm.includes('pepsi') ||
    norm.includes('fanta') ||
    norm.includes('sprite') ||
    norm.includes('marinda') ||
    norm.includes('mirinda') ||
    norm.includes('7up') ||
    norm.includes('sting') ||
    norm.includes('red bull') ||
    norm.includes('monster') ||
    norm.includes('lemonade') ||
    norm.includes('lassi') ||
    norm.includes('mineral water') ||
    norm.includes('cold item') ||
    norm.includes('tea') ||
    norm.includes('coffee') ||
    norm.includes('chai') ||
    norm.includes('bottle')
  );
}

/**
 * Detects if a text represents desserts, sweet dishes, ice creams, meetha, etc.
 */
export function isDessertOrSweetItem(text = '') {
  const norm = String(text || '').toLowerCase();
  return (
    norm.includes('desert') ||
    norm.includes('dessert') ||
    norm.includes('sweet') ||
    norm.includes('ice cream') ||
    norm.includes('icecream') ||
    norm.includes('kheer') ||
    norm.includes('halwa') ||
    norm.includes('gulab jamun') ||
    norm.includes('jalebi') ||
    norm.includes('rasmalai') ||
    norm.includes('mithai') ||
    norm.includes('meetha') ||
    norm.includes('falooda') ||
    norm.includes('custard') ||
    norm.includes('pudding') ||
    norm.includes('cake') ||
    norm.includes('pastry') ||
    norm.includes('brownie')
  );
}

/**
 * Categorizes a category into display tiers:
 * Tier 1: Main food categories (Rice, Biryani, Karahi, Roll, BBQ, Burger, Pizza, etc.)
 * Tier 2: End-of-menu categories: Desserts & Sweets (Sweet items)
 * Tier 3: End-of-menu categories: Cold Drinks, Beverages, Water, Cold items
 */
export function getCategoryTier(category) {
  const name = String(category?.name || category?.slug || category || '').toLowerCase().trim();
  const keywords = Array.isArray(category?.keywords) ? category.keywords.join(' ').toLowerCase() : '';
  const combined = `${name} ${keywords}`;

  if (isDessertOrSweetItem(combined)) {
    return 2;
  }
  if (isDrinkOrColdItem(combined)) {
    return 3;
  }
  return 1;
}

/**
 * Categorizes an individual menu item into display tiers
 */
export function getItemTier(item, categories = []) {
  const cat = Array.isArray(categories)
    ? categories.find(
        (c) =>
          c.id === item?.categoryId ||
          (item?.categoryName && c.name?.toLowerCase() === item.categoryName?.toLowerCase())
      )
    : null;
  const catName = cat?.name || item?.categoryName || '';
  const itemName = item?.name || '';
  const desc = item?.description || '';
  const combined = `${catName} ${itemName} ${desc}`;

  if (isDessertOrSweetItem(combined)) {
    return 2;
  }
  if (isDrinkOrColdItem(combined)) {
    return 3;
  }
  return 1;
}

/**
 * Sorts menu items:
 * 1. Food items first (Tier 1)
 * 2. Sweet items & desserts next (Tier 2)
 * 3. Cold drinks, beverages & water last (Tier 3)
 * Within each tier, items are sorted by their category sortOrder then alphabetically by name.
 */
export function sortMenuItems(items = [], categories = []) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const tierA = getItemTier(a, categories);
    const tierB = getItemTier(b, categories);

    if (tierA !== tierB) {
      return tierA - tierB;
    }

    if (a?.categoryId && b?.categoryId && a.categoryId !== b.categoryId && Array.isArray(categories)) {
      const catA = categories.find((c) => c.id === a.categoryId);
      const catB = categories.find((c) => c.id === b.categoryId);
      if (catA && catB) {
        const orderA = parseSortOrder(catA.sortOrder);
        const orderB = parseSortOrder(catB.sortOrder);
        if (orderA !== null && orderB !== null && orderA !== orderB) {
          return orderA - orderB;
        }
        if (orderA !== null && orderB === null) return -1;
        if (orderA === null && orderB !== null) return 1;
      }
    }

    return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

/**
 * Sorts an array of category objects deterministically:
 * 1. Primary natural tier: Main Food (Tier 1) -> Desserts & Sweets (Tier 2) -> Cold Drinks & Water (Tier 3)
 * 2. Within each tier, ascending by numeric sortOrder (1, 2, 3...)
 * 3. Missing/null/invalid sortOrders follow valid ones within the tier, sorted alphabetically A-Z.
 * 4. Duplicate sortOrders are broken deterministically by name A-Z, then id.
 * Does not mutate the original array.
 */
export function sortCategories(categories = []) {
  if (!Array.isArray(categories)) return [];
  return [...categories].sort((a, b) => {
    // 1. Natural tier: Food comes first, Desserts next, Cold Drinks / Water last
    const tierA = getCategoryTier(a);
    const tierB = getCategoryTier(b);

    if (tierA !== tierB) {
      return tierA - tierB;
    }

    // 2. Within the same tier, sort ascending by numeric sortOrder (1, 2, 3...)
    const orderA = parseSortOrder(a?.sortOrder);
    const orderB = parseSortOrder(b?.sortOrder);

    const hasOrderA = orderA !== null;
    const hasOrderB = orderB !== null;

    if (hasOrderA && hasOrderB) {
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const nameCompare = String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
        sensitivity: 'base',
        numeric: true,
      });
      if (nameCompare !== 0) return nameCompare;
      return String(a?.id || '').localeCompare(String(b?.id || ''));
    }

    if (hasOrderA && !hasOrderB) return -1;
    if (!hasOrderA && hasOrderB) return 1;

    // 3. Stable alphabetical tie-breaker within the same tier
    const nameCompare = String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
      sensitivity: 'base',
      numeric: true,
    });
    if (nameCompare !== 0) return nameCompare;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
}

/**
 * Checks if an add-on name is duplicate (case-insensitive)
 */
export function isDuplicateAddonName(name, addons = [], excludeId = null) {
  const norm = normalizeFoodName(name);
  if (!norm) return false;
  return addons.some((a) => a.id !== excludeId && normalizeFoodName(a.name) === norm);
}

/**
 * Intelligently suggests the most authentic serving unit / portion for a food item.
 * e.g.
 * - Chicken Roll / Shawarma / Wrap -> 'Piece / Single'
 * - Zinger Burger / Sandwich -> 'Piece / Single'
 * - Chicken Biryani / Pulao -> 'Full (1 Kg)'
 * - Chicken Karahi / Handi -> 'Full (1 Kg)'
 * - Fajita Pizza -> 'Regular (8")'
 * - Tikka / Seekh Kabab -> 'Piece / Single'
 * - Drinks / Sodas / Cold Drink / Water -> 'Can / Bottle'
 * - Chai / Tea / Coffee -> 'Cup'
 * - Juices / Shakes / Lassi -> 'Glass'
 */
export function suggestServingUnit(foodItemName = '', foodCategoryName = '') {
  // 1. Direct Catalog Lookup (Covers all 26 categories & 160+ items provided by user)
  const catalogMatch = findCatalogFood(foodItemName, foodCategoryName);
  if (catalogMatch && catalogMatch.unit) {
    return catalogMatch.unit;
  }

  const iName = (foodItemName || '').toLowerCase().trim();
  const cName = (foodCategoryName || '').toLowerCase().trim();
  const combined = `${cName} ${iName}`;

  if (!combined) return 'Piece';

  // 1. Hot Drinks: Chai / Tea / Coffee -> Cup
  if (
    combined.includes('chai') ||
    combined.includes('tea') ||
    combined.includes('coffee') ||
    combined.includes('cappuccino') ||
    combined.includes('latte') ||
    combined.includes('espresso') ||
    combined.includes('kahwa') ||
    combined.includes('green tea')
  ) {
    return 'Cup';
  }

  // 2. Juices, Shakes, Smoothies, Lassi, Mocktails -> Glass
  if (
    combined.includes('juice') ||
    combined.includes('shake') ||
    combined.includes('smoothie') ||
    combined.includes('lassi') ||
    combined.includes('lemonade') ||
    combined.includes('margarita') ||
    combined.includes('mojito') ||
    combined.includes('pina colada')
  ) {
    return 'Glass';
  }

  // 3. Cold Drinks, Sodas, Bottled/Canned Beverages, Water -> Bottle / Can
  if (
    combined.includes('drink') ||
    combined.includes('beverage') ||
    combined.includes('soda') ||
    combined.includes('pepsi') ||
    combined.includes('coke') ||
    combined.includes('cola') ||
    combined.includes('sprite') ||
    combined.includes('7up') ||
    combined.includes('dew') ||
    combined.includes('fanta') ||
    combined.includes('mirinda') ||
    combined.includes('sting') ||
    combined.includes('pakola') ||
    combined.includes('water') ||
    combined.includes('can') ||
    combined.includes('bottle')
  ) {
    if (combined.includes('can')) {
      return 'Can';
    }
    return 'Bottle';
  }

  // 4. Rolls, Wraps, Shawarmas -> Piece
  if (
    combined.includes('roll') ||
    combined.includes('wrap') ||
    combined.includes('shawarma') ||
    combined.includes('paratha roll')
  ) {
    return 'Piece';
  }

  // 5. Burgers, Sandwiches, Broast -> Piece
  if (
    combined.includes('burger') ||
    combined.includes('zinger') ||
    combined.includes('sandwich') ||
    combined.includes('broast') ||
    combined.includes('patty')
  ) {
    return 'Piece';
  }

  // 6. Pizza -> Medium (dropdown: Small, Medium, Large)
  if (combined.includes('pizza')) {
    return 'Medium';
  }

  // 7. Biryani & Pulao & Rice -> 1 Kg (user requirement: 1kg ho sirf kg nhi)
  if (
    combined.includes('biryani') ||
    combined.includes('pulao')
  ) {
    return '1 Kg';
  }

  if (combined.includes('plain rice') || combined.includes('zeera rice') || (combined.includes('rice') && !combined.includes('fried'))) {
    return '1 Kg';
  }

  // 8. Karahi & Handi -> 1 Kg (user requirement: 1kg ho sirf kg nhi)
  if (
    combined.includes('karahi') ||
    combined.includes('handi') ||
    combined.includes('shinwari')
  ) {
    return '1 Kg';
  }

  if (
    combined.includes('nihari') ||
    combined.includes('haleem') ||
    combined.includes('salan') ||
    combined.includes('gravy') ||
    combined.includes('qorma') ||
    combined.includes('korma')
  ) {
    return 'Plate';
  }

  // 9. BBQ, Tikka, Kabab
  if (combined.includes('boti')) {
    return 'Plate';
  }
  if (combined.includes('kabab') || combined.includes('kebab')) {
    return 'Piece';
  }
  if (
    combined.includes('tikka') ||
    combined.includes('seekh') ||
    combined.includes('bbq') ||
    combined.includes('chops')
  ) {
    return 'Piece';
  }

  // 10. Breads / Tandoor (Naan, Roti, Chapati, Paratha) -> Piece
  if (
    combined.includes('naan') ||
    combined.includes('roti') ||
    combined.includes('chapati') ||
    combined.includes('puri') ||
    combined.includes('kulcha')
  ) {
    return 'Piece';
  }

  // 11. Desserts, Sweets, Ice Cream
  if (
    combined.includes('ice cream') ||
    combined.includes('kulfi') ||
    combined.includes('scoop')
  ) {
    return 'Scoop';
  }
  if (
    combined.includes('cake') ||
    combined.includes('brownie') ||
    combined.includes('pastry')
  ) {
    return 'Slice';
  }
  if (
    combined.includes('kheer') ||
    combined.includes('custard') ||
    combined.includes('falooda') ||
    combined.includes('halwa') ||
    combined.includes('gulab jamun') ||
    combined.includes('sweet') ||
    combined.includes('dessert')
  ) {
    return '1 Kg';
  }

  // 12. Soups -> Bowl
  if (combined.includes('soup')) {
    return 'Bowl';
  }

  // 13. Fries -> Plate (user requirement: fries palte hogi services nhi yar)
  if (
    combined.includes('fries') ||
    combined.includes('wedge')
  ) {
    return 'Plate';
  }

  if (
    combined.includes('nugget') ||
    combined.includes('wing') ||
    combined.includes('finger')
  ) {
    return 'Plate';
  }

  return 'Piece';
}

/**
 * Suggests an authentic descriptive placeholder for food item
 */
export function suggestDescriptionPlaceholder(foodItemName = '', foodCategoryName = '') {
  const iName = (foodItemName || '').toLowerCase().trim();
  const cName = (foodCategoryName || '').toLowerCase().trim();
  const combined = `${cName} ${iName}`;

  // Hot drinks
  if (
    combined.includes('chai') ||
    combined.includes('tea') ||
    combined.includes('coffee') ||
    combined.includes('kahwa')
  ) {
    return 'Freshly brewed and served piping hot';
  }

  // Shakes, juices, lassi
  if (
    combined.includes('shake') ||
    combined.includes('juice') ||
    combined.includes('smoothie') ||
    combined.includes('lassi')
  ) {
    return 'Freshly blended refreshing drink served chilled';
  }

  // Cold drinks, sodas, water
  if (
    combined.includes('drink') ||
    combined.includes('beverage') ||
    combined.includes('soda') ||
    combined.includes('pepsi') ||
    combined.includes('coke') ||
    combined.includes('cola') ||
    combined.includes('water') ||
    combined.includes('lemonade')
  ) {
    return 'Chilled and refreshing beverage served cold';
  }

  // Rolls / Wraps
  if (combined.includes('roll') || combined.includes('wrap') || combined.includes('shawarma')) {
    return 'Tender spiced meat wrapped in golden crispy paratha with signature chutney';
  }

  // Biryani / Rice
  if (combined.includes('biryani') || combined.includes('pulao') || combined.includes('rice')) {
    return 'Aromatic basmati rice layered with spiced tender meat and golden potatoes';
  }

  // Burgers / Sandwiches
  if (combined.includes('burger') || combined.includes('zinger') || combined.includes('sandwich')) {
    return 'Crispy crunchy fillet with fresh lettuce and signature secret sauce';
  }

  // Pizza
  if (combined.includes('pizza')) {
    return 'Pan crust pizza loaded with premium toppings and mozzarella cheese';
  }

  // Karahi / Handi
  if (combined.includes('karahi') || combined.includes('handi')) {
    return 'Rich tomato gravy cooked in a traditional wok with fresh ginger and green chilies';
  }

  // BBQ
  if (combined.includes('bbq') || combined.includes('tikka') || combined.includes('kabab') || combined.includes('boti')) {
    return 'Charcoal grilled to perfection with smoky aroma and special spices';
  }

  // Breads / Tandoor
  if (combined.includes('naan') || combined.includes('roti') || combined.includes('chapati')) {
    return 'Freshly baked hot from the traditional clay tandoor';
  }

  // Desserts
  if (
    combined.includes('sweet') ||
    combined.includes('dessert') ||
    combined.includes('ice cream') ||
    combined.includes('cake') ||
    combined.includes('kheer')
  ) {
    return 'Rich, sweet and freshly prepared traditional delicacy';
  }

  // Soups
  if (combined.includes('soup')) {
    return 'Warm, comforting broth simmered with fresh ingredients';
  }

  return 'Freshly prepared with authentic taste and quality ingredients';
}

/**
 * Returns strictly relevant serving units for a food item/category.
 * Excludes irrelevant units from the dropdown (e.g. no pizza sizes or kg on a Roll).
 */
export function getAvailableUnitsForFood(foodItemName = '', foodCategoryName = '') {
  const catalogMatch = findCatalogFood(foodItemName, foodCategoryName);
  const recUnit = catalogMatch?.unit;

  const iName = (foodItemName || '').toLowerCase().trim();
  const cName = (foodCategoryName || '').toLowerCase().trim();
  const combined = `${cName} ${iName}`;

  let units = [];
  if (recUnit) {
    units.push(recUnit);
  }

  if (
    combined.includes('biryani') ||
    combined.includes('pulao')
  ) {
    units.push('1 Kg', 'Plate', 'Custom');
  } else if (
    combined.includes('rice')
  ) {
    units.push('1 Kg', 'Plate', 'Custom');
  } else if (combined.includes('karahi') || combined.includes('handi')) {
    units.push('1 Kg', 'Plate', 'Custom');
  } else if (combined.includes('pizza')) {
    units.push('Small', 'Medium', 'Large', 'Extra Large', 'Slice', 'Custom');
  } else if (combined.includes('fries') || combined.includes('wedge')) {
    units.push('Plate', 'Half Plate', 'Large Plate', 'Custom');
  } else if (
    combined.includes('drink') ||
    combined.includes('beverage') ||
    combined.includes('soda') ||
    combined.includes('water') ||
    combined.includes('pepsi') ||
    combined.includes('coke') ||
    combined.includes('dew') ||
    combined.includes('sprite') ||
    combined.includes('7up') ||
    combined.includes('fanta') ||
    combined.includes('mirinda') ||
    combined.includes('sting')
  ) {
    units.push(
      'Bottle',
      'Can',
      'Glass',
      '300ml',
      '250ml',
      '345ml',
      '500ml',
      '1 Litre',
      '1.5 Litre',
      '2 Litre',
      '2.25 Litre',
      'Tin',
      '1.5L',
      'Custom'
    );
  } else if (
    combined.includes('tea') ||
    combined.includes('chai') ||
    combined.includes('coffee')
  ) {
    units.push('Cup', 'Small Cup', 'Large Cup', 'Glass', 'Custom');
  } else if (
    combined.includes('shake') ||
    combined.includes('juice') ||
    combined.includes('lassi')
  ) {
    units.push('Glass', 'Regular Glass', 'Large Glass', 'Custom');
  } else if (combined.includes('soup')) {
    units.push('Bowl', 'Single Bowl', 'Family Bowl', 'Custom');
  } else if (
    combined.includes('sweet') ||
    combined.includes('halwa') ||
    combined.includes('mithai')
  ) {
    units.push('1 Kg', 'Plate', 'Custom');
  } else if (
    combined.includes('ice cream') ||
    combined.includes('dessert') ||
    combined.includes('cake')
  ) {
    units.push('Scoop', 'Slice', 'Piece', 'Custom');
  } else if (combined.includes('bbq')) {
    units.push('Piece', 'Plate', '1 Kg', 'Platter', 'Custom');
  } else {
    units.push('Piece', 'Plate', 'Serving', 'Custom');
  }

  const cleanUnits = units
    .filter(Boolean)
    .filter((u) => u !== '2 Kg' && u !== 'Half Kg')
    .map((u) => (u === 'Kg' ? '1 Kg' : u));

  return Array.from(new Set(cleanUnits));
}

/**
 * Comprehensive Cold Drink & Beverage Serving Units (A to Z)
 * Covers cans, tins, standard bottles, glasses, and portion sizes used across restaurants.
 */
export const COLD_DRINK_UNITS = [
  '250ml',
  '250ml Bottle',
  '250ml Can',
  '300ml',
  '300ml Bottle',
  '300ml Can',
  '330ml Can',
  '345ml',
  '345ml Bottle',
  '500ml',
  '500ml Bottle',
  '500ml Can',
  '750ml',
  '750ml Bottle',
  '1 Litre',
  '1 Litre Bottle',
  '1.5 Litre',
  '1.5 Litre Bottle',
  '2 Litre',
  '2 Litre Bottle',
  '2.25 Litre',
  '2.25 Litre Bottle',
  'Bottle',
  'Can',
  'Cup',
  'Diet Can',
  'Dispenser Glass',
  'Glass',
  'Glass Bottle',
  'Large Bottle',
  'Large Glass',
  'Medium Glass',
  'Mini Can (150ml)',
  'PET Bottle',
  'Pack',
  'Regular Bottle',
  'Regular Can',
  'Regular Glass',
  'Single Can',
  'Small Bottle',
  'Small Glass',
  'Tin',
  'Tin Pack',
];

/**
 * Standard Food & Meal Units
 */
export const FOOD_UNITS = [
  'Piece',
  'Plate',
  'Half Plate',
  'Full Plate',
  'Portion',
  'Half',
  'Full',
  'Slice',
  'Scoop',
  'Bowl',
  '1 Kg',
  '2 Kg',
  '500g',
  '250g',
  'Box',
  'Pack',
];

/**
 * Master Standard Units collection (Deduplicated)
 */
export const ALL_STANDARD_UNITS = Array.from(new Set([...COLD_DRINK_UNITS, ...FOOD_UNITS]));

export * from './settingsRules';

/**
 * Resolves all compatible add-ons explicitly attached or configured for a menu item
 */
export function getItemCompatibleAddons(item, allAddons = []) {
  if (!item) return [];

  const result = [];
  const seenNames = new Set();
  const seenIds = new Set();

  // 1. Direct extra add-ons configured on this item (from ItemModal)
  if (Array.isArray(item.addons) && item.addons.length > 0) {
    item.addons.forEach((da, idx) => {
      if (!da || !da.name || !(Number(da.price) > 0)) return;
      const normName = da.name.trim().toLowerCase();
      const storeAddon = (allAddons || []).find(
        (sa) => sa && (sa.id === da.id || (sa.name && sa.name.trim().toLowerCase() === normName))
      );
      const resolvedCost =
        da.costPrice !== undefined && da.costPrice !== null
          ? Number(da.costPrice)
          : storeAddon?.costPrice !== undefined && storeAddon?.costPrice !== null
          ? Number(storeAddon.costPrice)
          : null;

      const id = da.id || storeAddon?.id || `direct-addon-${idx}-${normName}`;
      if (!seenNames.has(normName) && !seenIds.has(id)) {
        seenNames.add(normName);
        seenIds.add(id);
        result.push({
          id,
          name: da.name.trim(),
          price: Number(da.price) || 0,
          costPrice: resolvedCost,
          status: 'active',
          type: da.type || storeAddon?.type || detectAddonType(da.name) || 'Food',
        });
      }
    });
  }

  // 2. Add-ons linked via item.addonIds or addon.itemIds
  const itemAddonIds = Array.isArray(item.addonIds) ? item.addonIds.map(String) : [];
  const currentItemId = String(item.id || '').toLowerCase();

  (allAddons || []).forEach((addon) => {
    if (addon.status !== 'active') return;
    const aId = String(addon.id || '');
    const isLinkedById = itemAddonIds.includes(aId);
    const isLinkedByItemIds =
      Array.isArray(addon.itemIds) &&
      addon.itemIds.some((id) => String(id).toLowerCase() === currentItemId);

    if (isLinkedById || isLinkedByItemIds) {
      const normName = (addon.name || '').trim().toLowerCase();
      if (!seenNames.has(normName) && !seenIds.has(aId)) {
        seenNames.add(normName);
        seenIds.add(aId);
        result.push({
          ...addon,
          price: Number(addon.price) || 0,
          costPrice: addon.costPrice !== undefined && addon.costPrice !== null ? Number(addon.costPrice) : null,
          type: addon.type || detectAddonType(addon.name) || 'Food',
        });
      }
    }
  });

  return result;
}

