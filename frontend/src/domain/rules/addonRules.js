/**
 * Master Add-on Intelligence & Pairing Rules
 * Based on authentic restaurant specifications provided by the user.
 */

// 6 Canonical Add-on Types
export const ADDON_TYPES = [
  'Extra Protein',
  'Side',
  'Sauce / Dip',
  'Topping',
  'Drink',
  'Dessert Extra',
];

/**
 * Automatically classifies any add-on name into one of the 6 official types.
 */
export function detectAddonType(addonName = '') {
  const norm = (addonName || '').toLowerCase().trim();
  if (!norm) return 'Side';

  // 1. Drink
  const isDrink =
    norm.includes('drink') ||
    norm.includes('water') ||
    norm.includes('pepsi') ||
    norm.includes('coke') ||
    /\bcola\b/.test(norm) ||
    norm.includes('coca') ||
    norm.includes('sprite') ||
    norm.includes('7up') ||
    /\bdew\b/.test(norm) ||
    norm.includes('mountain dew') ||
    norm.includes('soda') ||
    norm.includes('juice') ||
    norm.includes('shake') ||
    norm.includes('chai') ||
    /\btea\b/.test(norm) ||
    norm.includes('coffee') ||
    norm.includes('espresso') ||
    norm.includes('lassi');

  if (isDrink && !norm.includes('chocolate') && !norm.includes('syrup')) {
    return 'Drink';
  }

  // 2. Extra Protein
  if (
    norm.includes('chicken') ||
    norm.includes('beef') ||
    norm.includes('mutton') ||
    norm.includes('boti') ||
    norm.includes('patty') ||
    norm.includes('kabab') ||
    norm.includes('kebab') ||
    norm.includes('egg') ||
    norm.includes('meat') ||
    norm.includes('nalli') ||
    norm.includes('maghaz') ||
    norm.includes('tikka') ||
    norm.includes('wing') ||
    norm.includes('nugget') ||
    norm.includes('strip') ||
    norm.includes('fish') ||
    norm.includes('shami') ||
    norm.includes('sausage') ||
    norm.includes('meatball') ||
    norm.includes('chops') ||
    norm.includes('prawn')
  ) {
    return 'Extra Protein';
  }

  // 3. Side
  if (
    norm.includes('fries') ||
    norm.includes('chips') ||
    norm.includes('salad') ||
    norm.includes('naan') ||
    norm.includes('roti') ||
    norm.includes('paratha') ||
    norm.includes('rice') ||
    norm.includes('chawal') ||
    norm.includes('coleslaw') ||
    norm.includes('wedge') ||
    norm.includes('puri') ||
    norm.includes('poori') ||
    norm.includes('bread') ||
    norm.includes('kulcha') ||
    norm.includes('toast') ||
    norm.includes('cracker') ||
    norm.includes('spring roll') ||
    norm.includes('daal') ||
    norm.includes('bhujia') ||
    norm.includes('halwa') ||
    norm.includes('chana') ||
    norm.includes('crouton')
  ) {
    return 'Side';
  }

  // 4. Sauce / Dip
  if (
    norm.includes('raita') ||
    norm.includes('mayo') ||
    norm.includes('sauce') ||
    norm.includes('dip') ||
    norm.includes('chutney') ||
    norm.includes('chutni') ||
    norm.includes('ranch') ||
    norm.includes('ketchup') ||
    norm.includes('gravy') ||
    norm.includes('salan') ||
    norm.includes('dressing') ||
    norm.includes('tarka') ||
    norm.includes('soy') ||
    norm.includes('tahini') ||
    norm.includes('buffalo') ||
    norm.includes('achar') ||
    norm.includes('tartar')
  ) {
    return 'Sauce / Dip';
  }

  // 5. Topping
  if (
    norm.includes('cheese') ||
    norm.includes('cheesse') ||
    norm.includes('chese') ||
    norm.includes('mozzarella') ||
    norm.includes('cheddar') ||
    norm.includes('parmesan') ||
    norm.includes('jalapeno') ||
    norm.includes('olive') ||
    norm.includes('mushroom') ||
    norm.includes('mashroom') ||
    norm.includes('mushrom') ||
    norm.includes('pickle') ||
    norm.includes('onion') ||
    norm.includes('ginger') ||
    norm.includes('chilli') ||
    norm.includes('chili') ||
    norm.includes('lemon') ||
    norm.includes('corn') ||
    norm.includes('pineapple') ||
    norm.includes('capsicum') ||
    norm.includes('pepperoni') ||
    norm.includes('aloo') ||
    norm.includes('potato') ||
    norm.includes('chaat masala') ||
    norm.includes('oregano') ||
    norm.includes('butter') ||
    norm.includes('basil seed') ||
    norm.includes('jelly') ||
    norm.includes('sprinkle')
  ) {
    return 'Topping';
  }

  // 6. Dessert Extra
  if (
    norm.includes('ice cream') ||
    norm.includes('scoop') ||
    norm.includes('chocolate') ||
    norm.includes('syrup') ||
    norm.includes('rabri') ||
    norm.includes('nut') ||
    norm.includes('whipped') ||
    norm.includes('cream') ||
    norm.includes('caramel') ||
    norm.includes('honey') ||
    norm.includes('nutella') ||
    norm.includes('khoya') ||
    norm.includes('cone') ||
    norm.includes('waffle') ||
    norm.includes('kulfi') ||
    norm.includes('oreo') ||
    norm.includes('kitkat') ||
    norm.includes('jalebi') ||
    norm.includes('gulab jamun')
  ) {
    return 'Dessert Extra';
  }

  return 'Side';
}

