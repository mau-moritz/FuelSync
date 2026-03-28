/* FuelSync — Data Layer (localStorage)
 * Depends on: engine.js
 */

//  DATA LAYER — localStorage persistence
// ═══════════════════════════════════════════════════════════════════════════
const FS = {
  K: { p:'fs_profile', l:'fs_logs', w:'fs_workouts' },

  defP: () => ({
    name:'', age:25, weight:75, height:175, sex:'male',
    goal:'endurance',          // endurance | marathon | hyrox | strength | weight_loss
    trainingLevel:'moderate',  // light | moderate | hard  ← primary driver
    activityBase:'moderate',   // kept for TDEE fallback
    targetRace:'', onboarded:false,
  }),

  getP()  { const r=localStorage.getItem(this.K.p); return r?{...this.defP(),...JSON.parse(r)}:this.defP(); },
  saveP(d){ localStorage.setItem(this.K.p, JSON.stringify(d)); },

  getLogs()   { const r=localStorage.getItem(this.K.l); return r?JSON.parse(r):[]; },
  saveLogs(l) { localStorage.setItem(this.K.l, JSON.stringify(l)); },
  addMeal(m)  { const l=this.getLogs(); m.id=Date.now()+''; m.ts=new Date().toISOString(); l.push(m); this.saveLogs(l); return m; },
  delMeal(id) { this.saveLogs(this.getLogs().filter(l=>l.id!==id)); },
  dateMeals(d){ return this.getLogs().filter(l=>new Date(l.ts).toDateString()===d); },
  todayMeals(){ return this.dateMeals(new Date().toDateString()); },

  getWos()    { const r=localStorage.getItem(this.K.w); return r?JSON.parse(r):[]; },
  saveWos(w)  { localStorage.setItem(this.K.w, JSON.stringify(w)); },
  addWo(w)    { const ws=this.getWos(); w.id=Date.now()+''; w.ts=new Date().toISOString(); ws.push(w); this.saveWos(ws); return w; },
  delWo(id)   { this.saveWos(this.getWos().filter(w=>w.id!==id)); },
  dateWos(d)  { return this.getWos().filter(w=>new Date(w.ts).toDateString()===d); },
  todayWos()  { return this.dateWos(new Date().toDateString()); },

  // Sum macros from meal array
  sum(meals) {
    return meals.reduce((a,m)=>({
      cal:   a.cal   + (m.calories||0),
      carbs: a.carbs + (m.carbs||0),
      prot:  a.prot  + (m.protein||0),
      fat:   a.fat   + (m.fat||0),
    }), {cal:0,carbs:0,prot:0,fat:0});
  },

  // Get targets for a specific date (uses workouts logged that day)
  targetsForDate(dateStr) {
    const p = this.getP();
    const ws = this.dateWos(dateStr);
    // Use the hardest training level of that day's workouts, or profile default
    const lvl = ws.length > 0
      ? (['hard','moderate','light'].find(l => ws.some(w=>w.level===l)) || p.trainingLevel)
      : p.trainingLevel;
    return ENGINE.calcTargets(p.weight, lvl, p.goal);
  },

  // 7-day week data
  weekData() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const meals = this.dateMeals(ds);
      const ws = this.dateWos(ds);
      const t = this.targetsForDate(ds);
      const tot = this.sum(meals);
      days.push({
        date: d,
        label: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()],
        isToday: i===0,
        cal: tot.cal, prot: tot.prot, carbs: tot.carbs,
        tgt: t.cal, hasWo: ws.length>0,
        level: ws.length>0 ? (ws.find(w=>w.level==='hard')?'hard':ws.find(w=>w.level==='moderate')?'moderate':'light') : null,
        pct: t.cal>0 ? Math.min(tot.cal/t.cal, 1) : 0,
      });
    }
    return days;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
