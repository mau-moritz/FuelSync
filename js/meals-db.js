/* FuelSync — Meal Database
 * 100 common athlete meals with pre-profiled macros
 * Categories: breakfast, lunch, dinner, snack, pre_workout, post_workout
 */

const MEAL_DB = [
  // ── BREAKFAST ──────────────────────────────────────────────────────────
  { name:'Oat porridge with banana & honey',     cat:'breakfast',    cal:380, carbs:68, protein:11, fat:6  },
  { name:'Greek yogurt with granola & berries',  cat:'breakfast',    cal:340, carbs:44, protein:20, fat:8  },
  { name:'Scrambled eggs on wholegrain toast',   cat:'breakfast',    cal:380, carbs:30, protein:24, fat:16 },
  { name:'Overnight oats with nut butter',       cat:'breakfast',    cal:450, carbs:55, protein:14, fat:18 },
  { name:'Smoothie bowl (banana, oat, almond)',  cat:'breakfast',    cal:420, carbs:65, protein:12, fat:10 },
  { name:'Avocado toast with 2 poached eggs',    cat:'breakfast',    cal:430, carbs:28, protein:20, fat:26 },
  { name:'Whole-grain pancakes with maple',      cat:'breakfast',    cal:460, carbs:72, protein:12, fat:12 },
  { name:'Muesli with full-fat milk',            cat:'breakfast',    cal:370, carbs:58, protein:14, fat:8  },
  { name:'Peanut butter & banana smoothie',      cat:'breakfast',    cal:480, carbs:60, protein:18, fat:18 },
  { name:'Egg white omelette with veggies',      cat:'breakfast',    cal:210, carbs:8,  protein:28, fat:6  },
  { name:'Rice cakes with cottage cheese',       cat:'breakfast',    cal:240, carbs:30, protein:18, fat:4  },
  { name:'Bagel with smoked salmon & cream cheese', cat:'breakfast', cal:420, carbs:48, protein:22, fat:14 },
  { name:'Protein oats (oats + whey + milk)',    cat:'breakfast',    cal:490, carbs:58, protein:36, fat:10 },
  { name:'French toast with berries',            cat:'breakfast',    cal:400, carbs:55, protein:16, fat:12 },
  { name:'Cereal (Weetabix) with semi-skimmed', cat:'breakfast',    cal:300, carbs:54, protein:12, fat:4  },

  // ── LUNCH ──────────────────────────────────────────────────────────────
  { name:'Chicken & rice bowl',                  cat:'lunch',        cal:520, carbs:58, protein:42, fat:10 },
  { name:'Tuna wrap with salad',                 cat:'lunch',        cal:410, carbs:40, protein:34, fat:10 },
  { name:'Pasta bolognese (lean beef)',           cat:'lunch',        cal:580, carbs:68, protein:38, fat:14 },
  { name:'Salmon & sweet potato',                cat:'lunch',        cal:510, carbs:42, protein:38, fat:16 },
  { name:'Turkey & avocado sandwich',            cat:'lunch',        cal:440, carbs:36, protein:32, fat:18 },
  { name:'Lentil soup with crusty bread',        cat:'lunch',        cal:420, carbs:62, protein:20, fat:8  },
  { name:'Greek salad with chicken breast',      cat:'lunch',        cal:380, carbs:14, protein:42, fat:16 },
  { name:'Sushi platter (8 pcs mixed)',          cat:'lunch',        cal:440, carbs:68, protein:20, fat:6  },
  { name:'Jacket potato with tuna & sweetcorn',  cat:'lunch',        cal:480, carbs:64, protein:36, fat:8  },
  { name:'Buddha bowl (quinoa, chickpea, veg)',  cat:'lunch',        cal:490, carbs:62, protein:22, fat:16 },
  { name:'Caesar salad with grilled chicken',    cat:'lunch',        cal:420, carbs:14, protein:44, fat:20 },
  { name:'Brown rice & black bean bowl',         cat:'lunch',        cal:480, carbs:76, protein:18, fat:8  },
  { name:'Falafel pita with hummus',             cat:'lunch',        cal:510, carbs:64, protein:18, fat:18 },
  { name:'Chicken & vegetable stir fry + rice',  cat:'lunch',        cal:540, carbs:62, protein:38, fat:12 },
  { name:'Poke bowl (tuna, rice, edamame)',      cat:'lunch',        cal:520, carbs:60, protein:36, fat:14 },

  // ── DINNER ─────────────────────────────────────────────────────────────
  { name:'Grilled chicken breast & veg',         cat:'dinner',       cal:380, carbs:10, protein:52, fat:12 },
  { name:'Salmon fillet with roasted potatoes',  cat:'dinner',       cal:520, carbs:40, protein:42, fat:18 },
  { name:'Beef steak (200g) with salad',         cat:'dinner',       cal:480, carbs:6,  protein:56, fat:24 },
  { name:'Spaghetti bolognese',                  cat:'dinner',       cal:620, carbs:72, protein:38, fat:16 },
  { name:'Thai green curry with jasmine rice',   cat:'dinner',       cal:580, carbs:68, protein:32, fat:18 },
  { name:'Grilled cod with sweet potato mash',   cat:'dinner',       cal:440, carbs:44, protein:42, fat:8  },
  { name:'Chicken tikka masala with rice',       cat:'dinner',       cal:580, carbs:64, protein:40, fat:14 },
  { name:'Beef & vegetable stew with bread',     cat:'dinner',       cal:560, carbs:54, protein:38, fat:18 },
  { name:'Prawn & vegetable noodle stir fry',    cat:'dinner',       cal:460, carbs:56, protein:30, fat:10 },
  { name:'Veggie lasagne',                       cat:'dinner',       cal:520, carbs:58, protein:22, fat:22 },
  { name:'Lean pork tenderloin with broccoli',   cat:'dinner',       cal:400, carbs:12, protein:50, fat:14 },
  { name:'Turkey mince chilli with rice',        cat:'dinner',       cal:540, carbs:58, protein:44, fat:10 },
  { name:'Baked cod in tomato sauce',            cat:'dinner',       cal:320, carbs:18, protein:40, fat:8  },
  { name:'Lamb & chickpea tagine with couscous', cat:'dinner',       cal:590, carbs:62, protein:36, fat:20 },
  { name:'Tofu & vegetable stir fry + rice',     cat:'dinner',       cal:480, carbs:62, protein:24, fat:14 },

  // ── SNACKS ─────────────────────────────────────────────────────────────
  { name:'Banana',                               cat:'snack',        cal:90,  carbs:23, protein:1,  fat:0  },
  { name:'Apple with peanut butter (1 tbsp)',    cat:'snack',        cal:190, carbs:28, protein:4,  fat:8  },
  { name:'Rice cakes (3) with hummus',           cat:'snack',        cal:180, carbs:28, protein:6,  fat:5  },
  { name:'Mixed nuts (30g)',                     cat:'snack',        cal:180, carbs:6,  protein:5,  fat:16 },
  { name:'Protein bar (generic 60g)',            cat:'snack',        cal:210, carbs:22, protein:20, fat:6  },
  { name:'Greek yogurt (plain, 150g)',           cat:'snack',        cal:130, carbs:8,  protein:15, fat:4  },
  { name:'Hard boiled eggs x2',                  cat:'snack',        cal:140, carbs:1,  protein:12, fat:10 },
  { name:'Cottage cheese with pineapple',        cat:'snack',        cal:170, carbs:22, protein:14, fat:2  },
  { name:'Oat & raisin flapjack',               cat:'snack',        cal:280, carbs:40, protein:4,  fat:12 },
  { name:'Dark chocolate (30g)',                  cat:'snack',        cal:170, carbs:18, protein:2,  fat:10 },
  { name:'Edamame (100g)',                       cat:'snack',        cal:120, carbs:10, protein:11, fat:5  },
  { name:'Carrots & hummus (100g carrots)',      cat:'snack',        cal:140, carbs:20, protein:4,  fat:5  },
  { name:'Jerky beef (30g)',                     cat:'snack',        cal:100, carbs:2,  protein:16, fat:3  },
  { name:'Mozzarella & tomato (small)',          cat:'snack',        cal:200, carbs:4,  protein:14, fat:14 },
  { name:'Trail mix (30g)',                      cat:'snack',        cal:150, carbs:16, protein:3,  fat:8  },

  // ── PRE-WORKOUT ────────────────────────────────────────────────────────
  { name:'Banana & rice cakes (2)',              cat:'pre_workout',  cal:210, carbs:48, protein:3,  fat:1  },
  { name:'White rice (150g cooked) & chicken',  cat:'pre_workout',  cal:340, carbs:52, protein:28, fat:4  },
  { name:'Oat porridge with honey',             cat:'pre_workout',  cal:320, carbs:58, protein:10, fat:5  },
  { name:'Toast with jam (2 slices)',            cat:'pre_workout',  cal:260, carbs:52, protein:6,  fat:2  },
  { name:'Sports gel + water',                  cat:'pre_workout',  cal:100, carbs:25, protein:0,  fat:0  },
  { name:'Banana smoothie (banana, milk, honey)',cat:'pre_workout',  cal:300, carbs:58, protein:8,  fat:4  },
  { name:'Date & oat energy balls x3',          cat:'pre_workout',  cal:240, carbs:42, protein:5,  fat:6  },
  { name:'Bagel with honey',                    cat:'pre_workout',  cal:290, carbs:58, protein:8,  fat:2  },
  { name:'White pasta (200g cooked)',            cat:'pre_workout',  cal:280, carbs:56, protein:10, fat:2  },
  { name:'Dried fruit mix (50g)',               cat:'pre_workout',  cal:140, carbs:36, protein:1,  fat:0  },
  { name:'Crumpets x2 with honey',              cat:'pre_workout',  cal:240, carbs:50, protein:6,  fat:2  },
  { name:'Cereal bar (45g)',                    cat:'pre_workout',  cal:190, carbs:32, protein:4,  fat:5  },
  { name:'Sports drink 500ml',                  cat:'pre_workout',  cal:130, carbs:32, protein:0,  fat:0  },
  { name:'Peanut butter on toast (1 slice)',    cat:'pre_workout',  cal:240, carbs:24, protein:8,  fat:14 },
  { name:'Rice pudding (200g)',                 cat:'pre_workout',  cal:220, carbs:38, protein:6,  fat:4  },

  // ── POST-WORKOUT ───────────────────────────────────────────────────────
  { name:'Whey protein shake (in water)',        cat:'post_workout', cal:130, carbs:4,  protein:25, fat:2  },
  { name:'Chocolate milk 300ml',                 cat:'post_workout', cal:200, carbs:30, protein:10, fat:5  },
  { name:'Chicken breast & white rice',          cat:'post_workout', cal:440, carbs:52, protein:44, fat:6  },
  { name:'Greek yogurt with banana & honey',     cat:'post_workout', cal:310, carbs:46, protein:20, fat:5  },
  { name:'Egg white omelette & toast',           cat:'post_workout', cal:320, carbs:28, protein:32, fat:6  },
  { name:'Tuna & pasta salad',                  cat:'post_workout', cal:460, carbs:56, protein:38, fat:6  },
  { name:'Cottage cheese & sweet potato',        cat:'post_workout', cal:340, carbs:44, protein:28, fat:4  },
  { name:'Protein shake + banana',              cat:'post_workout', cal:260, carbs:28, protein:26, fat:3  },
  { name:'Smoked salmon bagel',                 cat:'post_workout', cal:420, carbs:46, protein:28, fat:12 },
  { name:'Turkey & avocado rice bowl',           cat:'post_workout', cal:510, carbs:54, protein:38, fat:14 },
  { name:'Edamame & brown rice bowl',           cat:'post_workout', cal:420, carbs:62, protein:22, fat:8  },
  { name:'Lean beef & sweet potato mash',       cat:'post_workout', cal:490, carbs:42, protein:46, fat:14 },
  { name:'Low-fat quark with oats & berries',   cat:'post_workout', cal:320, carbs:44, protein:24, fat:4  },
  { name:'Chicken wrap with salad',             cat:'post_workout', cal:420, carbs:40, protein:36, fat:12 },
  { name:'Recovery shake (whey+oat+banana)',    cat:'post_workout', cal:480, carbs:64, protein:30, fat:8  },
];

// Search function
MEAL_DB.search = function(query) {
  if (!query || query.length < 1) return this.slice(0, 20);
  const q = query.toLowerCase();
  return this.filter(m => m.name.toLowerCase().includes(q)).slice(0, 20);
};