/**
 * Universal upsells that apply across all savory foods.
 */
export const UNIVERSAL_DRINK_KEYWORDS = [
  'cold drink',
  'drink',
  'water',
  'mineral water',
  'pepsi',
  'coke',
  'sprite',
  '7up',
  'dew',
  'soda',
];

/**
 * Category-Level Allowed Add-ons Keywords
 * Category → common allowed add-ons
 */
export const CATEGORY_ADDON_KEYWORDS = {
  // Rice & Biryani & Pulao
  biryani: [
    'raita', 'mint raita', 'salad', 'kachumber', 'extra aloo', 'aloo', 'potato',
    'boti', 'extra boti', 'chicken boti', 'extra chicken boti', 'beef piece', 'mutton piece', 'egg', 'boiled egg', 'shami',
    'rice', 'extra rice', 'chutney', 'chutni', 'drink', 'water', 'coke', 'pepsi'
  ],
  pulao: [
    'raita', 'mint raita', 'salad', 'kachumber', 'chicken', 'chicken piece',
    'beef', 'beef piece', 'mutton', 'mutton piece', 'shami', 'chutney',
    'chutni', 'drink', 'water'
  ],
  rice: [
    'raita', 'salad', 'daal', 'gravy', 'chicken gravy', 'beef gravy',
    'kabab', 'shami', 'drink', 'water'
  ],

  // Karahi & Handi
  karahi: [
    'naan', 'garlic naan', 'butter naan', 'roghni naan', 'roti', 'tandoori roti',
    'raita', 'salad', 'chutney', 'chutni', 'green chutney', 'gravy', 'extra gravy',
    'drink', 'water'
  ],
  handi: [
    'naan', 'garlic naan', 'butter naan', 'roghni naan', 'roti', 'raita', 'salad',
    'gravy', 'extra gravy', 'green chutney', 'drink', 'water'
  ],

  // Desi Curries
  qorma: [
    'naan', 'roti', 'roghni naan', 'gravy', 'extra gravy', 'salad',
    'raita', 'drink', 'water'
  ],
  korma: [
    'naan', 'roti', 'roghni naan', 'gravy', 'extra gravy', 'salad',
    'raita', 'drink', 'water'
  ],
  nihari: [
    'naan', 'roghni naan', 'kulcha', 'nalli', 'extra nalli', 'maghaz',
    'extra maghaz', 'nihari meat', 'meat', 'ginger', 'green chilli', 'chilli',
    'lemon', 'fried onion', 'drink', 'water'
  ],
  haleem: [
    'naan', 'haleem meat', 'meat', 'fried onion', 'lemon', 'ginger',
    'green chilli', 'chilli', 'chaat masala', 'drink', 'water'
  ],
  daal: [
    'naan', 'roti', 'rice', 'zeera rice', 'salad', 'raita', 'achar',
    'tarka', 'extra tarka', 'drink', 'water'
  ],
  dal: [
    'naan', 'roti', 'rice', 'zeera rice', 'salad', 'raita', 'achar',
    'tarka', 'extra tarka', 'drink', 'water'
  ],

  // BBQ & Kababs & Grilled Fish
  bbq: [
    'naan', 'roti', 'paratha', 'garlic naan', 'raita', 'chutney', 'chutni',
    'green chutney', 'mint chutney', 'imli chutney', 'salad', 'boti', 'tikka',
    'kabab', 'kebab', 'fries', 'drink', 'water'
  ],
  tikka: [
    'naan', 'roti', 'paratha', 'raita', 'chutney', 'chutni', 'green chutney',
    'imli chutney', 'salad', 'tikka', 'fries', 'drink', 'water'
  ],
  boti: [
    'naan', 'paratha', 'garlic naan', 'raita', 'chutney', 'chutni',
    'mint chutney', 'green chutney', 'salad', 'boti', 'fries', 'drink', 'water'
  ],
  kabab: [
    'paratha', 'naan', 'roti', 'chutney', 'chutni', 'green chutney',
    'mint chutney', 'raita', 'salad', 'kabab', 'kebab', 'fries', 'drink', 'water'
  ],
  kebab: [
    'paratha', 'naan', 'roti', 'chutney', 'chutni', 'green chutney',
    'raita', 'salad', 'kabab', 'kebab', 'fries', 'drink', 'water'
  ],
  fish: [
    'fries', 'lemon', 'tartar sauce', 'tartar', 'garlic mayo', 'salad',
    'coleslaw', 'naan', 'rice', 'drink', 'water'
  ],

  // Fast Food: Burgers, Sandwiches, Rolls & Shawarma
  burger: [
    'cheese', 'double cheese', 'cheese slice', 'patty', 'fries',
    'loaded fries', 'caramelized onion', 'jalapeno', 'pickle', 'pickles',
    'coleslaw', 'garlic mayo', 'spicy mayo', 'bbq sauce', 'sauce',
    'extra sauce', 'egg', 'fried egg', 'drink', 'water'
  ],
  sandwich: [
    'cheese', 'chicken', 'extra chicken', 'egg', 'fried egg', 'fries',
    'coleslaw', 'mayo', 'garlic mayo', 'ketchup', 'jalapeno', 'drink', 'water'
  ],
  roll: [
    'cheese', 'boti', 'extra chicken', 'chicken', 'fries', 'garlic mayo',
    'chutney', 'chutni', 'paratha', 'paratha upgrade', 'egg', 'drink', 'water'
  ],
  wrap: [
    'cheese', 'zinger', 'chicken', 'fries', 'jalapeno', 'garlic mayo',
    'spicy mayo', 'drink', 'water'
  ],
  shawarma: [
    'chicken', 'extra chicken', 'cheese', 'fries', 'fries inside', 'pickle',
    'pickles', 'jalapeno', 'garlic sauce', 'tahini', 'tahini sauce', 'spicy sauce',
    'pita', 'extra pita', 'drink', 'water'
  ],

  // Pizza
  pizza: [
    'cheese', 'cheesse', 'mozzarella', 'chicken', 'beef', 'pepperoni', 'olive',
    'olives', 'jalapeno', 'mushroom', 'mashroom', 'onion', 'corn', 'sweet corn',
    'pineapple', 'capsicum', 'pizza sauce', 'garlic dip', 'ranch dip',
    'chilli flakes', 'oregano', 'drink', 'water'
  ],

  // Fried Chicken / Broast / Wings / Nuggets / Strips
  'fried chicken': [
    'fries', 'coleslaw', 'dinner roll', 'roll', 'bun', 'garlic mayo', 'spicy mayo',
    'ketchup', 'bbq sauce', 'cheese dip', 'chicken piece', 'drink', 'water'
  ],
  broast: [
    'fries', 'coleslaw', 'dinner roll', 'roll', 'bun', 'garlic mayo', 'spicy mayo',
    'ketchup', 'bbq sauce', 'cheese dip', 'chicken piece', 'drink', 'water'
  ],
  wings: [
    'wing', 'wings', 'fries', 'ranch', 'ranch dip', 'garlic mayo', 'buffalo',
    'buffalo sauce', 'bbq sauce', 'cheese dip', 'drink', 'water'
  ],
  nuggets: [
    'nugget', 'nuggets', 'fries', 'ketchup', 'garlic mayo', 'bbq sauce',
    'cheese dip', 'drink', 'water'
  ],
  strips: [
    'strip', 'strips', 'fries', 'coleslaw', 'garlic mayo', 'bbq sauce',
    'ranch', 'cheese dip', 'drink', 'water'
  ],

  // Pasta
  pasta: [
    'chicken', 'extra chicken', 'cheese', 'cheesse', 'mozzarella', 'parmesan',
    'mushroom', 'mashroom', 'olive', 'olives', 'jalapeno', 'garlic bread',
    'sauce', 'garlic sauce', 'meatball', 'meatballs', 'chilli flakes',
    'drink', 'water'
  ],

  // Chinese
  chinese: [
    'rice', 'fried rice', 'egg fried rice', 'egg', 'extra egg', 'vegetable',
    'vegetables', 'gravy', 'manchurian gravy', 'chicken', 'extra chicken',
    'chilli sauce', 'soy sauce', 'spring roll', 'drink', 'water'
  ],

  // Fries & Sides
  fries: [
    'cheese sauce', 'garlic mayo', 'ketchup', 'bbq sauce', 'ranch',
    'jalapeno', 'chilli garlic', 'cheese', 'extra cheese', 'chicken',
    'beef', 'olive', 'olives', 'spicy mayo', 'cheese dip', 'drink', 'water'
  ],

  // Soup
  soup: [
    'garlic bread', 'bread sticks', 'chicken', 'extra chicken', 'egg',
    'extra egg', 'chilli sauce', 'soy sauce', 'crackers', 'drink', 'water'
  ],

  // Salads
  salad: [
    'chicken', 'extra chicken', 'parmesan', 'crouton', 'croutons', 'dressing',
    'extra dressing', 'egg', 'boiled egg', 'lemon', 'cucumber', 'tomato',
    'olive oil', 'mint sauce', 'drink', 'water'
  ],

  // Breakfast
  breakfast: [
    'puri', 'extra puri', 'halwa', 'extra halwa', 'chana', 'extra chana',
    'bhujia', 'aloo bhujia', 'achar', 'lassi', 'chai', 'egg', 'omelette',
    'butter', 'yogurt', 'toast', 'sausage', 'honey', 'maple syrup',
    'nutella', 'chocolate sauce', 'banana', 'strawberry', 'ice cream scoop'
  ],

  // Desserts & Sweets
  dessert: [
    'ice cream', 'scoop', 'chocolate', 'chocolate sauce', 'caramel',
    'caramel sauce', 'nut', 'nuts', 'whipped cream', 'strawberry',
    'strawberry sauce', 'blueberry sauce', 'rabri', 'khoya', 'kulfi'
  ],
  sweet: [
    'rabri', 'ice cream', 'milk', 'khoya', 'nut', 'nuts', 'gulab jamun', 'jalebi'
  ],
  'ice cream': [
    'scoop', 'extra scoop', 'cone', 'waffle cone', 'chocolate', 'chocolate sauce',
    'caramel', 'caramel sauce', 'strawberry', 'strawberry sauce', 'nut',
    'nuts', 'sprinkle', 'sprinkles', 'brownie', 'rabri', 'kulfi'
  ],

  // Beverages & Shakes & Juices
  shake: [
    'scoop', 'extra ice cream scoop', 'whipped cream', 'chocolate',
    'chocolate sauce', 'caramel', 'oreo', 'kitkat', 'brownie'
  ],
  juice: [
    'mint', 'lemon', 'black salt', 'extra ice', 'ice cube', 'pulp', 'fruit pulp'
  ],
  tea: [
    'milk', 'extra milk', 'sugar', 'extra sugar', 'honey', 'ginger',
    'elaichi', 'cardamom', 'biscuit', 'rusk'
  ],
  coffee: [
    'espresso', 'extra espresso shot', 'milk', 'cream', 'whipped cream',
    'syrup', 'caramel syrup', 'vanilla syrup', 'hazelnut syrup', 'chocolate syrup'
  ],
};

