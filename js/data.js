// ===========================
// FUELSYNC — DATA LAYER
// All stored in localStorage
// ===========================

const FS = {

  // ---- KEYS ----
  KEYS: {
    profile: 'fs_profile',
    logs: 'fs_logs',         // array of meal logs
    workouts: 'fs_workouts', // array of workout logs
  },

  // ---- DEFAULTS ----
  defaultProfile: () => ({
    name: '',
    age: 25,
    weight: 75,    // kg
    height: 175,   // cm
    sex: 'male',
    goal: 'endurance',   // endurance | strength | hybrid | weight_loss
    activityBase: 'moderate', // sedentary | light | moderate | active | very_active
    targetRace: '',
    onboarded: false,
  }),

  // ---- PROFILE ----
  getProfile() {
    const raw = localStorage.getItem(this.KEYS.profile);
    return raw ? { ...this.defaultProfile(), ...JSON.parse(raw) } : this.defaultProfile();
  },

  saveProfile(data) {
    localStorage.setItem(this.KEYS.profile, JSON.stringify(data));
  },

  // ---- MEAL LOGS ----
  getLogs() {
    const raw = localStorage.getItem(this.KEYS.logs);
    return raw ? JSON.parse(raw) : [];
  },

  saveLogs(logs) {
    localStorage.setItem(this.KEYS.logs, JSON.stringify(logs));
  },

  addMeal(meal) {
    const logs = this.getLogs();
    meal.id = Date.now().toString();
    meal.timestamp = new Date().toISOString();
    logs.push(meal);
    this.saveLogs(logs);
    return meal;
  },

  deleteMeal(id) {
    const logs = this.getLogs().filter(l => l.id !== id);
    this.saveLogs(logs);
  },

  getTodayMeals() {
    const today = new Date().toDateString();
    return this.getLogs().filter(l => new Date(l.timestamp).toDateString() === today);
  },

  getDateMeals(dateStr) {
    return this.getLogs().filter(l => new Date(l.timestamp).toDateString() === dateStr);
  },

  // ---- WORKOUTS ----
  getWorkouts() {
    const raw = localStorage.getItem(this.KEYS.workouts);
    return raw ? JSON.parse(raw) : [];
  },

  saveWorkouts(workouts) {
    localStorage.setItem(this.KEYS.workouts, JSON.stringify(workouts));
  },

  addWorkout(workout) {
    const workouts = this.getWorkouts();
    workout.id = Date.now().toString();
    workout.timestamp = new Date().toISOString();
    workouts.push(workout);
    this.saveWorkouts(workouts);
    return workout;
  },

  deleteWorkout(id) {
    const workouts = this.getWorkouts().filter(w => w.id !== id);
    this.saveWorkouts(workouts);
  },

  getTodayWorkouts() {
    const today = new Date().toDateString();
    return this.getWorkouts().filter(w => new Date(w.timestamp).toDateString() === today);
  },

  getDateWorkouts(dateStr) {
    return this.getWorkouts().filter(w => new Date(w.timestamp).toDateString() === dateStr);
  },

  // ---- CALCULATIONS ----
  calcBMR(profile) {
    const { weight, height, age, sex } = profile;
    if (sex === 'female') {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
    return 10 * weight + 6.25 * height - 5 * age + 5;
  },

  activityMultipliers: {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  },

  calcTDEE(profile) {
    const bmr = this.calcBMR(profile);
    return Math.round(bmr * (this.activityMultipliers[profile.activityBase] || 1.55));
  },

  calcTargets(profile, workouts) {
    const tdee = this.calcTDEE(profile);
    // Add workout calories
    const workoutCals = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
    const totalNeeds = tdee + workoutCals;

    // Macro splits based on goal
    let carbPct, protPct, fatPct;
    switch (profile.goal) {
      case 'endurance':
        carbPct = 0.55; protPct = 0.20; fatPct = 0.25; break;
      case 'strength':
        carbPct = 0.40; protPct = 0.30; fatPct = 0.30; break;
      case 'hybrid':
        carbPct = 0.48; protPct = 0.25; fatPct = 0.27; break;
      case 'weight_loss':
        carbPct = 0.40; protPct = 0.35; fatPct = 0.25;
        return {
          calories: Math.round(totalNeeds * 0.85),
          carbs: Math.round((totalNeeds * 0.85 * carbPct) / 4),
          protein: Math.round((totalNeeds * 0.85 * protPct) / 4),
          fat: Math.round((totalNeeds * 0.85 * fatPct) / 9),
        };
      default:
        carbPct = 0.48; protPct = 0.25; fatPct = 0.27;
    }

    return {
      calories: totalNeeds,
      carbs: Math.round((totalNeeds * carbPct) / 4),
      protein: Math.round((totalNeeds * protPct) / 4),
      fat: Math.round((totalNeeds * fatPct) / 9),
    };
  },

  sumMacros(meals) {
    return meals.reduce((acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      carbs: acc.carbs + (m.carbs || 0),
      protein: acc.protein + (m.protein || 0),
      fat: acc.fat + (m.fat || 0),
    }), { calories: 0, carbs: 0, protein: 0, fat: 0 });
  },

  // Estimate workout calories burned
  estimateCalories(type, duration, intensity) {
    // MET-based estimation
    const metMap = {
      run: { low: 7, mod: 9.5, high: 12 },
      bike: { low: 5.5, mod: 8, high: 11 },
      swim: { low: 5, mod: 7, high: 9 },
      hyrox: { low: 8, mod: 10, high: 13 },
      strength: { low: 3.5, mod: 5, high: 7 },
      yoga: { low: 2.5, mod: 3.5, high: 4 },
      hiit: { low: 7, mod: 9, high: 12 },
      walk: { low: 3, mod: 4, high: 5 },
      other: { low: 4, mod: 6, high: 8 },
    };
    const profile = this.getProfile();
    const weight = profile.weight || 75;
    const mets = metMap[type] || metMap.other;
    const met = intensity <= 3 ? mets.low : intensity <= 6 ? mets.mod : mets.high;
    return Math.round(met * weight * (duration / 60));
  },

  // ---- INSIGHTS ENGINE ----
  generateInsights(profile, todayMeals, todayWorkouts, targets) {
    const insights = [];
    const totals = this.sumMacros(todayMeals);
    const calPct = targets.calories > 0 ? totals.calories / targets.calories : 0;
    const carbPct = targets.carbs > 0 ? totals.carbs / targets.carbs : 0;
    const protPct = targets.protein > 0 ? totals.protein / targets.protein : 0;
    const hour = new Date().getHours();
    const hasWorkout = todayWorkouts.length > 0;
    const highIntensity = todayWorkouts.some(w => w.intensity >= 7);

    // Under-fueling
    if (hour >= 14 && calPct < 0.5) {
      insights.push({
        type: 'critical',
        icon: '⚡',
        title: 'Under-fueling alert',
        body: `You've only hit ${Math.round(calPct * 100)}% of your calorie target and it's already afternoon. Prioritize a calorie-dense meal or snack now.`,
      });
    }

    // Pre-workout carbs
    if (!hasWorkout && hour < 12 && (profile.goal === 'endurance' || profile.goal === 'hybrid')) {
      insights.push({
        type: 'info',
        icon: '🍌',
        title: 'Load up before your session',
        body: 'For endurance performance, aim for 1–1.5g carbs per kg bodyweight 2–3 hours before your workout.',
      });
    }

    // Post-workout protein
    if (hasWorkout && protPct < 0.4) {
      insights.push({
        type: 'warning',
        icon: '🥩',
        title: 'Protein window open',
        body: `You trained today but protein intake is at ${Math.round(protPct * 100)}% of target. Get 30–40g of protein in to support recovery.`,
      });
    }

    // High intensity — carb top-up
    if (highIntensity && carbPct < 0.6) {
      insights.push({
        type: 'warning',
        icon: '🔥',
        title: 'Replenish glycogen',
        body: `High-intensity session detected. Your carb intake (${Math.round(carbPct * 100)}%) is low — add fast carbs to restore glycogen stores.`,
      });
    }

    // On track
    if (calPct >= 0.7 && calPct <= 1.1 && protPct >= 0.7 && carbPct >= 0.7) {
      insights.push({
        type: 'positive',
        icon: '✅',
        title: "You're on track",
        body: 'Nutrition is well-balanced today. Keep it consistent through the rest of the day.',
      });
    }

    // Overeating
    if (calPct > 1.2) {
      insights.push({
        type: 'warning',
        icon: '📊',
        title: 'Calorie surplus',
        body: `You're at ${Math.round(calPct * 100)}% of your daily target. Unless you have a long session planned, consider lighter meals for the rest of the day.`,
      });
    }

    // No meals logged
    if (todayMeals.length === 0) {
      insights.push({
        type: 'info',
        icon: '📝',
        title: 'Start logging',
        body: 'Log your first meal today to get personalized fuel insights based on your training.',
      });
    }

    // Race goal
    if (profile.targetRace) {
      insights.push({
        type: 'info',
        icon: '🏁',
        title: `Training for: ${profile.targetRace}`,
        body: 'Your nutrition targets are optimized for your race goal. Consistency over 2–3 weeks is what drives adaptation.',
      });
    }

    return insights.slice(0, 4); // max 4 insights
  },

  // Week summary (last 7 days)
  getWeekData() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const meals = this.getDateMeals(dateStr);
      const workouts = this.getDateWorkouts(dateStr);
      const profile = this.getProfile();
      const targets = this.calcTargets(profile, workouts);
      const totals = this.sumMacros(meals);
      days.push({
        date: d,
        label: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()],
        isToday: i === 0,
        calories: totals.calories,
        target: targets.calories,
        hasWorkout: workouts.length > 0,
        pct: targets.calories > 0 ? Math.min(totals.calories / targets.calories, 1) : 0,
      });
    }
    return days;
  },
};
