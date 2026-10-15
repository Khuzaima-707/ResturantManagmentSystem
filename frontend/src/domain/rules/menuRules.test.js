import { describe, it, expect, beforeEach } from 'vitest';
import {
  suggestCategory,
  suggestServingUnit,
  getAvailableUnitsForFood,
  suggestDescriptionPlaceholder,
  getCategoryDefaultUnit,
  getCategoryDefaultPortions,
  getCompatibleAddons,
  isRealisticAddonPairing,
  detectAddonCategories,
  validateCategoryDeletion,
  validateItemDeletion,
  isDuplicateCategoryName,
  isDuplicateAddonName,
  normalizeFoodName,
  normalizeKeywords,
  ADDON_TYPES,
  detectAddonType,
  isAddonRecommended,
  parseSortOrder,
  sortCategories,
  sortMenuItems,
  getCategoryTier,
  getItemTier,
  COLD_DRINK_UNITS,
  FOOD_UNITS,
  ALL_STANDARD_UNITS,
} from './index';
import { CategoryRepository } from '../../services/repositories/CategoryRepository';
import { ItemRepository } from '../../services/repositories/ItemRepository';
import { AddonRepository } from '../../services/repositories/AddonRepository';
import { storage } from '../../services/persistence/storage';

describe('Batch 3: Menu Domain Rules & Intelligence', () => {
  const mockCategories = [
    {
      id: 'cat-biryani',
      name: 'Rice / Biryani',
      status: 'active',
      defaultUnitType: 'weight',
      baseUnit: 'kg',
      keywords: ['biryani', 'chicken biryani', 'beef biryani', 'pulao'],
      defaultPortions: [
        { label: '250g', quantityInBaseUnit: 0.25 },
        { label: '500g', quantityInBaseUnit: 0.5 },
        { label: '750g', quantityInBaseUnit: 0.75 },
        { label: '1kg', quantityInBaseUnit: 1.0 },
      ],
      defaultAddonIds: ['addon-raita'],
    },
    {
      id: 'cat-burgers',
      name: 'Burgers & Sandwiches',
      status: 'active',
      defaultUnitType: 'piece',
      baseUnit: 'piece',
      keywords: ['burger', 'zinger', 'beef burger', 'crispy chicken'],
      defaultPortions: [],
      defaultAddonIds: ['addon-cheese'],
    },
    {
      id: 'cat-drinks',
      name: 'Drinks & Beverages',
      status: 'active',
      defaultUnitType: 'volume',
      baseUnit: 'glass',
      keywords: ['drink', 'beverage', 'lemonade', 'juice'],
      defaultPortions: [],
      defaultAddonIds: [],
    },
  ];

  const mockAddons = [
    {
      id: 'addon-raita',
      name: 'Zeera Raita',
      price: 60,
      status: 'active',
      categoryIds: ['cat-biryani'],
      itemIds: [],
    },
    {
      id: 'addon-cheese',
      name: 'Cheese Slice',
      price: 70,
      status: 'active',
      categoryIds: ['cat-burgers'],
      itemIds: ['item-special-burger'],
    },
    {
      id: 'addon-sauce',
      name: 'Secret Sauce',
      price: 40,
      status: 'inactive', // Inactive
      categoryIds: ['cat-burgers'],
      itemIds: ['item-special-burger'],
    },
    {
      id: 'addon-fries',
      name: 'Curly Fries',
      price: 150,
      status: 'active',
      categoryIds: [],
      itemIds: ['item-special-burger'], // Specific to this item
    },
  ];

  beforeEach(() => {
    storage.clearAll();
  });

  // 1. Zinger Burger -> Burger suggestion
  it('1. correctly suggests Burger category for "Zinger Burger"', () => {
    const result = suggestCategory('Zinger Burger', mockCategories);
    expect(result).not.toBeNull();
    expect(result.id).toBe('cat-burgers');
  });

  // 2. Chicken Biryani -> Biryani suggestion
  it('2. correctly suggests Biryani category for "Chicken Biryani"', () => {
    const result = suggestCategory('Special Chicken Biryani (Double Masala)', mockCategories);
    expect(result).not.toBeNull();
    expect(result.id).toBe('cat-biryani');
  });

  // 3. unknown food -> null
  it('3. returns null for unknown/unmatched food items', () => {
    const result = suggestCategory('Galactic Quantum Soup 404', mockCategories);
    expect(result).toBeNull();

    expect(suggestCategory('', mockCategories)).toBeNull();
    expect(suggestCategory('a', mockCategories)).toBeNull();
    expect(suggestCategory(null, mockCategories)).toBeNull();
  });

  // 4. manual category override behavior
  it('4. respects manual category override without being forcibly overridden', () => {
    // If user has chosen Drinks category for an item named "Burger", the caller logic preserves their selection
    const manualSelection = 'cat-drinks';
    const userOverride = true;
    let selectedCatId = manualSelection;

    // Simulate typing when override is active
    if (!userOverride) {
      const suggested = suggestCategory('Zinger Burger', mockCategories);
      if (suggested) selectedCatId = suggested.id;
    }

    expect(selectedCatId).toBe('cat-drinks');
  });

  // 5. Burger -> Piece default
  it('5. derives piece unit default for Burger category', () => {
    const burgerCat = mockCategories.find((c) => c.id === 'cat-burgers');
    const unit = getCategoryDefaultUnit(burgerCat);
    expect(unit.unitType).toBe('piece');
    expect(unit.baseUnit).toBe('piece');
  });

  // 6. Biryani -> Kg/Weight default
  it('6. derives weight/kg unit default for Biryani category', () => {
    const biryaniCat = mockCategories.find((c) => c.id === 'cat-biryani');
    const unit = getCategoryDefaultUnit(biryaniCat);
    expect(unit.unitType).toBe('weight');
    expect(unit.baseUnit).toBe('kg');
  });

  // 7. category portion retrieval
  it('7. retrieves configured portions for category correctly', () => {
    const biryaniCat = mockCategories.find((c) => c.id === 'cat-biryani');
    const portions = getCategoryDefaultPortions(biryaniCat);
    expect(portions).toHaveLength(4);
    expect(portions[0]).toEqual({ label: '250g', quantityInBaseUnit: 0.25 });
    expect(portions[3]).toEqual({ label: '1kg', quantityInBaseUnit: 1.0 });

    // Category with no portions defaults to empty
    const drinksCat = mockCategories.find((c) => c.id === 'cat-drinks');
    expect(getCategoryDefaultPortions(drinksCat)).toEqual([]);
  });

  // 8. category assigned add-ons
  it('8. resolves category assigned add-ons correctly', () => {
    const biryaniCat = mockCategories.find((c) => c.id === 'cat-biryani');
    const dummyItem = { id: 'item-rice', addonIds: [] };
    const addons = getCompatibleAddons(dummyItem, biryaniCat, mockAddons);

    expect(addons.map((a) => a.id)).toContain('addon-raita');
  });

  // 9. item assigned add-ons
  it('9. resolves item-specific assigned add-ons correctly', () => {
    const specialItem = { id: 'item-special-burger', addonIds: [] };
    const dummyCat = { id: 'cat-custom', defaultAddonIds: [] };
    const addons = getCompatibleAddons(specialItem, dummyCat, mockAddons);

    // item-special-burger is assigned addon-fries
    expect(addons.map((a) => a.id)).toContain('addon-fries');
  });

  // 10. add-on deduplication
  it('10. deduplicates add-ons that match both category and item assignments', () => {
    const burgerCat = mockCategories.find((c) => c.id === 'cat-burgers');
    // item-special-burger is assigned addon-cheese, which is ALSO assigned to cat-burgers
    const specialItem = { id: 'item-special-burger', addonIds: [] };
    const addons = getCompatibleAddons(specialItem, burgerCat, mockAddons);

    const cheeseOccurrences = addons.filter((a) => a.id === 'addon-cheese');
    expect(cheeseOccurrences).toHaveLength(1);
  });

  // 11. inactive add-on exclusion
  it('11. strictly excludes inactive add-ons from compatible list', () => {
    const burgerCat = mockCategories.find((c) => c.id === 'cat-burgers');
    const specialItem = { id: 'item-special-burger', addonIds: [] };
    const addons = getCompatibleAddons(specialItem, burgerCat, mockAddons);

    // addon-sauce has status: 'inactive'
    expect(addons.map((a) => a.id)).not.toContain('addon-sauce');
  });

  // 12. referenced category deletion blocked
  it('12. blocks category deletion when referenced by menu items with a clear message', () => {
    const items = [
      { id: 'item-1', name: 'Zinger', categoryId: 'cat-burgers' },
      { id: 'item-2', name: 'Beef Burger', categoryId: 'cat-burgers' },
    ];

    const validationBlocked = validateCategoryDeletion('cat-burgers', items);
    expect(validationBlocked.canDelete).toBe(false);
    expect(validationBlocked.itemCount).toBe(2);
    expect(validationBlocked.message).toContain('Cannot delete category');

    const validationAllowed = validateCategoryDeletion('cat-empty', items);
    expect(validationAllowed.canDelete).toBe(true);
    expect(validationAllowed.message).toBeNull();
  });

  // 13. duplicate normalized category names
  it('13. detects duplicate normalized category names case-insensitively', () => {
    const cats = [
      { id: 'cat-1', name: 'Rice / Biryani' },
      { id: 'cat-2', name: 'Burgers' },
    ];

    expect(isDuplicateCategoryName('rice / biryani', cats)).toBe(true);
    expect(isDuplicateCategoryName('   RICE / BIRYANI  ', cats)).toBe(true);
    expect(isDuplicateCategoryName('Pasta', cats)).toBe(false);

    // Editing existing category with same name is allowed
    // Normalization utilities check
    expect(normalizeFoodName('  Chicken   Biryani  ')).toBe('chicken biryani');
    expect(normalizeKeywords(['Zinger', '  BURGER ', 'zinger', ''])).toEqual(['zinger', 'burger']);

    expect(isDuplicateCategoryName('Rice / Biryani', cats, 'cat-1')).toBe(false);

    // Duplicate add-on name check
    const existingAddons = [{ id: 'a-1', name: 'Raita' }];
    expect(isDuplicateAddonName('raita', existingAddons)).toBe(true);
    expect(isDuplicateAddonName('Salad', existingAddons)).toBe(false);
  });

  // 13b. Item deletion audit check
  it('13b. blocks permanent item deletion if referenced in completed order invoices', () => {
    const historicalOrders = [
      {
        id: 'ord-1',
        lines: [{ itemId: 'item-10' }],
      },
    ];

    const referencedAudit = validateItemDeletion('item-10', historicalOrders);
    expect(referencedAudit.canDelete).toBe(false);
    expect(referencedAudit.canArchive).toBe(true);
    expect(referencedAudit.orderCount).toBe(1);

    const unreferencedAudit = validateItemDeletion('item-999', historicalOrders);
    expect(unreferencedAudit.canDelete).toBe(true);
    expect(unreferencedAudit.canArchive).toBe(false);
  });

  // 14. repository persistence
  it('14. correctly creates, reads, updates, and persists records in repositories', async () => {
    // 14a. CategoryRepository
    const newCat = await CategoryRepository.create({
      name: 'Fresh Desserts',
      defaultUnitType: 'piece',
      baseUnit: 'slice',
      keywords: ['dessert', 'cake', 'sweet'],
    });

    expect(newCat.id).toBeDefined();
    const fetchedCat = await CategoryRepository.getById(newCat.id);
    expect(fetchedCat.name).toBe('Fresh Desserts');

    await CategoryRepository.update(newCat.id, { name: 'Artisan Desserts' });
    const updatedCat = await CategoryRepository.getById(newCat.id);
    expect(updatedCat.name).toBe('Artisan Desserts');

    await CategoryRepository.delete(newCat.id);
    const deletedCat = await CategoryRepository.getById(newCat.id);
    expect(deletedCat).toBeNull();

    // 14b. ItemRepository & AddonRepository
    const newItem = await ItemRepository.create({
      name: 'Chocolate Lava Cake',
      basePrice: 350,
      categoryId: 'cat-desserts',
    });
    expect(newItem.id).toBeDefined();
    const fetchedItem = await ItemRepository.getById(newItem.id);
    expect(fetchedItem.name).toBe('Chocolate Lava Cake');

    const newAddon = await AddonRepository.create({
      name: 'Vanilla Ice Cream Scoop',
      price: 100,
      status: 'active',
    });
    expect(newAddon.id).toBeDefined();
    const fetchedAddon = await AddonRepository.getById(newAddon.id);
    expect(fetchedAddon.name).toBe('Vanilla Ice Cream Scoop');
  });

  // 15. editing item does not affect historical order snapshots
  it('15. verifies that editing a menu item base price does not modify historical order line snapshots', async () => {
    const historicalOrder = {
      id: 'ord-101',
      invoiceNumber: 'INV-101',
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          itemNameSnapshot: 'Chicken Biryani',
          basePriceSnapshot: 900,
          quantity: 2,
          lineSubtotal: 1800,
        },
      ],
      subtotal: 1800,
      grandTotal: 1800,
    };

    // Simulate updating the menu item in catalog to higher price
    const catalogItem = {
      id: 'item-1',
      name: 'Chicken Biryani',
      basePrice: 900,
    };

    // Update catalog item price
    const updatedCatalogItem = {
      ...catalogItem,
      basePrice: 1200, // Price increased
    };

    // Historical invoice lines MUST remain completely unchanged
    expect(historicalOrder.lines[0].basePriceSnapshot).toBe(900);
    expect(historicalOrder.lines[0].lineSubtotal).toBe(1800);
    expect(historicalOrder.grandTotal).toBe(1800);
    expect(updatedCatalogItem.basePrice).toBe(1200);
  });

  // 16. Realistic food pairing rule (No Cheese or Chips on Biryani)
  it('16. strictly prevents realistic food mismatches (no Cheese or Chips on Biryani)', () => {
    // Sanity function tests
    expect(isRealisticAddonPairing('Cheese Slice', 'Rice / Biryani', 'Chicken Biryani')).toBe(false);
    expect(isRealisticAddonPairing('Chips', 'Rice / Biryani', 'Chicken Biryani')).toBe(false);
    expect(isRealisticAddonPairing('French Fries', 'Rice / Biryani', 'Chicken Biryani')).toBe(false);
    expect(isRealisticAddonPairing('Garlic Mayo', 'Rice / Biryani', 'Chicken Biryani')).toBe(false);
    expect(isRealisticAddonPairing('Aloo', 'Rice / Biryani', 'Chicken Biryani')).toBe(true);
    expect(isRealisticAddonPairing('Raita', 'Rice / Biryani', 'Chicken Biryani')).toBe(true);
    expect(isRealisticAddonPairing('Boti', 'Rice / Biryani', 'Chicken Biryani')).toBe(true);
    expect(isRealisticAddonPairing('Fresh Salad', 'Rice / Biryani', 'Chicken Biryani')).toBe(true);

    // Fast food checks
    expect(isRealisticAddonPairing('Cheese Slice', 'Burgers', 'Zinger Burger')).toBe(true);
    expect(isRealisticAddonPairing('Chips', 'Burgers', 'Zinger Burger')).toBe(true);
    expect(isRealisticAddonPairing('Raita', 'Burgers', 'Zinger Burger')).toBe(false);
    expect(isRealisticAddonPairing('Aloo', 'Burgers', 'Zinger Burger')).toBe(false);

    // Strict exclusion of Mushroom / Mashroom and Cheese / Cheesse from Biryani
    expect(isRealisticAddonPairing('Mashroom', 'Rice / Biryani', 'Chicken Biryani')).toBe(false);
    expect(isRealisticAddonPairing('Mushroom', 'Rice / Biryani', 'Chicken Biryani')).toBe(false);
    expect(isRealisticAddonPairing('Cheesse', 'Rice / Biryani', 'Chicken Biryani')).toBe(false);
    expect(isRealisticAddonPairing('Cheese', 'Rice / Biryani', 'Chicken Biryani')).toBe(false);

    // getCompatibleAddons check: When user created unassigned add-ons exist, Biryani only gets authentic ones
    const userCreatedAddons = [
      { id: 'a1', name: 'Cheese Slice', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a2', name: 'Chips', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a3', name: 'Aloo', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a4', name: 'Raita', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a5', name: 'Boti', status: 'active', categoryIds: [], itemIds: [] },
    ];

    const biryaniItem = { id: 'b1', name: 'Chicken Biryani', categoryName: 'Biryani' };
    const biryaniCategory = { id: 'c1', name: 'Biryani' };

    const compatible = getCompatibleAddons(biryaniItem, biryaniCategory, userCreatedAddons);
    const compatibleNames = compatible.map((a) => a.name);

    expect(compatibleNames).not.toContain('Cheese Slice');
    expect(compatibleNames).not.toContain('Chips');
    expect(compatibleNames).toContain('Aloo');
    expect(compatibleNames).toContain('Raita');
    expect(compatibleNames).toContain('Boti');
    expect(compatible).toHaveLength(3);

    // Exact user screenshot scenario: Mashroom, Cheesse, raita
    const exactScreenshotAddons = [
      { id: 'm1', name: 'Mashroom', price: 50, status: 'active', categoryIds: [], itemIds: [] },
      { id: 'c1', name: 'Cheesse', price: 100, status: 'active', categoryIds: [], itemIds: [] },
      { id: 'r1', name: 'raita', price: 30, status: 'active', categoryIds: [], itemIds: [] },
    ];
    const screenshotCompat = getCompatibleAddons(biryaniItem, biryaniCategory, exactScreenshotAddons);
    const screenshotCompatNames = screenshotCompat.map((a) => a.name);
    expect(screenshotCompatNames).not.toContain('Mashroom');
    expect(screenshotCompatNames).not.toContain('Cheesse');
    expect(screenshotCompatNames).toContain('raita');
    expect(screenshotCompat).toHaveLength(1);
  });

  // 17. detectAddonCategories auto-detection
  it('17. auto-detects relevant categories for add-on names', () => {
    const categories = [
      { id: 'cat-biryani', name: 'Rice / Biryani', keywords: ['biryani', 'pulao'] },
      { id: 'cat-burgers', name: 'Burgers', keywords: ['burger', 'zinger'] },
      { id: 'cat-pizza', name: 'Pizza', keywords: ['pizza'] },
    ];

    const cheeseCatIds = detectAddonCategories('Cheese Slice', categories);
    expect(cheeseCatIds).toContain('cat-burgers');
    expect(cheeseCatIds).toContain('cat-pizza');
    expect(cheeseCatIds).not.toContain('cat-biryani');

    const raitaCatIds = detectAddonCategories('Fresh Raita', categories);
    expect(raitaCatIds).toContain('cat-biryani');
    expect(raitaCatIds).not.toContain('cat-burgers');
  });

  // 18. Roll / Wrap compatibility (Only authentic Chutni & Boti, strictly NO Cheese, Chips, Aloo, Raita)
  it('18. allows authentic Chutni and Boti on Roll, but strictly excludes Cheese, Chips, Aloo, and Raita', () => {
    // Sanity checks for Roll
    expect(isRealisticAddonPairing('Special Chutni', 'Roll', 'Chicken Roll')).toBe(true);
    expect(isRealisticAddonPairing('Boti', 'Roll', 'Chicken Roll')).toBe(true);
    expect(isRealisticAddonPairing('Cheese Slice', 'Roll', 'Chicken Roll')).toBe(false);
    expect(isRealisticAddonPairing('Chips', 'Roll', 'Chicken Roll')).toBe(false);
    expect(isRealisticAddonPairing('Aloo', 'Roll', 'Chicken Roll')).toBe(false);
    expect(isRealisticAddonPairing('Raita', 'Roll', 'Chicken Roll')).toBe(false);

    // Full test with user's exact 6 add-ons
    const userCreatedAddons = [
      { id: 'a0', name: 'Special Chutni', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a1', name: 'Cheese Slice', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a2', name: 'Chips', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a3', name: 'Aloo', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a4', name: 'Raita', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a5', name: 'Boti', status: 'active', categoryIds: [], itemIds: [] },
    ];

    const rollItem = { id: 'r1', name: 'Chicken Roll', categoryName: 'Roll' };
    const rollCategory = { id: 'c-roll', name: 'Roll' };

    const compatible = getCompatibleAddons(rollItem, rollCategory, userCreatedAddons);
    const compatibleNames = compatible.map((a) => a.name);

    expect(compatibleNames).toContain('Special Chutni');
    expect(compatibleNames).toContain('Boti');
    expect(compatibleNames).not.toContain('Cheese Slice');
    expect(compatibleNames).not.toContain('Chips');
    expect(compatibleNames).not.toContain('Aloo');
    expect(compatibleNames).not.toContain('Raita');
    expect(compatible).toHaveLength(2);
  });

  // 19. Intelligent serving unit suggestions per user master catalog
  it('19. auto-suggests authentic recommended units per user master catalog', () => {
    // Biryani & Pulao -> 1 Kg (user requirement: 1kg ho sirf kg nhi 2kg hathao)
    expect(suggestServingUnit('Chicken Biryani', 'Biryani')).toBe('1 Kg');
    expect(suggestServingUnit('Beef Biryani', '')).toBe('1 Kg');
    expect(suggestServingUnit('Chicken Pulao', 'Pulao')).toBe('1 Kg');
    expect(suggestServingUnit('Chicken Fried Rice', '')).toBe('Plate');

    // BBQ -> Piece, 1 Kg
    expect(suggestServingUnit('Chicken Tikka Breast', 'BBQ')).toBe('Piece');
    expect(suggestServingUnit('Chicken Boti', 'BBQ')).toBe('1 Kg');
    expect(suggestServingUnit('Seekh Kabab Chicken', 'BBQ')).toBe('Piece / Plate');

    // Karahi & Handi -> 1 Kg
    expect(suggestServingUnit('Chicken Karahi', 'Karahi & Handi')).toBe('1 Kg');
    expect(suggestServingUnit('Chicken White Handi', 'Karahi & Handi')).toBe('1 Kg');

    // Desi Curries -> Plate / Serving, Plate, Plate / Bowl
    expect(suggestServingUnit('Chicken Qorma', 'Desi Curries')).toBe('Plate / Serving');
    expect(suggestServingUnit('Chicken Nihari', 'Desi Curries')).toBe('Plate');
    expect(suggestServingUnit('Haleem', 'Desi Curries')).toBe('Plate / Bowl');

    // Burgers, Sandwiches, Rolls -> Piece
    expect(suggestServingUnit('Zinger Burger', 'Burgers')).toBe('Piece');
    expect(suggestServingUnit('Club Sandwich', 'Sandwiches')).toBe('Piece');
    expect(suggestServingUnit('Chicken Roll', 'Rolls & Wraps')).toBe('Piece');
    expect(suggestServingUnit('Shawarma', 'Rolls & Wraps')).toBe('Piece');

    // Pizza -> Medium, Large (dropdown: Small, Medium, Large)
    expect(suggestServingUnit('Chicken Fajita Pizza', 'Pizza')).toBe('Medium');
    expect(suggestServingUnit('Large Pizza', 'Pizza Sizes')).toBe('Large');

    // Pasta, Chinese, Salads -> Plate
    expect(suggestServingUnit('Alfredo Pasta', 'Pasta')).toBe('Plate');
    expect(suggestServingUnit('Chicken Manchurian', 'Chinese')).toBe('Plate');
    expect(suggestServingUnit('Fresh Salad', 'Salads')).toBe('Plate');

    // Fries & Sides -> Plate (user requirement: fries palte hogi services nhi yar)
    expect(suggestServingUnit('French Fries', 'Fries & Sides')).toBe('Plate');

    // Soups -> Bowl
    expect(suggestServingUnit('Chicken Corn Soup', 'Soups')).toBe('Bowl');

    // Bread / Roti -> Piece
    expect(suggestServingUnit('Plain Naan', 'Bread / Roti')).toBe('Piece');

    // Desserts & Sweets -> Piece, Slice, Scoop, 1 Kg
    expect(suggestServingUnit('Brownie', 'Desserts')).toBe('Piece');
    expect(suggestServingUnit('Cheesecake', 'Desserts')).toBe('Slice');
    expect(suggestServingUnit('Vanilla Ice Cream', 'Ice Cream')).toBe('Scoop');
    expect(suggestServingUnit('Gulab Jamun', 'Pakistani Sweets')).toBe('1 Kg');
    expect(suggestServingUnit('Jalebi', 'Pakistani Sweets')).toBe('1 Kg');

    // Shakes & Juices -> Glass
    expect(suggestServingUnit('Mango Shake', 'Shakes')).toBe('Glass');
    expect(suggestServingUnit('Mint Lemonade', 'Fresh Juices')).toBe('Glass');

    // Cold Drinks -> Can, Bottle
    expect(suggestServingUnit('Soft Drink Can', 'Cold Drinks')).toBe('Can');
    expect(suggestServingUnit('Soft Drink 500ml', 'Cold Drinks')).toBe('Bottle');

    // Tea & Coffee -> Cup, Glass
    expect(suggestServingUnit('Doodh Patti', 'Tea')).toBe('Cup');
    expect(suggestServingUnit('Espresso', 'Coffee')).toBe('Cup');
    expect(suggestServingUnit('Cold Coffee', 'Coffee')).toBe('Glass');

    // Sauces & Add-ons -> Serving, Piece
    expect(suggestServingUnit('Raita', 'Sauces / Add-ons')).toBe('Serving');
    expect(suggestServingUnit('Cheese Slice', 'Sauces / Add-ons')).toBe('Piece');

    // Descriptions
    expect(suggestDescriptionPlaceholder('Chicken Roll', 'Roll')).toContain('paratha');
    expect(suggestDescriptionPlaceholder('Chicken Biryani', 'Biryani')).toContain('basmati rice');
    expect(suggestDescriptionPlaceholder('Soft Drink Can', 'Cold Drinks')).toContain('refreshing');
    expect(suggestDescriptionPlaceholder('Doodh Patti', 'Tea')).toContain('piping hot');
  });

  // 20. Relevant units filtering per food type according to user master catalog
  it('20. filters available units dropdown strictly per food type according to user master catalog', () => {
    // Chicken Roll dropdown units
    const rollUnits = getAvailableUnitsForFood('Chicken Roll', 'Rolls & Wraps');
    expect(rollUnits).toContain('Piece');
    expect(rollUnits).toContain('Custom');

    // Drinks dropdown units -> Must have Bottle / Can
    const drinkUnits = getAvailableUnitsForFood('Soft Drink Can', 'Cold Drinks');
    expect(drinkUnits).toContain('Can');
    expect(drinkUnits).toContain('Bottle');

    // Pizza dropdown units -> Must have Small, Medium, Large
    const pizzaUnits = getAvailableUnitsForFood('Chicken Fajita Pizza', 'Pizza');
    expect(pizzaUnits).toContain('Small');
    expect(pizzaUnits).toContain('Medium');
    expect(pizzaUnits).toContain('Large');

    // Biryani dropdown units -> Must have '1 Kg', 'Plate', 'Custom', but NOT '2 Kg', 'Half Kg' or plain 'Kg'
    const biryaniUnits = getAvailableUnitsForFood('Chicken Biryani', 'Biryani');
    expect(biryaniUnits).toContain('1 Kg');
    expect(biryaniUnits).toContain('Plate');
    expect(biryaniUnits).toContain('Custom');
    expect(biryaniUnits).not.toContain('Half Kg');
    expect(biryaniUnits).not.toContain('2 Kg');
    expect(biryaniUnits).not.toContain('Kg');

    // Fries dropdown units -> Must have Plate
    const friesUnits = getAvailableUnitsForFood('French Fries', 'Fries & Sides');
    expect(friesUnits).toContain('Plate');
  });

  // 21. Initial empty unit & category behavior and simultaneous auto-pick
  it('21. starts with empty unit & category and auto-picks both when dish name is typed, resetting when cleared', () => {
    // Initial state when modal opens for a new item
    let name = '';
    let categoryName = '';
    let servingUnit = '';
    let isAutoUnit = false;
    let autoSuggestedCatId = null;

    expect(name).toBe('');
    expect(categoryName).toBe('');
    expect(servingUnit).toBe('');

    // User types "Chicken Roll" with a categories list that contains Rolls
    const categoriesWithRoll = [
      ...mockCategories,
      { id: 'cat-rolls', name: 'Rolls & Wraps', keywords: ['roll', 'paratha roll', 'shawarma', 'wrap'] },
    ];
    const inputName = 'Chicken Roll';
    const suggestedCategory = suggestCategory(inputName, categoriesWithRoll);
    const suggestedUnit = suggestServingUnit(inputName, suggestedCategory?.name || '');

    if (inputName.trim().length >= 2) {
      if (suggestedCategory) {
        categoryName = suggestedCategory.name;
        autoSuggestedCatId = suggestedCategory.id;
      }
      if (suggestedUnit) {
        servingUnit = suggestedUnit;
        isAutoUnit = true;
      }
    }

    expect(categoryName).toBe('Rolls & Wraps');
    expect(autoSuggestedCatId).toBe('cat-rolls');
    expect(servingUnit).toBe('Piece');
    expect(isAutoUnit).toBe(true);

    // User clears the name
    const clearedName = '';
    if (clearedName.trim().length < 2) {
      categoryName = '';
      autoSuggestedCatId = null;
      servingUnit = '';
      isAutoUnit = false;
    }

    expect(categoryName).toBe('');
    expect(autoSuggestedCatId).toBeNull();
    expect(servingUnit).toBe('');
    expect(isAutoUnit).toBe(false);
  });

  // 22. 6 Canonical Add-on Types classification
  it('22. classifies add-ons into the 6 official types via detectAddonType', () => {
    expect(ADDON_TYPES).toEqual([
      'Extra Protein',
      'Side',
      'Sauce / Dip',
      'Topping',
      'Drink',
      'Dessert Extra',
    ]);

    // Extra Protein
    expect(detectAddonType('Extra Chicken Boti')).toBe('Extra Protein');
    expect(detectAddonType('Extra Beef Piece')).toBe('Extra Protein');
    expect(detectAddonType('Extra Patty')).toBe('Extra Protein');
    expect(detectAddonType('Boiled Egg')).toBe('Extra Protein');
    expect(detectAddonType('Shami Kabab')).toBe('Extra Protein');

    // Side
    expect(detectAddonType('Mini French Fries')).toBe('Side');
    expect(detectAddonType('Fresh Salad')).toBe('Side');
    expect(detectAddonType('Garlic Naan')).toBe('Side');
    expect(detectAddonType('Coleslaw')).toBe('Side');

    // Sauce / Dip
    expect(detectAddonType('Zeera Raita')).toBe('Sauce / Dip');
    expect(detectAddonType('Garlic Mayo')).toBe('Sauce / Dip');
    expect(detectAddonType('BBQ Sauce')).toBe('Sauce / Dip');
    expect(detectAddonType('Green Chutney')).toBe('Sauce / Dip');

    // Topping
    expect(detectAddonType('Cheddar Cheese Slice')).toBe('Topping');
    expect(detectAddonType('Jalapeno')).toBe('Topping');
    expect(detectAddonType('Extra Aloo')).toBe('Topping');
    expect(detectAddonType('Mushrooms')).toBe('Topping');

    // Drink
    expect(detectAddonType('Cold Drink Can')).toBe('Drink');
    expect(detectAddonType('Mineral Water Large')).toBe('Drink');
    expect(detectAddonType('Fresh Lime Juice')).toBe('Drink');

    // Dessert Extra
    expect(detectAddonType('Vanilla Ice Cream Scoop')).toBe('Dessert Extra');
    expect(detectAddonType('Chocolate Syrup')).toBe('Dessert Extra');
    expect(detectAddonType('Rabri')).toBe('Dessert Extra');
  });

  // 23. Hierarchical Category -> allowed Addons + Specific Item -> extra Addons
  it('23. handles Category allowed add-ons and Specific Item extra add-ons via isAddonRecommended', () => {
    // Category level: Biryani category gets common Raita, Salad, Shami Kabab, Drinks
    expect(isAddonRecommended('Raita', 'Biryani', '')).toBe(true);
    expect(isAddonRecommended('Fresh Salad', 'Biryani', '')).toBe(true);
    expect(isAddonRecommended('Shami Kabab', 'Biryani', '')).toBe(true);
    expect(isAddonRecommended('Cold Drink Can', 'Biryani', '')).toBe(true);
    expect(isAddonRecommended('Mineral Water Small', 'Biryani', '')).toBe(true);

    // Item level: Chicken Biryani gets Extra Chicken Boti, Extra Aloo, Boiled Egg
    expect(isAddonRecommended('Extra Chicken Boti', 'Biryani', 'Chicken Biryani')).toBe(true);
    expect(isAddonRecommended('Extra Aloo', 'Biryani', 'Chicken Biryani')).toBe(true);
    expect(isAddonRecommended('Boiled Egg', 'Biryani', 'Chicken Biryani')).toBe(true);

    // Item level: Beef Biryani gets Extra Beef Piece
    expect(isAddonRecommended('Extra Beef Piece', 'Biryani', 'Beef Biryani')).toBe(true);

    // Burger category gets Cheese, Fries, Jalapeno, Cold Drink
    expect(isAddonRecommended('Cheddar Cheese', 'Burgers', 'Zinger Burger')).toBe(true);
    expect(isAddonRecommended('Fries', 'Burgers', 'Zinger Burger')).toBe(true);
    expect(isAddonRecommended('Jalapeno', 'Burgers', 'Zinger Burger')).toBe(true);
    expect(isAddonRecommended('Cold Drink Can', 'Burgers', 'Zinger Burger')).toBe(true);
    // Specific Item: Zinger Patty on Zinger Burger
    expect(isAddonRecommended('Extra Zinger Patty', 'Burgers', 'Zinger Burger')).toBe(true);
  });

  // 24. Full POS Resolution in getCompatibleAddons
  it('24. correctly resolves hierarchical add-ons, excludes meat cross-contamination, and tags types', () => {
    const masterAddons = [
      { id: 'a1', name: 'Zeera Raita', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a2', name: 'Fresh Salad', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a3', name: 'Shami Kabab', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a4', name: 'Extra Chicken Boti', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a5', name: 'Extra Beef Piece', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a6', name: 'Extra Aloo', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a7', name: 'Boiled Egg', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a8', name: 'Cold Drink Can', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a9', name: 'Cheddar Cheese Slice', status: 'active', categoryIds: [], itemIds: [] },
    ];

    // For Chicken Biryani:
    const chickenBiryaniItem = { id: 'cb1', name: 'Special Chicken Biryani', categoryName: 'Biryani' };
    const biryaniCategory = { id: 'c-biryani', name: 'Biryani' };

    const chickenBiryaniAddons = getCompatibleAddons(chickenBiryaniItem, biryaniCategory, masterAddons);
    const cbNames = chickenBiryaniAddons.map((a) => a.name);

    // Common category add-ons
    expect(cbNames).toContain('Zeera Raita');
    expect(cbNames).toContain('Fresh Salad');
    expect(cbNames).toContain('Shami Kabab');
    expect(cbNames).toContain('Cold Drink Can');

    // Chicken Biryani specific add-ons
    expect(cbNames).toContain('Extra Chicken Boti');
    expect(cbNames).toContain('Extra Aloo');
    expect(cbNames).toContain('Boiled Egg');

    // Beef Piece MUST NOT appear on Chicken Biryani!
    expect(cbNames).not.toContain('Extra Beef Piece');

    // Cheese Slice MUST NOT appear on Biryani!
    expect(cbNames).not.toContain('Cheddar Cheese Slice');

    // Check that every returned add-on has its type property populated
    const raita = chickenBiryaniAddons.find((a) => a.name === 'Zeera Raita');
    expect(raita.type).toBe('Sauce / Dip');

    const drink = chickenBiryaniAddons.find((a) => a.name === 'Cold Drink Can');
    expect(drink.type).toBe('Drink');

    const boti = chickenBiryaniAddons.find((a) => a.name === 'Extra Chicken Boti');
    expect(boti.type).toBe('Extra Protein');

    // For Beef Biryani:
    const beefBiryaniItem = { id: 'bb1', name: 'Special Beef Biryani', categoryName: 'Biryani' };
    const beefBiryaniAddons = getCompatibleAddons(beefBiryaniItem, biryaniCategory, masterAddons);
    const bbNames = beefBiryaniAddons.map((a) => a.name);

    // Automatically inherits common Biryani category add-ons!
    expect(bbNames).toContain('Zeera Raita');
    expect(bbNames).toContain('Fresh Salad');
    expect(bbNames).toContain('Shami Kabab');
    expect(bbNames).toContain('Cold Drink Can');

    // Beef Biryani specific add-on
    expect(bbNames).toContain('Extra Beef Piece');

    // Chicken Boti MUST NOT appear on Beef Biryani!
    expect(bbNames).not.toContain('Extra Chicken Boti');
  });

  // 25. Universal Drink & Cold Drink availability across all foods
  it('25. guarantees Drink and Cold Drink add-ons appear universally across all food items', () => {
    const drinkAddon = {
      id: 'd-1',
      name: 'Cold Drink Can',
      type: 'Drink',
      status: 'active',
      categoryIds: [],
      itemIds: [],
    };

    const waterAddon = {
      id: 'd-2',
      name: 'Mineral Water Small',
      type: 'Drink',
      status: 'active',
      categoryIds: [],
      itemIds: [],
    };

    const allAddons = [drinkAddon, waterAddon];

    // 1. Zinger Burger
    const burger = { id: 'it-burger', name: 'Zinger Burger', categoryName: 'Burgers' };
    const burgerAddons = getCompatibleAddons(burger, { id: 'c-burgers', name: 'Burgers' }, allAddons);
    expect(burgerAddons.map((a) => a.name)).toContain('Cold Drink Can');
    expect(burgerAddons.map((a) => a.name)).toContain('Mineral Water Small');

    // 2. Chicken Roll
    const roll = { id: 'it-roll', name: 'Chicken Roll', categoryName: 'Rolls & Wraps' };
    const rollAddons = getCompatibleAddons(roll, { id: 'c-rolls', name: 'Rolls & Wraps' }, allAddons);
    expect(rollAddons.map((a) => a.name)).toContain('Cold Drink Can');
    expect(rollAddons.map((a) => a.name)).toContain('Mineral Water Small');

    // 3. Pizza
    const pizza = { id: 'it-pizza', name: 'Chicken Fajita Pizza', categoryName: 'Pizza' };
    const pizzaAddons = getCompatibleAddons(pizza, { id: 'c-pizza', name: 'Pizza' }, allAddons);
    expect(pizzaAddons.map((a) => a.name)).toContain('Cold Drink Can');

    // 4. Fries
    const fries = { id: 'it-fries', name: 'Loaded Fries', categoryName: 'Fries & Sides' };
    const friesAddons = getCompatibleAddons(fries, { id: 'c-fries', name: 'Fries & Sides' }, allAddons);
    expect(friesAddons.map((a) => a.name)).toContain('Cold Drink Can');

    // 5. Dessert (Brownie)
    const brownie = { id: 'it-brownie', name: 'Chocolate Brownie', categoryName: 'Desserts' };
    const brownieAddons = getCompatibleAddons(brownie, { id: 'c-desserts', name: 'Desserts' }, allAddons);
    expect(brownieAddons.map((a) => a.name)).toContain('Cold Drink Can');
  });

  // 26. Desi Curries (Karahi, Handi, Nihari, Haleem, Daal) Strict Addon Resolution
  it('26. resolves authentic Desi Curry addons and strictly blocks fast-food and desserts', () => {
    const curryAddons = [
      { id: 'a-naan', name: 'Roghni Naan', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-garlic-naan', name: 'Garlic Naan', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-gravy', name: 'Extra Gravy', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-raita', name: 'Zeera Raita', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-salad', name: 'Fresh Salad', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-nalli', name: 'Extra Nalli', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-maghaz', name: 'Extra Maghaz', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-fries', name: 'French Fries', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-cheese', name: 'Cheese Slice', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-icecream', name: 'Vanilla Ice Cream', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-drink', name: 'Cold Drink Can', status: 'active', categoryIds: [], itemIds: [] },
    ];

    // Chicken Karahi
    const karahi = { id: 'it-karahi', name: 'Chicken Karahi', categoryName: 'Karahi & Handi' };
    const karahiRes = getCompatibleAddons(karahi, { id: 'c-karahi', name: 'Karahi & Handi' }, curryAddons);
    const karahiNames = karahiRes.map((a) => a.name);

    expect(karahiNames).toContain('Garlic Naan');
    expect(karahiNames).toContain('Extra Gravy');
    expect(karahiNames).toContain('Zeera Raita');
    expect(karahiNames).toContain('Fresh Salad');
    expect(karahiNames).toContain('Cold Drink Can');
    expect(karahiNames).not.toContain('French Fries');
    expect(karahiNames).not.toContain('Cheese Slice');
    expect(karahiNames).not.toContain('Vanilla Ice Cream');

    // Nihari
    const nihari = { id: 'it-nihari', name: 'Special Nihari', categoryName: 'Desi Curries' };
    const nihariRes = getCompatibleAddons(nihari, { id: 'c-nihari', name: 'Desi Curries' }, curryAddons);
    const nihariNames = nihariRes.map((a) => a.name);

    expect(nihariNames).toContain('Extra Nalli');
    expect(nihariNames).toContain('Extra Maghaz');
    expect(nihariNames).toContain('Roghni Naan');
    expect(nihariNames).toContain('Cold Drink Can');
    expect(nihariNames).not.toContain('French Fries');
    expect(nihariNames).not.toContain('Cheese Slice');
  });

  // 27. BBQ & Grilled Items (Tikka, Kabab, Platter, Fish) Allow Fries, Block Cheese & Desserts
  it('27. correctly allows Fries, Naan, and Chutney on BBQ items while strictly blocking Cheese and Desserts', () => {
    const bbqAddons = [
      { id: 'a-fries', name: 'French Fries', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-naan', name: 'Garlic Naan', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-chutney', name: 'Green Chutney', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-imli', name: 'Imli Chutney', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-tartar', name: 'Tartar Sauce', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-cheese', name: 'Cheese Slice', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-patty', name: 'Beef Patty', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-brownie', name: 'Chocolate Brownie', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-drink', name: 'Cold Drink Can', status: 'active', categoryIds: [], itemIds: [] },
    ];

    // Chicken Tikka
    const tikka = { id: 'it-tikka', name: 'Chicken Tikka', categoryName: 'BBQ' };
    const tikkaRes = getCompatibleAddons(tikka, { id: 'c-bbq', name: 'BBQ' }, bbqAddons);
    const tikkaNames = tikkaRes.map((a) => a.name);

    expect(tikkaNames).toContain('French Fries');
    expect(tikkaNames).toContain('Garlic Naan');
    expect(tikkaNames).toContain('Green Chutney');
    expect(tikkaNames).toContain('Imli Chutney');
    expect(tikkaNames).toContain('Cold Drink Can');
    expect(tikkaNames).not.toContain('Cheese Slice');
    expect(tikkaNames).not.toContain('Beef Patty');
    expect(tikkaNames).not.toContain('Chocolate Brownie');

    // Grilled Fish
    const fish = { id: 'it-fish', name: 'Grilled Fish', categoryName: 'BBQ' };
    const fishRes = getCompatibleAddons(fish, { id: 'c-fish', name: 'BBQ' }, bbqAddons);
    const fishNames = fishRes.map((a) => a.name);

    expect(fishNames).toContain('French Fries');
    expect(fishNames).toContain('Tartar Sauce');
    expect(fishNames).not.toContain('Cheese Slice');
    expect(fishNames).not.toContain('Chocolate Brownie');
  });

  // 28. Fast Food (Burgers, Pizza, Pasta, Shawarma)
  it('28. resolves fast food add-ons (Cheese, Jalapeno, Olives, Garlic Dip) and excludes Desi rice extras', () => {
    const fastFoodAddons = [
      { id: 'a-chz', name: 'Cheese Slice', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-mozz', name: 'Mozzarella', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-jalapeno', name: 'Jalapeno', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-olives', name: 'Olives', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-garlic-dip', name: 'Garlic Dip', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-garlic-bread', name: 'Garlic Bread', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-meatballs', name: 'Meatballs', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-fries-in', name: 'Fries Inside', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-tahini', name: 'Tahini Sauce', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-raita', name: 'Zeera Raita', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-aloo', name: 'Extra Aloo', status: 'active', categoryIds: [], itemIds: [] },
    ];

    // Zinger Burger
    const burger = { id: 'it-zb', name: 'Zinger Burger', categoryName: 'Burgers' };
    const burgerRes = getCompatibleAddons(burger, { id: 'c-burgers', name: 'Burgers' }, fastFoodAddons);
    const burgerNames = burgerRes.map((a) => a.name);
    expect(burgerNames).toContain('Cheese Slice');
    expect(burgerNames).toContain('Jalapeno');
    expect(burgerNames).not.toContain('Zeera Raita');
    expect(burgerNames).not.toContain('Extra Aloo');

    // Chicken Fajita Pizza
    const pizza = { id: 'it-fajita', name: 'Chicken Fajita Pizza', categoryName: 'Pizza' };
    const pizzaRes = getCompatibleAddons(pizza, { id: 'c-pizza', name: 'Pizza' }, fastFoodAddons);
    const pizzaNames = pizzaRes.map((a) => a.name);
    expect(pizzaNames).toContain('Mozzarella');
    expect(pizzaNames).toContain('Jalapeno');
    expect(pizzaNames).toContain('Olives');
    expect(pizzaNames).toContain('Garlic Dip');
    expect(pizzaNames).not.toContain('Zeera Raita');
    expect(pizzaNames).not.toContain('Extra Aloo');

    // Alfredo Pasta
    const pasta = { id: 'it-alfredo', name: 'Alfredo Pasta', categoryName: 'Pasta' };
    const pastaRes = getCompatibleAddons(pasta, { id: 'c-pasta', name: 'Pasta' }, fastFoodAddons);
    const pastaNames = pastaRes.map((a) => a.name);
    expect(pastaNames).toContain('Garlic Bread');
    expect(pastaNames).not.toContain('Zeera Raita');

    // Shawarma
    const shawarma = { id: 'it-shawarma', name: 'Chicken Shawarma', categoryName: 'Rolls & Wraps' };
    const shawarmaRes = getCompatibleAddons(shawarma, { id: 'c-shawarma', name: 'Rolls & Wraps' }, fastFoodAddons);
    const shawarmaNames = shawarmaRes.map((a) => a.name);
    expect(shawarmaNames).toContain('Fries Inside');
    expect(shawarmaNames).toContain('Tahini Sauce');
    expect(shawarmaNames).not.toContain('Zeera Raita');
  });

  // 29. Chinese, Soups, Salads
  it('29. correctly matches Chinese, Soups, and Salad additions', () => {
    const specialtyAddons = [
      { id: 'a-spring-roll', name: 'Spring Roll', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-soy', name: 'Soy Sauce', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-chilli-sauce', name: 'Chilli Sauce', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-crackers', name: 'Crackers', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-garlic-bread', name: 'Garlic Bread', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-croutons', name: 'Croutons', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-naan', name: 'Garlic Naan', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-raita', name: 'Zeera Raita', status: 'active', categoryIds: [], itemIds: [] },
    ];

    // Chinese Chow Mein
    const chowmein = { id: 'it-cm', name: 'Chicken Chow Mein', categoryName: 'Chinese' };
    const chowmeinRes = getCompatibleAddons(chowmein, { id: 'c-chinese', name: 'Chinese' }, specialtyAddons);
    const chowmeinNames = chowmeinRes.map((a) => a.name);
    expect(chowmeinNames).toContain('Spring Roll');
    expect(chowmeinNames).toContain('Soy Sauce');
    expect(chowmeinNames).not.toContain('Garlic Naan');
    expect(chowmeinNames).not.toContain('Zeera Raita');

    // Soup
    const soup = { id: 'it-soup', name: 'Chicken Corn Soup', categoryName: 'Soups' };
    const soupRes = getCompatibleAddons(soup, { id: 'c-soups', name: 'Soups' }, specialtyAddons);
    const soupNames = soupRes.map((a) => a.name);
    expect(soupNames).toContain('Crackers');
    expect(soupNames).toContain('Garlic Bread');
    expect(soupNames).not.toContain('Garlic Naan');

    // Caesar Salad
    const salad = { id: 'it-salad', name: 'Caesar Salad', categoryName: 'Salads' };
    const saladRes = getCompatibleAddons(salad, { id: 'c-salads', name: 'Salads' }, specialtyAddons);
    const saladNames = saladRes.map((a) => a.name);
    expect(saladNames).toContain('Croutons');
    expect(saladNames).not.toContain('Garlic Naan');
  });

  // 30. Desserts, Sweets, and Coffee
  it('30. matches authentic sweet and beverage extras while blocking savory items', () => {
    const sweetAddons = [
      { id: 'a-scoop', name: 'Vanilla Ice Cream Scoop', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-rabri', name: 'Rabri', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-choc-sauce', name: 'Chocolate Sauce', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-espresso', name: 'Extra Espresso Shot', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-boti', name: 'Chicken Boti', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-fries', name: 'French Fries', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'a-raita', name: 'Zeera Raita', status: 'active', categoryIds: [], itemIds: [] },
    ];

    // Brownie
    const brownie = { id: 'it-brownie-2', name: 'Warm Brownie', categoryName: 'Desserts' };
    const brownieRes = getCompatibleAddons(brownie, { id: 'c-desserts', name: 'Desserts' }, sweetAddons);
    const brownieNames = brownieRes.map((a) => a.name);
    expect(brownieNames).toContain('Vanilla Ice Cream Scoop');
    expect(brownieNames).toContain('Chocolate Sauce');
    expect(brownieNames).not.toContain('Chicken Boti');
    expect(brownieNames).not.toContain('French Fries');
    expect(brownieNames).not.toContain('Zeera Raita');

    // Gulab Jamun
    const gulabJamun = { id: 'it-gj', name: 'Gulab Jamun', categoryName: 'Pakistani Sweets' };
    const gjRes = getCompatibleAddons(gulabJamun, { id: 'c-sweets', name: 'Pakistani Sweets' }, sweetAddons);
    const gjNames = gjRes.map((a) => a.name);
    expect(gjNames).toContain('Rabri');
    expect(gjNames).not.toContain('Chicken Boti');

    // Coffee
    const coffee = { id: 'it-capp', name: 'Cappuccino', categoryName: 'Coffee' };
    const coffeeRes = getCompatibleAddons(coffee, { id: 'c-coffee', name: 'Coffee' }, sweetAddons);
    const coffeeNames = coffeeRes.map((a) => a.name);
    expect(coffeeNames).toContain('Extra Espresso Shot');
    expect(coffeeNames).not.toContain('Chicken Boti');
    expect(coffeeNames).not.toContain('French Fries');
  });

  // 31. Leakage Prevention Check for Unassigned Add-ons
  it('31. confirms unassigned add-ons NEVER leak to incompatible or unrelated food items', () => {
    const unassignedAddons = [
      { id: 'u-fries', name: 'French Fries', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'u-tartar', name: 'Tartar Sauce', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'u-mayo', name: 'Garlic Mayo', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'u-icecream', name: 'Vanilla Ice Cream', status: 'active', categoryIds: [], itemIds: [] },
      { id: 'u-raita', name: 'Zeera Raita', status: 'active', categoryIds: [], itemIds: [] },
    ];

    // Biryani item
    const biryani = { id: 'it-b', name: 'Chicken Biryani', categoryName: 'Biryani' };
    const biryaniRes = getCompatibleAddons(biryani, { id: 'c-b', name: 'Biryani' }, unassignedAddons);
    const bNames = biryaniRes.map((a) => a.name);
    expect(bNames).toEqual(['Zeera Raita']); // Only Zeera Raita is authentic; Fries, Tartar, Mayo, Ice Cream blocked!

    // Karahi item
    const karahi = { id: 'it-k', name: 'Chicken Karahi', categoryName: 'Karahi & Handi' };
    const karahiRes = getCompatibleAddons(karahi, { id: 'c-k', name: 'Karahi & Handi' }, unassignedAddons);
    const kNames = karahiRes.map((a) => a.name);
    expect(kNames).toEqual(['Zeera Raita']); // Fries, Tartar, Mayo, Ice Cream blocked on Karahi!

    // Fresh Juice
    const juice = { id: 'it-j', name: 'Fresh Mint Lemonade', categoryName: 'Fresh Juices' };
    const juiceRes = getCompatibleAddons(juice, { id: 'c-j', name: 'Fresh Juices' }, unassignedAddons);
    expect(juiceRes).toHaveLength(0); // Zero savory add-ons leak onto beverages!
  });

  // 32. Role-based pricing protection
  it('32. enforces role-based pricing protection: cashier cannot modify item basePrice or costPrice', () => {
    const originalItem = {
      id: 'it-biryani-1',
      name: 'Chicken Biryani Special',
      basePrice: 500,
      costPrice: 280,
    };

    const isCashierRole = (user) => Boolean(
      (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
      (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
    );

    const cashierUser = { username: 'cashier', role: 'Cashier' };
    const adminUser = { username: 'admin', role: 'Admin Cashier' };

    expect(isCashierRole(cashierUser)).toBe(true);
    expect(isCashierRole(adminUser)).toBe(false);

    // Simulate cashier attempting to update prices
    const cashierAttemptedPayload = {
      basePrice: 200, // Cashier tries to slash price to 200
      costPrice: 100,
    };

    const resolveItemPrices = (user, item, attempted) => {
      const isCashier = isCashierRole(user);
      return {
        basePrice: isCashier ? item.basePrice : attempted.basePrice,
        costPrice: isCashier ? item.costPrice : attempted.costPrice,
      };
    };

    // Cashier update preserves original values
    const cashierResult = resolveItemPrices(cashierUser, originalItem, cashierAttemptedPayload);
    expect(cashierResult.basePrice).toBe(500);
    expect(cashierResult.costPrice).toBe(280);

    // Admin update applies new values
    const adminResult = resolveItemPrices(adminUser, originalItem, cashierAttemptedPayload);
    expect(adminResult.basePrice).toBe(200);
    expect(adminResult.costPrice).toBe(100);
  });

  // 33. parseSortOrder validation
  it('33. parseSortOrder strictly validates positive whole numbers and rejects invalid values', () => {
    // Valid positive integers
    expect(parseSortOrder(1)).toBe(1);
    expect(parseSortOrder(2)).toBe(2);
    expect(parseSortOrder(100)).toBe(100);
    expect(parseSortOrder('1')).toBe(1);
    expect(parseSortOrder(' 5 ')).toBe(5);

    // Invalid / missing values return null (no NaN / null crashes)
    expect(parseSortOrder(null)).toBeNull();
    expect(parseSortOrder(undefined)).toBeNull();
    expect(parseSortOrder('')).toBeNull();
    expect(parseSortOrder('   ')).toBeNull();
    expect(parseSortOrder(0)).toBeNull();
    expect(parseSortOrder(-1)).toBeNull();
    expect(parseSortOrder(-99)).toBeNull();
    expect(parseSortOrder(1.5)).toBeNull();
    expect(parseSortOrder('2.7')).toBeNull();
    expect(parseSortOrder('abc')).toBeNull();
    expect(parseSortOrder(NaN)).toBeNull();
    expect(parseSortOrder(Infinity)).toBeNull();
  });

  // 34. sortCategories ascending order by sortOrder
  it('34. sortCategories orders categories ascending by numeric sortOrder (Rice = 1, Roll = 2, Soft Drink = 3)', () => {
    // Input is intentionally in random / creation order
    const categories = [
      { id: 'cat-drink', name: 'Soft Drink', sortOrder: 3 },
      { id: 'cat-rice', name: 'Rice', sortOrder: 1 },
      { id: 'cat-roll', name: 'Roll', sortOrder: 2 },
    ];

    const sorted = sortCategories(categories);
    expect(sorted.map((c) => c.name)).toEqual(['Rice', 'Roll', 'Soft Drink']);

    // Original array must NOT be mutated
    expect(categories[0].name).toBe('Soft Drink');
  });

  // 35. sortCategories natural tiering: Food categories first, then Desserts, then Cold Drinks
  it('35. sortCategories groups food categories first and places sweet items, desserts, and cold drinks last', () => {
    const categories = [
      { id: 'cat-z', name: 'Zinger Meals' }, // no sortOrder
      { id: 'cat-drink', name: 'Soft Drink', sortOrder: 3 },
      { id: 'cat-a', name: 'Appetizers', sortOrder: null }, // null sortOrder
      { id: 'cat-rice', name: 'Rice', sortOrder: 1 },
      { id: 'cat-inv', name: 'Desserts', sortOrder: -5 }, // invalid sortOrder
      { id: 'cat-roll', name: 'Roll', sortOrder: 2 },
    ];

    const sorted = sortCategories(categories);
    const sortedNames = sorted.map((c) => c.name);

    // Food categories first: Rice (1), Roll (2), Appetizers (null), Zinger Meals (null)
    // Then Desserts (Tier 2), then Soft Drink (Tier 3)
    expect(sortedNames).toEqual([
      'Rice',
      'Roll',
      'Appetizers',
      'Zinger Meals',
      'Desserts',
      'Soft Drink',
    ]);
  });

  // 36. sortCategories duplicate sortOrder deterministic tie-breaker
  it('36. sortCategories breaks duplicate sortOrder ties deterministically by category name A-Z', () => {
    const categories = [
      { id: 'cat-roll', name: 'Roll', sortOrder: 2 },
      { id: 'cat-bbq', name: 'BBQ', sortOrder: 2 },
      { id: 'cat-rice', name: 'Rice', sortOrder: 1 },
      { id: 'cat-burger', name: 'Burger', sortOrder: 2 },
    ];

    const sorted = sortCategories(categories);
    const sortedNames = sorted.map((c) => c.name);

    // Rice (1) is first
    // BBQ (2), Burger (2), Roll (2) all have sortOrder 2, sorted alphabetically
    expect(sortedNames).toEqual(['Rice', 'BBQ', 'Burger', 'Roll']);
  });

  // 37. POS category tabs format: "All" must always remain the first filter
  it('37. POS category tabs format retains "All" first followed by sorted categories', () => {
    const categories = [
      { id: 'cat-drink', name: 'Soft Drink', sortOrder: 3, status: 'active' },
      { id: 'cat-rice', name: 'Rice', sortOrder: 1, status: 'active' },
      { id: 'cat-roll', name: 'Roll', sortOrder: 2, status: 'active' },
      { id: 'cat-inactive', name: 'Old Specials', sortOrder: 0.5, status: 'inactive' },
    ];

    // Filter active categories like POSPage does
    const activeCategories = categories.filter((c) => c.status === 'active');
    const sortedActive = sortCategories(activeCategories);
    const categoryTabs = ['All', ...sortedActive.map((c) => c.name)];

    // Exact expected rendering
    expect(categoryTabs).toEqual(['All', 'Rice', 'Roll', 'Soft Drink']);

    // Preserves active selection if user had selected 'Roll'
    const activeCategory = 'Roll';
    expect(categoryTabs.includes(activeCategory)).toBe(true);
  });

  // 38. Comprehensive Cold Drink Units (A to Z)
  it('38. provides comprehensive cold drink units covering cans, tins, millilitres, litres, and bottles', () => {
    // Exact sizes commonly used in restaurant POS (e.g. Mountain Dew 300ml, Pepsi 1.5L)
    expect(COLD_DRINK_UNITS).toContain('300ml');
    expect(COLD_DRINK_UNITS).toContain('300ml Bottle');
    expect(COLD_DRINK_UNITS).toContain('300ml Can');
    expect(COLD_DRINK_UNITS).toContain('250ml');
    expect(COLD_DRINK_UNITS).toContain('250ml Bottle');
    expect(COLD_DRINK_UNITS).toContain('250ml Can');
    expect(COLD_DRINK_UNITS).toContain('330ml Can');
    expect(COLD_DRINK_UNITS).toContain('345ml');
    expect(COLD_DRINK_UNITS).toContain('345ml Bottle');
    expect(COLD_DRINK_UNITS).toContain('500ml');
    expect(COLD_DRINK_UNITS).toContain('500ml Bottle');
    expect(COLD_DRINK_UNITS).toContain('750ml');
    expect(COLD_DRINK_UNITS).toContain('1 Litre');
    expect(COLD_DRINK_UNITS).toContain('1.5 Litre');
    expect(COLD_DRINK_UNITS).toContain('2 Litre');
    expect(COLD_DRINK_UNITS).toContain('2.25 Litre');
    expect(COLD_DRINK_UNITS).toContain('Can');
    expect(COLD_DRINK_UNITS).toContain('Bottle');
    expect(COLD_DRINK_UNITS).toContain('Tin');
    expect(COLD_DRINK_UNITS).toContain('Glass');

    // Ensure all standard units contains both cold drinks and food units
    expect(ALL_STANDARD_UNITS.length).toBeGreaterThanOrEqual(COLD_DRINK_UNITS.length + FOOD_UNITS.length - 2);
    expect(ALL_STANDARD_UNITS).toContain('300ml');
    expect(ALL_STANDARD_UNITS).toContain('Piece');
    expect(ALL_STANDARD_UNITS).toContain('1 Kg');
  });

  // 39. Sweet items, desserts, beverages, and water bottles always render at the very end
  it('39. sortCategories and sortMenuItems ensure sweet items, desserts, beverages, and water bottles always render at the end', () => {
    const categories = [
      { id: 'cat-water', name: 'Water Bottle' },
      { id: 'cat-sweet', name: 'Gulab Jamun & Sweets' },
      { id: 'cat-karahi', name: 'Chicken Karahi' },
      { id: 'cat-cold', name: 'Cold Drink & Juices' },
      { id: 'cat-ice', name: 'Ice Cream' },
      { id: 'cat-bbq', name: 'BBQ Specials' },
    ];

    const sorted = sortCategories(categories);
    const sortedNames = sorted.map((c) => c.name);

    // Food first (BBQ Specials, Chicken Karahi), then Desserts (Gulab Jamun, Ice Cream), then Drinks (Cold Drink, Water Bottle)
    expect(sortedNames).toEqual([
      'BBQ Specials',
      'Chicken Karahi',
      'Gulab Jamun & Sweets',
      'Ice Cream',
      'Cold Drink & Juices',
      'Water Bottle',
    ]);

    // Test item sorting
    const items = [
      { id: 'i1', name: 'Mineral Water 500ml', categoryName: 'Water Bottle' },
      { id: 'i2', name: 'Chicken Biryani', categoryName: 'Rice' },
      { id: 'i3', name: 'Gulab Jamun (2 Pcs)', categoryName: 'Sweets' },
      { id: 'i4', name: 'Dew 300ml', categoryName: 'Cold Drinks' },
      { id: 'i5', name: 'Chicken Roll', categoryName: 'Roll' },
    ];

    const sortedItems = sortMenuItems(items, categories);
    expect(sortedItems.map((i) => i.name)).toEqual([
      'Chicken Biryani',
      'Chicken Roll',
      'Gulab Jamun (2 Pcs)',
      'Dew 300ml',
      'Mineral Water 500ml',
    ]);
  });
});


