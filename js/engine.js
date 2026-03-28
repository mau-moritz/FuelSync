/* FuelSync — Calculation Engine
 * Spec: weight × 30/35/40 kcal/kg
 *       Carbs: 3-5 / 5-7 / 7-10 g/kg
 *       Protein: 1.6 / 2.0 / 2.2 g/kg
 */

const ENGINE = {

  // ── TRAINING LEVEL CONSTANTS (the core of the spec) ──────────────────────
  // Calorie multiplier per kg bodyweight
  calMult: { light: 30, moderate: 35, hard: 40 },

  // Carbohydrate needs (g per kg bodyweight)
  carbRange: {
    light:    { min: 3, max: 5,  mid: 4   },
    moderate: { min: 5, max: 7,  mid: 6   },
    hard:     { min: 7, max: 10, mid: 8.5 },
  },

  // Protein needs (g per kg bodyweight)
  protNeeds: {
    general:   1.6,   // endurance / general
    intense:   2.0,   // hard training / HYROX
    strength:  2.2,   // strength focus
  },

  // Goal-specific protein category
  protCategory: {
    endurance:   'general',
    hyrox:       'intense',
    marathon:    'general',
    general:     'general',
    strength:    'strength',
    weight_loss: 'intense',
    hybrid:      'intense',
  },

  // ── DAILY TARGETS ────────────────────────────────────────────────────────
  // Given: weight (kg), trainingLevel (light|moderate|hard), goal
  // Returns: { cal, carbs, prot, fat, carbMin, carbMax, protG }
  calcTargets(weight, trainingLevel, goal) {
    const w = parseFloat(weight) || 75;
    const lvl = trainingLevel || 'moderate';
    const g = goal || 'endurance';

    // Calories: weight × multiplier
    const cal = Math.round(w * (this.calMult[lvl] || 35));

    // Carbs: g/kg × weight (use midpoint for target, show range)
    const cRange = this.carbRange[lvl] || this.carbRange.moderate;
    const carbs = Math.round(w * cRange.mid);
    const carbMin = Math.round(w * cRange.min);
    const carbMax = Math.round(w * cRange.max);

    // Protein: g/kg × weight
    const pCat = this.protCategory[g] || 'general';
    const protG = this.protNeeds[pCat] || 1.6;
    const prot = Math.round(w * protG);

    // Fat: fill remaining calories
    const carbCal = carbs * 4;
    const protCal = prot * 4;
    const fatCal = Math.max(cal - carbCal - protCal, 0);
    const fat = Math.round(fatCal / 9);

    return { cal, carbs, prot, fat, carbMin, carbMax, protG, cRange, pCat, lvl };
  },

  // ── WORKOUT CALORIE ESTIMATE (MET-based) ─────────────────────────────────
  // level: 'light' | 'moderate' | 'hard'
  MET: {
    run:      { light: 7,   moderate: 9.5, hard: 12  },
    bike:     { light: 5.5, moderate: 8,   hard: 11  },
    swim:     { light: 5,   moderate: 7,   hard: 9   },
    hyrox:    { light: 7,   moderate: 10,  hard: 13  },
    strength: { light: 3.5, moderate: 5,   hard: 7   },
    hiit:     { light: 7,   moderate: 9,   hard: 12  },
    yoga:     { light: 2.5, moderate: 3.5, hard: 4   },
    walk:     { light: 3,   moderate: 4,   hard: 5   },
    other:    { light: 4,   moderate: 6,   hard: 8   },
  },

  estWorkoutCal(type, durationMin, level, weightKg) {
    const w = parseFloat(weightKg) || 75;
    const mets = this.MET[type] || this.MET.other;
    const met = mets[level] || mets.moderate;
    return Math.round(met * w * (durationMin / 60));
  },

  // ── MACRO IMPACT DESCRIPTION ─────────────────────────────────────────────
  macroImpact(level, goal, weight) {
    const t = this.calcTargets(weight, level, goal);
    const descs = {
      light:    `Carb target: ${t.carbMin}–${t.carbMax}g (${t.cRange.min}–${t.cRange.max}g/kg) · Protein: ${t.prot}g`,
      moderate: `Carb target: ${t.carbMin}–${t.carbMax}g (${t.cRange.min}–${t.cRange.max}g/kg) · Protein: ${t.prot}g`,
      hard:     `Carb target: ${t.carbMin}–${t.carbMax}g (${t.cRange.min}–${t.cRange.max}g/kg) · Protein: ${t.prot}g`,
    };
    return descs[level] || descs.moderate;
  },

  // ── INSIGHTS ENGINE ──────────────────────────────────────────────────────
  // Returns array of insight objects with priority ordering
  generateInsights(profile, meals, workouts, targets, totals) {
    const ins = [];
    const w = profile.weight || 75;
    const h = new Date().getHours();
    const hasWo = workouts.length > 0;
    const lvl = workouts.length > 0 ? (workouts[workouts.length-1].level || 'moderate') : (profile.activityBase || 'moderate');
    const hiTraining = lvl === 'hard' || workouts.some(wo => wo.level === 'hard');
    const isHyrox = profile.goal === 'hyrox' || profile.goal === 'hybrid';
    const isMarathon = profile.goal === 'marathon' || profile.goal === 'endurance';

    const calPct  = targets.cal   > 0 ? totals.cal   / targets.cal   : 0;
    const carbPct = targets.carbs > 0 ? totals.carbs / targets.carbs : 0;
    const protPct = targets.prot  > 0 ? totals.prot  / targets.prot  : 0;

    const deficit = Math.round(targets.cal - totals.cal);
    const carbGap = Math.round(targets.carbs - totals.carbs);

    // 1. Critical: afternoon under-fueling
    if (h >= 14 && calPct < 0.5)
      ins.push({ t:'critical', i:'warning', title:'Under-fueling alert',
        body:`Only ${Math.round(calPct*100)}% of daily calories by afternoon. You need ~${deficit} kcal more. Eat a balanced meal now.` });

    // 2. Morning pre-session carb advice
    if (!hasWo && h >= 6 && h < 11 && (isMarathon || isHyrox))
      ins.push({ t:'info', i:'nutrition', title:'Pre-session carb load',
        body:`Aim for ${Math.round(w*1)}–${Math.round(w*1.5)}g carbs 2–3h before your session (${Math.round(w)}–${Math.round(w*1.5)}g for your ${w}kg bodyweight).` });

    // 3. Post-workout protein window
    if (hasWo && protPct < 0.4)
      ins.push({ t:'warning', i:'exercise', title:'Protein window open',
        body:`You've trained but protein is only ${Math.round(totals.prot)}g of your ${targets.prot}g target (${targets.protG}g/kg). Get 30–40g in within 30 minutes.` });

    // 4. Hard session carb replenishment
    if (hiTraining && carbPct < 0.5)
      ins.push({ t:'warning', i:'speed', title:'Glycogen depletion risk',
        body:`Hard session detected but carbs at only ${Math.round(totals.carbs)}g of ${targets.carbs}g target. Add ${carbGap}g fast carbs (rice, banana, oats) to restore glycogen.` });

    // 5. HYROX-specific dual fuel
    if (isHyrox && hasWo && (carbPct < 0.6 || protPct < 0.6))
      ins.push({ t:'warning', i:'fitness_center', title:'HYROX dual-fuel gap',
        body:`HYROX demands both high carbs AND protein. Carbs: ${Math.round(totals.carbs)}/${targets.carbs}g · Protein: ${Math.round(totals.prot)}/${targets.prot}g. Don't sacrifice either.` });

    // 6. Marathon long-run fuel
    if (isMarathon && lvl === 'hard' && carbPct < 0.7)
      ins.push({ t:'warning', i:'directions_run', title:'Long run fueling',
        body:`Marathon training at hard effort requires ${targets.carbMin}–${targets.carbMax}g carbs (${targets.cRange.min}–${targets.cRange.max}g/kg). You're ${carbGap}g short.` });

    // 7. On track — positive reinforcement
    if (calPct >= 0.75 && calPct <= 1.1 && protPct >= 0.75 && carbPct >= 0.75)
      ins.push({ t:'positive', i:'check_circle', title:'Dialled in',
        body:`Calories, carbs & protein all on track today. Consistent fueling like this drives performance over weeks.` });

    // 8. Calorie surplus
    if (calPct > 1.15 && !hiTraining)
      ins.push({ t:'warning', i:'monitoring', title:'Calorie surplus',
        body:`At ${Math.round(totals.cal)} kcal vs ${targets.cal} target. Unless you have a hard session planned, consider lighter meals.` });

    // 9. No meals logged yet
    if (meals.length === 0)
      ins.push({ t:'info', i:'add_circle', title:'Start logging',
        body:`Log your first meal to unlock personalized fuel coaching based on your ${w}kg bodyweight and ${lvl} training day.` });

    // 10. Race goal reminder
    if (profile.targetRace)
      ins.push({ t:'info', i:'sports_score', title:`Training for: ${profile.targetRace}`,
        body:`Your daily targets are calculated for your bodyweight (${w}kg) and current training level. Consistency across weeks drives race-day performance.` });

    return ins.slice(0, 4);
  },

  // ── WEEK SUMMARY ─────────────────────────────────────────────────────────
  weekConsistency(weekData) {
    const logged = weekData.filter(d => d.cal > 0).length;
    const woDays = weekData.filter(d => d.hasWo).length;
    const avgCal = logged > 0
      ? Math.round(weekData.filter(d=>d.cal>0).reduce((s,d)=>s+d.cal,0)/logged)
      : 0;
    const avgProt = logged > 0
      ? Math.round(weekData.filter(d=>d.prot>0).reduce((s,d)=>s+d.prot,0)/Math.max(weekData.filter(d=>d.prot>0).length,1))
      : 0;
    // Score: 50% logging, 30% workout days, 20% calorie hitting
    const calHitDays = weekData.filter(d => d.cal > 0 && d.pct >= 0.8 && d.pct <= 1.15).length;
    const score = Math.round((logged/7)*40 + (woDays/7)*30 + (calHitDays/7)*30);
    return { logged, woDays, avgCal, avgProt, score };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