/**
 * Specific dish-level extra add-ons (item-level special add-ons)
 * Specific Item → extra/special Add-ons
 */
export const ITEM_SPECIFIC_ADDONS = {
  // Biryani
  'chicken biryani': ['boti', 'extra boti', 'chicken boti', 'extra chicken boti', 'chicken piece', 'extra chicken', 'aloo', 'extra aloo', 'egg', 'boiled egg', 'shami'],
  'beef biryani': ['beef piece', 'beef', 'boti', 'extra boti', 'beef boti', 'aloo', 'extra aloo', 'egg', 'boiled egg', 'shami'],
  'mutton biryani': ['mutton piece', 'mutton', 'boti', 'extra boti', 'mutton boti', 'aloo', 'extra aloo', 'egg', 'boiled egg', 'shami'],
  'sindhi biryani': ['boti', 'extra boti', 'chicken boti', 'extra chicken boti', 'aloo', 'extra aloo', 'egg', 'boiled egg', 'shami'],
  'special biryani': ['boti', 'extra boti', 'chicken boti', 'extra chicken boti', 'beef piece', 'aloo', 'extra aloo', 'egg', 'boiled egg', 'shami'],
  'biryani': ['boti', 'extra boti', 'chicken boti', 'extra chicken boti', 'aloo', 'extra aloo', 'egg', 'boiled egg', 'shami'],

  // Pulao & Plain Rice
  'chicken pulao': ['chicken piece', 'chicken', 'shami'],
  'beef pulao': ['beef piece', 'beef', 'shami'],
  'mutton pulao': ['mutton piece', 'mutton', 'shami'],
  'plain rice': ['daal', 'chicken gravy', 'beef gravy', 'kabab', 'shami'],
  'zeera rice': ['daal', 'chicken gravy', 'beef gravy', 'kabab', 'shami'],

  // Karahi & Handi & Curries
  'chicken karahi': ['extra gravy', 'gravy', 'butter naan', 'garlic naan', 'roghni naan'],
  'mutton karahi': ['extra gravy', 'gravy', 'roghni naan', 'garlic naan'],
  'white karahi': ['butter naan', 'garlic naan', 'extra gravy', 'green chutney'],
  'chicken handi': ['extra gravy', 'gravy', 'butter naan', 'garlic naan'],
  'mutton handi': ['extra gravy', 'gravy', 'roghni naan'],
  'chicken qorma': ['extra gravy', 'gravy', 'roghni naan'],
  'mutton qorma': ['extra gravy', 'gravy', 'roghni naan'],
  'nihari': ['nalli', 'extra nalli', 'maghaz', 'extra maghaz', 'nihari meat', 'kulcha', 'fried onion'],
  'haleem': ['haleem meat', 'meat', 'fried onion', 'chaat masala'],
  'daal': ['zeera rice', 'achar', 'tarka', 'extra tarka'],

  // BBQ & Kababs
  'chicken tikka': ['tikka piece', 'extra tikka', 'tikka', 'fries', 'imli chutney'],
  'malai boti': ['extra boti', 'boti', 'fries', 'garlic naan', 'mint chutney'],
  'chicken boti': ['extra boti', 'boti', 'fries', 'green chutney'],
  'beef boti': ['extra boti', 'boti', 'green chutney'],
  'behari boti': ['extra boti', 'boti', 'green chutney'],
  'seekh kabab': ['extra kabab', 'kabab', 'green chutney'],
  'gola kabab': ['extra kabab', 'kabab', 'mint chutney'],
  'chapli kabab': ['extra kabab', 'kabab', 'fries', 'green chutney'],
  'bbq platter': ['extra kabab', 'extra boti', 'extra naan', 'extra paratha', 'fries'],
  'grilled fish': ['tartar sauce', 'tartar', 'lemon', 'coleslaw', 'fries'],
  'bbq fish': ['tartar sauce', 'tartar', 'lemon', 'coleslaw', 'fries'],

  // Burgers & Sandwiches
  'zinger burger': ['zinger patty', 'extra zinger', 'patty', 'egg', 'cheese slice', 'loaded fries', 'spicy mayo'],
  'beef burger': ['beef patty', 'caramelized onion', 'patty', 'fried egg', 'egg', 'bbq sauce'],
  'chicken burger': ['chicken patty', 'patty', 'egg', 'garlic mayo'],
  'cheese burger': ['extra cheese', 'cheese slice', 'extra patty', 'patty', 'egg'],
  'club sandwich': ['chicken', 'extra chicken', 'fried egg', 'egg', 'coleslaw', 'fries'],
  'grilled sandwich': ['chicken', 'extra chicken', 'jalapeno', 'coleslaw', 'fries'],

  // Rolls & Shawarma
  'shawarma': ['extra chicken', 'chicken', 'fries inside', 'fries', 'pita', 'tahini', 'tahini sauce', 'garlic sauce'],
  'chicken roll': ['chicken boti', 'extra chicken', 'boti', 'paratha', 'paratha upgrade', 'egg', 'fries'],
  'behari roll': ['behari boti', 'boti', 'paratha', 'chutney'],
  'zinger roll': ['zinger', 'extra zinger', 'fries', 'spicy mayo', 'garlic mayo'],

  // Fried Chicken & Wings
  'fried chicken': ['chicken piece', 'extra chicken', 'dinner roll', 'coleslaw', 'fries', 'cheese dip'],
  'hot wings': ['wing', 'wings', 'extra wings', 'ranch dip', 'buffalo sauce'],
  'chicken nuggets': ['nugget', 'nuggets', 'extra nuggets', 'cheese dip'],
  'chicken strips': ['strip', 'strips', 'coleslaw', 'ranch', 'cheese dip'],

  // Pizza
  'chicken fajita pizza': ['fajita', 'chicken', 'extra chicken', 'garlic dip', 'jalapeno', 'olives'],
  'chicken tikka pizza': ['tikka', 'chicken tikka', 'chicken', 'garlic mayo', 'jalapeno'],
  'malai boti pizza': ['malai boti', 'boti', 'garlic dip', 'ranch'],

  // Pasta
  'alfredo pasta': ['chicken', 'extra chicken', 'garlic bread', 'mushrooms', 'garlic sauce'],
  'red sauce pasta': ['chicken', 'meatball', 'meatballs', 'garlic bread', 'chilli flakes'],
  'mac & cheese': ['extra cheese', 'chicken', 'garlic bread', 'jalapeno'],

  // Chinese
  'chicken chow mein': ['chicken', 'extra chicken', 'egg', 'extra egg', 'spring roll', 'soy sauce'],
  'fried rice': ['chicken', 'extra chicken', 'egg', 'extra egg', 'gravy', 'manchurian gravy', 'spring roll'],
  'chicken manchurian': ['fried rice', 'egg fried rice', 'gravy', 'extra gravy', 'chicken'],
  'chicken chilli dry': ['fried rice', 'egg fried rice', 'chicken', 'soy sauce'],
  'shashlik': ['rice', 'fries', 'chicken', 'sauce'],

  // Fries & Sides
  'loaded fries': ['chicken', 'beef', 'cheese', 'extra cheese', 'jalapeno', 'spicy mayo'],
  'potato wedges': ['cheese dip', 'garlic mayo', 'bbq sauce'],

  // Soups & Salads
  'soup': ['chicken', 'egg', 'garlic bread', 'crackers', 'chilli sauce', 'soy sauce'],
  'caesar salad': ['chicken', 'extra chicken', 'parmesan', 'crouton', 'croutons'],
  'fresh salad': ['lemon', 'cucumber', 'tomato', 'olive oil', 'mint sauce'],

  // Breakfast
  'halwa puri': ['puri', 'extra puri', 'halwa', 'extra halwa', 'chana', 'extra chana', 'bhujia', 'lassi'],
  'paratha': ['omelette', 'fried egg', 'egg', 'butter', 'chai', 'yogurt'],
  'omelette': ['toast', 'paratha', 'sausage', 'chai'],
  'pancake': ['honey', 'maple syrup', 'nutella', 'ice cream scoop'],
  'waffle': ['nutella', 'chocolate sauce', 'ice cream', 'whipped cream'],

  // Desserts & Sweets
  'brownie': ['vanilla ice cream', 'chocolate ice cream', 'ice cream scoop', 'chocolate sauce', 'nuts'],
  'chocolate cake': ['ice cream scoop', 'chocolate sauce', 'whipped cream'],
  'cheesecake': ['strawberry sauce', 'blueberry sauce', 'caramel', 'whipped cream'],
  'gulab jamun': ['rabri', 'ice cream scoop', 'extra gulab jamun'],
  'jalebi': ['rabri', 'milk', 'extra jalebi'],
  'gajar halwa': ['ice cream', 'khoya', 'nuts'],
  'kheer': ['nuts', 'rabri', 'extra cream'],
  'firni': ['nuts', 'rabri', 'extra cream'],
  'falooda': ['extra ice cream scoop', 'rabri', 'jelly', 'basil seeds', 'kulfi'],
  'milkshake': ['extra ice cream scoop', 'whipped cream', 'chocolate sauce', 'oreo', 'kitkat'],
};

