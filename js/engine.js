/* FuelSync — Calculation Engine v2
 * Spec: weight × 30/35/40 kcal/kg | Carbs: 3-5/5-7/7-10 g/kg | Protein: 1.6/2.0/2.2 g/kg
 */

const ENGINE = {

  calMult: { light: 30, moderate: 35, hard: 40 },

  carbRange: {
    light:    { min: 3, max: 5,  mid: 4   },
    moderate: { min: 5, max: 7,  mid: 6   },
    hard:     { min: 7, max: 10, mid: 8.5 },
  },

  protNeeds: { general: 1.6, intense: 2.0, strength: 2.2 },

  protCategory: {
    endurance: 'general', hyrox: 'intense', marathon: 'general',
    general:   'general', strength: 'strength', weight_loss: 'intense', hybrid: 'intense',
  },

  calcTargets(weight, trainingLevel, goal) {
    const w    = parseFloat(weight) || 75;
    const lvl  = trainingLevel || 'moderate';
    const g    = goal || 'endurance';
    const cal  = Math.round(w * (this.calMult[lvl] || 35));
    const cRange  = this.carbRange[lvl] || this.carbRange.moderate;
    const carbs   = Math.round(w * cRange.mid);
    const carbMin = Math.round(w * cRange.min);
    const carbMax = Math.round(w * cRange.max);
    const pCat = this.protCategory[g] || 'general';
    const protG = this.protNeeds[pCat] || 1.6;
    const prot  = Math.round(w * protG);
    const fatCal = Math.max(cal - carbs * 4 - prot * 4, 0);
    const fat  = Math.round(fatCal / 9);
    return { cal, carbs, prot, fat, carbMin, carbMax, protG, cRange, pCat, lvl };
  },

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
    const w    = parseFloat(weightKg) || 75;
    const mets = this.MET[type] || this.MET.other;
    return Math.round((mets[level] || mets.moderate) * w * (durationMin / 60));
  },

  macroImpact(level, goal, weight) {
    const t = this.calcTargets(weight, level, goal);
    return `Carbs ${t.carbMin}–${t.carbMax}g (${t.cRange.min}–${t.cRange.max}g/kg) · Protein ${t.prot}g (${t.protG}g/kg)`;
  },

  generateInsights(profile, meals, workouts, targets, totals) {
    const ins = [];
    const w   = profile.weight || 75;
    const h   = new Date().getHours();
    const hasWo = workouts.length > 0;
    const lvl = hasWo
      ? (['hard','moderate','light'].find(l => workouts.some(wo => wo.level === l)) || 'moderate')
      : (profile.trainingLevel || 'moderate');
    const hiTraining = lvl === 'hard';
    const isHyrox    = profile.goal === 'hyrox' || profile.goal === 'hybrid';
    const isMarathon = profile.goal === 'marathon' || profile.goal === 'endurance';
    const calPct  = targets.cal   > 0 ? totals.cal   / targets.cal   : 0;
    const carbPct = targets.carbs > 0 ? totals.carbs / targets.carbs : 0;
    const protPct = targets.prot  > 0 ? totals.prot  / targets.prot  : 0;
    const deficit  = Math.round(targets.cal   - totals.cal);
    const carbGap  = Math.round(targets.carbs - totals.carbs);

    if (h >= 14 && calPct < 0.5)
      ins.push({ t:'critical', i:'warning', title:'Under-fueling alert',
        body:`Only ${Math.round(calPct*100)}% of calories by afternoon. Need ~${deficit} kcal more. Eat now.` });

    if (!hasWo && h >= 6 && h < 11 && (isMarathon || isHyrox))
      ins.push({ t:'info', i:'nutrition', title:'Pre-session carb load',
        body:`Aim for ${Math.round(w)}–${Math.round(w*1.5)}g carbs 2–3h before your session.` });

    if (hasWo && protPct < 0.4)
      ins.push({ t:'warning', i:'exercise', title:'Protein window open',
        body:`Protein at ${Math.round(totals.prot)}g of ${targets.prot}g target (${targets.protG}g/kg). Get 30–40g in now.` });

    if (hiTraining && carbPct < 0.5)
      ins.push({ t:'warning', i:'speed', title:'Glycogen depletion risk',
        body:`Hard session but carbs at ${Math.round(totals.carbs)}g of ${targets.carbs}g. Add ${carbGap}g fast carbs (rice, oats, banana).` });

    if (isHyrox && hasWo && (carbPct < 0.6 || protPct < 0.6))
      ins.push({ t:'warning', i:'fitness_center', title:'HYROX dual-fuel gap',
        body:`Carbs: ${Math.round(totals.carbs)}/${targets.carbs}g · Protein: ${Math.round(totals.prot)}/${targets.prot}g. Don't sacrifice either.` });

    if (isMarathon && lvl === 'hard' && carbPct < 0.7)
      ins.push({ t:'warning', i:'directions_run', title:'Long run fueling',
        body:`Need ${targets.carbMin}–${targets.carbMax}g carbs. You're ${carbGap}g short.` });

    if (calPct >= 0.75 && calPct <= 1.1 && protPct >= 0.75 && carbPct >= 0.75)
      ins.push({ t:'positive', i:'check_circle', title:'Dialled in',
        body:'Calories, carbs & protein all on track today. Keep it consistent.' });

    if (calPct > 1.15 && !hiTraining)
      ins.push({ t:'warning', i:'monitoring', title:'Calorie surplus',
        body:`At ${Math.round(totals.cal)} kcal vs ${targets.cal} target. Consider lighter meals.` });

    if (meals.length === 0)
      ins.push({ t:'info', i:'add_circle', title:'Start logging',
        body:`Log your first meal to unlock coaching for your ${w}kg bodyweight.` });

    if (profile.targetRace)
      ins.push({ t:'info', i:'sports_score', title:`Training for: ${profile.targetRace}`,
        body:'Consistency across weeks drives race-day performance.' });

    return ins.slice(0, 4);
  },

  weekConsistency(weekData) {
    const logged = weekData.filter(d => d.cal > 0).length;
    const woDays = weekData.filter(d => d.hasWo).length;
    const avgCal = logged > 0
      ? Math.round(weekData.filter(d => d.cal > 0).reduce((s, d) => s + d.cal, 0) / logged)
      : 0;
    const calHitDays = weekData.filter(d => d.cal > 0 && d.pct >= 0.8 && d.pct <= 1.15).length;
    const score = Math.round((logged / 7) * 40 + (woDays / 7) * 30 + (calHitDays / 7) * 30);
    return { logged, woDays, avgCal, score };
  },
};