/**
 * Checks if an add-on is recommended for a given food item and category.
 */
export function isAddonRecommended(addonName = '', foodCategoryName = '', foodItemName = '') {
  if (!addonName) return false;

  const aNorm = addonName.toLowerCase().trim();
  const cNorm = (foodCategoryName || '').toLowerCase().trim();
  const iNorm = (foodItemName || '').toLowerCase().trim();
  const combined = `${cNorm} ${iNorm}`;

  // 1. Universal Drink / Cold Drink: Fixed across all food items
  const isCurrentItemBeverage =
    combined.includes('drink') ||
    combined.includes('water') ||
    combined.includes('beverage') ||
    combined.includes('soda');

  const isDrinkAddon =
    UNIVERSAL_DRINK_KEYWORDS.some((dk) => aNorm.includes(dk)) ||
    aNorm.includes('cold drink') ||
    aNorm.includes('drink') ||
    aNorm.includes('water') ||
    aNorm.includes('pepsi') ||
    aNorm.includes('coke') ||
    aNorm.includes('sprite') ||
    aNorm.includes('7up') ||
    aNorm.includes('dew');

  if (isDrinkAddon && !isCurrentItemBeverage) {
    return true;
  }

  // 2. Specific Item → extra/special Add-ons
  for (const [foodKey, itemKeywords] of Object.entries(ITEM_SPECIFIC_ADDONS)) {
    if (iNorm.includes(foodKey)) {
      if (itemKeywords.some((ik) => aNorm.includes(ik))) {
        return true;
      }
    }
  }

  // 3. Category → allowed Add-ons
  for (const [catKey, catKeywords] of Object.entries(CATEGORY_ADDON_KEYWORDS)) {
    if (combined.includes(catKey)) {
      if (catKeywords.some((ck) => aNorm.includes(ck))) {
        return true;
      }
    }
  }

  return false;
}
