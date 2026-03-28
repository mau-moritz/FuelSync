/* FuelSync — App Controller
 * Depends on: engine.js, data.js, meals-db.js
 *
 * FIXES applied:
 *  1. Removed duplicate DOMContentLoaded listener
 *  2. Tab 2 renamed from "Training" to "Log" — holds food + workouts (Daily Log)
 *  3. Past-day meal/workout logging now stamps the correct date (not always today)
 *  4. Meal DB search integrated into Log Meal modal
 *  5. saveOnboarding duplicate assignment removed
 */

const App = {
  cur: 'dashboard',
  _tt: null,
  logDateOffset: 0,   // 0 = today, -1 = yesterday, etc.
  _mealDbOpen: false, // meal DB panel state

  // ── INIT ──────────────────────────────────────────────────────────────────
  init() {
    document.querySelectorAll('.nav-btn,.sidebar-btn,.drawer-nav').forEach(b => {
      b.addEventListener('click', () => this.navigate(b.dataset.page));
    });
    document.getElementById('menu-btn').addEventListener('click', () => this.openDrawer());
    document.getElementById('header-profile-btn').addEventListener('click', () => this.navigate('profile'));
    if (!FS.getP().onboarded) {
      setTimeout(() => document.getElementById('modal-onboarding').classList.add('open'), 350);
    }
    this.updateDate();
    this.renderDashboard();
  },

  // ── NAVIGATION ────────────────────────────────────────────────────────────
  navigate(page) {
    if (!page) return;
    this.cur = page;
    this.closeDrawer();
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    ({
      dashboard: () => this.renderDashboard(),
      log:       () => this.renderLog(),
      fuel:      () => this.renderFuel(),
      profile:   () => this.renderProfile(),
    })[page]?.();
    window.scrollTo(0, 0);
  },

  openDrawer()  { document.getElementById('drawer-overlay').classList.add('open'); },
  closeDrawer() { document.getElementById('drawer-overlay').classList.remove('open'); },

  updateDate() {
    const now  = new Date();
    const days  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const mons  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const el    = document.getElementById('dash-date-label');
    if (el) el.textContent = `${days[now.getDay()].toUpperCase()} ${now.getDate()} ${mons[now.getMonth()].toUpperCase()}`;
  },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), 2600);
  },

  setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; },

  setPct(id, pct) {
    const e = document.getElementById(id);
    if (!e) return;
    const c = Math.min(Math.max(pct, 0), 100);
    e.style.width = c + '%';
    e.classList.toggle('glow', c > 3);
  },

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  renderDashboard() {
    const p    = FS.getP();
    const meals = FS.todayMeals();
    const ws   = FS.todayWos();
    const lvl  = ws.length > 0
      ? (['hard','moderate','light'].find(l => ws.some(w => w.level === l)) || p.trainingLevel)
      : p.trainingLevel;
    const tgt  = ENGINE.calcTargets(p.weight, lvl, p.goal);
    const tot  = FS.sum(meals);

    const h  = new Date().getHours();
    const gr = h < 5 ? 'Night Owl' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
    this.setText('dash-greeting', `${gr}, ${(p.name || 'Athlete').split(' ')[0]}.`);
    this.setText('dash-hero-cal', Math.round(tot.cal));
    this.setText('dash-hero-target', `of ${tgt.cal} kcal`);
    this.setPct('dash-cal-bar', (tot.cal / (tgt.cal || 1)) * 100);

    this.setText('dash-carbs-val', Math.round(tot.carbs));
    this.setText('dash-carbs-tgt', `/ ${tgt.carbs}g`);
    this.setPct('bar-carbs', (tot.carbs / (tgt.carbs || 1)) * 100);

    this.setText('dash-prot-val', Math.round(tot.prot));
    this.setText('dash-prot-tgt', `/ ${tgt.prot}g`);
    this.setPct('bar-prot', (tot.prot / (tgt.prot || 1)) * 100);

    this.setText('dash-fat-val', Math.round(tot.fat));
    this.setText('dash-fat-tgt', `/ ${tgt.fat}g`);
    this.setPct('bar-fat', (tot.fat / (tgt.fat || 1)) * 100);

    this.setText('dash-meal-count', meals.length);
    this.setText('dash-wo-count', ws.length);
    this.setText('dash-burned', ws.reduce((s, w) => s + (w.cal || 0), 0));

    // Training level badge
    const lvlEl = document.getElementById('dash-training-level');
    if (lvlEl) {
      const bg  = { light: 'rgba(59,232,176,.1)', moderate: 'rgba(244,255,200,.1)', hard: 'rgba(255,115,81,.1)' };
      const col = { light: '#3be8b0', moderate: '#f4ffc8', hard: '#ff7351' };
      lvlEl.textContent  = lvl.charAt(0).toUpperCase() + lvl.slice(1) + ' day';
      lvlEl.style.background = bg[lvl] || bg.moderate;
      lvlEl.style.color      = col[lvl] || col.moderate;
    }
    const cRangeEl = document.getElementById('dash-carb-range');
    if (cRangeEl) cRangeEl.textContent = `${tgt.carbMin}–${tgt.carbMax}g target range`;

    this.renderWeekChart('dash-week-chart', 'dash-week-labels');
    const insights = ENGINE.generateInsights(p, meals, ws, tgt, tot);
    document.getElementById('dash-insights').innerHTML = insights.slice(0, 2).map(i => this.insightHTML(i)).join('');
  },

  // ── DAILY LOG (tab renamed from "Training" to "Log") ──────────────────────
  // Returns an ISO string for midnight of the currently-viewed log day.
  // Using noon avoids any TZ edge-cases when we only need the date.
  logISOForViewedDay() {
    const d = new Date();
    d.setDate(d.getDate() + this.logDateOffset);
    // Set to noon local time so toDateString() is always correct
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  },

  logDateStr() {
    const d = new Date();
    d.setDate(d.getDate() + this.logDateOffset);
    return d.toDateString();
  },

  shiftLogDate(delta) {
    const next = this.logDateOffset + delta;
    if (next > 0) return;   // can't navigate into the future
    this.logDateOffset = next;
    this.renderLog();
  },

  renderLog() {
    const ds        = this.logDateStr();
    const d         = new Date(ds);
    const isToday   = this.logDateOffset === 0;
    const isYest    = this.logDateOffset === -1;
    const dayNames  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    this.setText('log-date-label', isToday ? 'Today' : isYest ? 'Yesterday' : dayNames[d.getDay()]);
    this.setText('log-date-sub', d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));

    // Disable future button
    const nextBtn = document.getElementById('log-date-next');
    if (nextBtn) { nextBtn.disabled = isToday; nextBtn.style.opacity = isToday ? '0.3' : '1'; }

    const meals = FS.dateMeals(ds);
    const ws    = FS.dateWos(ds);
    const p     = FS.getP();
    const lvl   = ws.length > 0
      ? (['hard','moderate','light'].find(l => ws.some(w => w.level === l)) || p.trainingLevel)
      : p.trainingLevel;
    const tgt = ENGINE.calcTargets(p.weight, lvl, p.goal);
    const tot = FS.sum(meals);

    // Day summary strip — shown only when there is data
    const summEl = document.getElementById('log-day-summary');
    if (summEl) {
      if (meals.length > 0 || ws.length > 0) {
        const calPct  = tgt.cal   > 0 ? Math.min((tot.cal   / tgt.cal)   * 100, 100) : 0;
        const carbPct = tgt.carbs > 0 ? Math.min((tot.carbs / tgt.carbs) * 100, 100) : 0;
        const protPct = tgt.prot  > 0 ? Math.min((tot.prot  / tgt.prot)  * 100, 100) : 0;
        summEl.innerHTML = [
          { label: 'Calories', val: `${Math.round(tot.cal)} / ${tgt.cal}`,   sub: 'kcal',                            pct: calPct,  col: '#f4ffc8' },
          { label: 'Carbs',    val: `${Math.round(tot.carbs)} / ${tgt.carbs}`, sub: `g · range ${tgt.carbMin}–${tgt.carbMax}g`, pct: carbPct, col: '#f4ffc8' },
          { label: 'Protein',  val: `${Math.round(tot.prot)} / ${tgt.prot}`, sub: `g · ${tgt.protG}g/kg`,           pct: protPct, col: '#ff7351' },
        ].map(s => `
          <div class="bg-surface-container rounded-xl p-3">
            <p class="font-label text-[9px] text-on-surface-variant uppercase tracking-widest mb-1">${s.label}</p>
            <p class="font-headline font-bold text-sm">${s.val}</p>
            <p class="font-label text-[9px] text-on-surface-variant mt-0.5">${s.sub}</p>
            <div class="progress-track h-1 bg-surface-container-highest rounded-full mt-2">
              <div class="progress-fill rounded-full" style="width:${s.pct}%;background:${s.col}"></div>
            </div>
          </div>`).join('');
      } else {
        summEl.innerHTML = '';
      }
    }

    // ── Food log ──────────────────────────────────────────────────────────
    const mEl = document.getElementById('log-meals-list');
    mEl.innerHTML = meals.length
      ? meals.map(m => this.mealHTML(m, true)).join('')
      : this.emptyHTML('restaurant', 'No meals logged', isToday ? 'Tap + Meal to log food' : 'No meals on this day');

    // ── Workout log ───────────────────────────────────────────────────────
    const wEl = document.getElementById('log-workouts-list');
    wEl.innerHTML = ws.length
      ? ws.map(w => this.woHTML(w, true)).join('')
      : this.emptyHTML('fitness_center', 'No sessions logged', isToday ? 'Tap + Workout to log training' : 'No training on this day');
  },

  // ── FUEL / INSIGHTS ───────────────────────────────────────────────────────
  renderFuel() {
    const p    = FS.getP();
    const meals = FS.todayMeals();
    const ws   = FS.todayWos();
    const lvl  = ws.length > 0
      ? (['hard','moderate','light'].find(l => ws.some(w => w.level === l)) || p.trainingLevel)
      : p.trainingLevel;
    const tgt  = ENGINE.calcTargets(p.weight, lvl, p.goal);
    const tot  = FS.sum(meals);

    const insights = ENGINE.generateInsights(p, meals, ws, tgt, tot);
    document.getElementById('insights-list').innerHTML = insights.map(i => this.insightHTML(i)).join('');

    // Macro breakdown card
    const mbEl = document.getElementById('fuel-macro-breakdown');
    if (mbEl) {
      mbEl.innerHTML = [
        { label: 'Daily Calories', formula: `${p.weight}kg × ${ENGINE.calMult[lvl]} kcal/kg`, result: `${tgt.cal} kcal`, note: `${lvl.charAt(0).toUpperCase() + lvl.slice(1)} training day`, col: '#f4ffc8' },
        { label: 'Carbohydrates',  formula: `${tgt.cRange.min}–${tgt.cRange.max}g/kg × ${p.weight}kg`, result: `${tgt.carbMin}–${tgt.carbMax}g`, note: `Target: ${tgt.carbs}g/day`, col: '#f4ffc8' },
        { label: 'Protein',        formula: `${tgt.protG}g/kg × ${p.weight}kg`, result: `${tgt.prot}g`, note: `${tgt.pCat === 'intense' ? 'Intense/HYROX' : tgt.pCat === 'strength' ? 'Strength' : 'General endurance'} protocol`, col: '#ff7351' },
        { label: 'Fat',            formula: `Remaining calories ÷ 9`, result: `${tgt.fat}g`, note: `~${Math.round(tgt.fat * 9)} kcal from fat`, col: '#ffeeab' },
      ].map(r => `
        <div class="flex items-start justify-between gap-4 py-3" style="border-bottom:1px solid rgba(72,72,71,.15)">
          <div class="min-w-0">
            <p class="font-headline font-bold text-sm" style="color:${r.col}">${r.label}</p>
            <p class="font-label text-[10px] text-on-surface-variant mt-0.5 uppercase tracking-wide">${r.formula}</p>
            <p class="font-label text-[10px] mt-0.5" style="color:${r.col};opacity:.6">${r.note}</p>
          </div>
          <p class="font-headline font-bold text-lg shrink-0" style="color:${r.col}">${r.result}</p>
        </div>`).join('');
    }

    // Goal tip
    const tips = {
      endurance:   { t:'info', i:'directions_run', title:'Endurance Protocol', body:`Targets: ${tgt.cRange.min}–${tgt.cRange.max}g carbs/kg · ${tgt.protG}g protein/kg. On long run days hit ${tgt.carbMax}g carbs minimum.` },
      marathon:    { t:'info', i:'directions_run', title:'Marathon Protocol',  body:`Carb-load 2–3 days before long runs. Race week: target 10g/kg. Protein ${tgt.prot}g/day maintains muscle.` },
      hyrox:       { t:'info', i:'fitness_center', title:'HYROX Protocol',    body:`Dual fuel required: ${tgt.prot}g protein (${tgt.protG}g/kg) AND ${tgt.carbs}g carbs. Never compromise either.` },
      hybrid:      { t:'info', i:'fitness_center', title:'Hybrid Protocol',   body:`${tgt.prot}g protein (${tgt.protG}g/kg) AND ${tgt.carbs}g carbs. Both are non-negotiable.` },
      strength:    { t:'info', i:'exercise',       title:'Strength Protocol', body:`${tgt.prot}g protein/day (${tgt.protG}g/kg). Time 30–40g around training. Carbs (${tgt.carbs}g) fuel the session.` },
      weight_loss: { t:'info', i:'monitoring',     title:'Performance Cut',   body:`${tgt.cal} kcal keeps performance while creating a deficit. Protein ${tgt.prot}g protects muscle. Never go below ${tgt.carbMin}g carbs.` },
    };
    document.getElementById('goal-tip').innerHTML = this.insightHTML(tips[p.goal] || tips.endurance);

    // 7-day stats
    const week  = FS.weekData();
    const stats = ENGINE.weekConsistency(week);
    this.setText('week-days-logged',  stats.logged);
    this.setText('week-avg-cal',      stats.avgCal || '—');
    this.setText('week-workout-days', stats.woDays);
    this.setText('consistency-score', stats.score);
    this.setPct('consistency-bar', stats.score);
    this.renderWeekChart('insights-week-chart', 'insights-week-labels');
  },

  // ── PROFILE ───────────────────────────────────────────────────────────────
  renderProfile() {
    const p = FS.getP();
    document.getElementById('prof-name').value     = p.name        || '';
    document.getElementById('prof-age').value      = p.age         || '';
    document.getElementById('prof-weight').value   = p.weight      || '';
    document.getElementById('prof-height').value   = p.height      || '';
    document.getElementById('prof-sex').value      = p.sex         || 'male';
    document.getElementById('prof-goal').value     = p.goal        || 'endurance';
    document.getElementById('prof-activity').value = p.activityBase || 'moderate';
    document.getElementById('prof-race').value     = p.targetRace  || '';
    this.selectProfLevel(p.trainingLevel || 'moderate', false);

    const goalLabels = {
      endurance: 'Endurance Athlete', marathon: 'Marathon Runner',
      hyrox: 'HYROX Athlete', hybrid: 'HYROX Hybrid',
      strength: 'Strength Athlete', weight_loss: 'Performance Cut',
    };
    this.setText('prof-display-name', (p.name || 'Athlete').toUpperCase());
    this.setText('prof-display-goal', goalLabels[p.goal] || 'Set your goal');

    const tgt = ENGINE.calcTargets(p.weight, p.trainingLevel || 'moderate', p.goal);
    this.setText('prof-tdee-display', `${tgt.cal} KCAL / DAY`);
    this.setText('prof-macro-display', `C: ${tgt.carbMin}–${tgt.carbMax}g · P: ${tgt.prot}g (${tgt.protG}g/kg) · F: ${tgt.fat}g`);
  },

  selectProfLevel(level, save = true) {
    document.querySelectorAll('.prof-level-btn').forEach(b => {
      const active = b.dataset.level === level;
      b.style.background = active ? '#f4ffc8' : '#262626';
      b.style.color      = active ? '#536600' : '#adaaaa';
    });
    if (save) {
      const p = FS.getP();
      p.trainingLevel = level;
      FS.saveP(p);
      this.renderProfile();
      this.renderDashboard();
      this.toast(`Training level → ${level.charAt(0).toUpperCase() + level.slice(1)}`);
    }
  },

  saveProfile() {
    const p = FS.getP();
    p.name         = document.getElementById('prof-name').value.trim()         || 'Athlete';
    p.age          = parseInt(document.getElementById('prof-age').value)        || 25;
    p.sex          = document.getElementById('prof-sex').value;
    p.weight       = parseFloat(document.getElementById('prof-weight').value)   || 75;
    p.height       = parseInt(document.getElementById('prof-height').value)     || 175;
    p.goal         = document.getElementById('prof-goal').value;
    p.activityBase = document.getElementById('prof-activity').value;
    p.targetRace   = document.getElementById('prof-race').value.trim();
    p.onboarded    = true;
    FS.saveP(p);
    this.toast('✓ Profile updated');
    this.renderProfile();
    this.renderDashboard();
  },

  clearAllData() {
    if (confirm('Clear ALL data? Cannot be undone.')) { localStorage.clear(); location.reload(); }
  },

  toggleMetric(btn) {
    const on = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', String(!on));
    btn.style.background = on ? '#45474c' : '#f4ffc8';
    document.getElementById('metric-thumb').style.marginLeft = on ? '0' : 'auto';
    this.toast(on ? 'Imperial units (coming soon)' : 'Metric units active');
  },

  // ── ONBOARDING (FIX: removed duplicate assignment) ────────────────────────
  saveOnboarding() {
    const p = FS.getP();
    p.name          = document.getElementById('ob-name').value.trim()         || 'Athlete';
    p.sex           = document.getElementById('ob-sex').value;
    p.age           = parseInt(document.getElementById('ob-age').value)        || 25;
    p.weight        = parseFloat(document.getElementById('ob-weight').value)   || 75;
    p.height        = parseInt(document.getElementById('ob-height').value)     || 175;
    p.goal          = document.getElementById('ob-goal').value;
    p.trainingLevel = document.getElementById('ob-level').value;
    p.activityBase  = p.trainingLevel;
    p.targetRace    = document.getElementById('ob-race').value.trim();
    p.onboarded     = true;
    FS.saveP(p);
    document.getElementById('modal-onboarding').classList.remove('open');
    const tgt = ENGINE.calcTargets(p.weight, p.trainingLevel, p.goal);
    this.toast(`⚡ Targets: ${tgt.cal} kcal · ${tgt.carbs}g carbs · ${tgt.prot}g protein`);
    this.renderDashboard();
  },

  updateObTargets() {
    const w    = parseFloat(document.getElementById('ob-weight')?.value) || 0;
    const lvl  = document.getElementById('ob-level')?.value || 'moderate';
    const goal = document.getElementById('ob-goal')?.value  || 'endurance';
    const el   = document.getElementById('ob-targets-preview');
    if (!el) return;
    if (!w) { el.textContent = 'Enter your weight to preview targets'; return; }
    const tgt = ENGINE.calcTargets(w, lvl, goal);
    el.textContent = `${tgt.cal} kcal · Carbs ${tgt.carbMin}–${tgt.carbMax}g · Protein ${tgt.prot}g (${tgt.protG}g/kg)`;
  },

  // ── MEAL MODAL (with DB search) ───────────────────────────────────────────
  openMealModal() {
    document.getElementById('modal-meal').classList.add('open');
    this._mealDbOpen = false;
    this.renderMealDb('');   // show top 20 by default
    setTimeout(() => document.getElementById('meal-search')?.focus(), 350);
  },

  closeMealModal() {
    document.getElementById('modal-meal').classList.remove('open');
    ['meal-name','meal-cal','meal-carbs','meal-protein','meal-fat','meal-notes'].forEach(id => {
      const e = document.getElementById(id); if (e) e.value = '';
    });
    document.getElementById('meal-type').value  = 'breakfast';
    document.getElementById('meal-search').value = '';
    document.getElementById('meal-db-results').innerHTML = '';
    this._mealDbOpen = false;
  },

  // Populate a meal from the DB into the form fields
  selectDbMeal(idx) {
    const m = MEAL_DB[idx];
    if (!m) return;
    document.getElementById('meal-name').value    = m.name;
    document.getElementById('meal-type').value    = m.cat;
    document.getElementById('meal-cal').value     = m.cal;
    document.getElementById('meal-carbs').value   = m.carbs;
    document.getElementById('meal-protein').value = m.protein;
    document.getElementById('meal-fat').value     = m.fat;
    // Scroll to form
    document.getElementById('meal-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.toast('✓ Meal loaded — adjust portions if needed');
  },

  renderMealDb(query) {
    const results = MEAL_DB.search(query);
    const el = document.getElementById('meal-db-results');
    if (!el) return;
    if (!results.length) { el.innerHTML = '<p class="text-xs text-on-surface-variant text-center py-4">No matches found</p>'; return; }
    const catIcons = { breakfast:'light_mode', lunch:'wb_sunny', dinner:'bedtime', snack:'nutrition', pre_workout:'bolt', post_workout:'exercise' };
    el.innerHTML = results.map((m, i) => {
      const globalIdx = MEAL_DB.indexOf(m);
      return `<button onclick="App.selectDbMeal(${globalIdx})" class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-highest active:scale-95 transition-all">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background:rgba(244,255,200,.08)">
          <span class="material-symbols-outlined text-primary" style="font-size:15px">${catIcons[m.cat] || 'restaurant'}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-headline font-bold text-xs truncate">${m.name}</p>
          <p class="font-label text-[10px] text-on-surface-variant">${m.cal} kcal · C${m.carbs}g P${m.protein}g F${m.fat}g</p>
        </div>
      </button>`;
    }).join('');
  },

  // FIX: saveMeal now passes the viewed-day ISO date for past-day logging
  saveMeal() {
    const name = document.getElementById('meal-name').value.trim();
    if (!name) { this.toast('⚠ Add a meal name'); return; }
    const isoDate = this.logDateOffset === 0 ? undefined : this.logISOForViewedDay();
    FS.addMeal({
      name,
      mealType: document.getElementById('meal-type').value,
      calories: parseInt(document.getElementById('meal-cal').value)    || 0,
      carbs:    parseInt(document.getElementById('meal-carbs').value)   || 0,
      protein:  parseInt(document.getElementById('meal-protein').value) || 0,
      fat:      parseInt(document.getElementById('meal-fat').value)     || 0,
      notes:    document.getElementById('meal-notes').value.trim(),
    }, isoDate);
    this.closeMealModal();
    this.toast('✓ Meal logged');
    this.renderDashboard();
    if (this.cur === 'log') this.renderLog();
  },

  // ── WORKOUT MODAL ─────────────────────────────────────────────────────────
  _woLevel: 'moderate',

  openWorkoutModal() {
    this._woLevel = 'moderate';
    document.getElementById('modal-workout').classList.add('open');
    this.selectWoLevel('moderate');
  },

  closeWorkoutModal() {
    document.getElementById('modal-workout').classList.remove('open');
    document.getElementById('wo-duration').value = '';
    document.getElementById('wo-notes').value    = '';
    document.getElementById('wo-type').value     = 'run';
    this._woLevel = 'moderate';
    this.selectWoLevel('moderate');
  },

  selectWoLevel(level) {
    this._woLevel = level;
    document.querySelectorAll('.wo-level-btn').forEach(b => {
      const active = b.dataset.level === level;
      b.style.background = active ? '#f4ffc8' : '#262626';
      b.style.color      = active ? '#536600' : '#adaaaa';
    });
    const descs = {
      light:    'Easy / recovery — reduced calorie & carb targets',
      moderate: 'Standard training — balanced fuel targets',
      hard:     'Race pace / long session — maximum carb & calorie targets',
    };
    this.setText('wo-level-desc', descs[level] || descs.moderate);
    this.updateCalEstimate();
  },

  updateCalEstimate() {
    const type  = document.getElementById('wo-type')?.value || 'run';
    const dur   = parseInt(document.getElementById('wo-duration')?.value) || 30;
    const level = this._woLevel || 'moderate';
    const p     = FS.getP();
    this.setText('wo-cal-est',     `~${ENGINE.estWorkoutCal(type, dur, level, p.weight)} kcal estimated`);
    this.setText('wo-macro-impact', ENGINE.macroImpact(level, p.goal, p.weight));
  },

  // FIX: saveWorkout passes the viewed-day ISO date for past-day logging
  saveWorkout() {
    const dur = parseInt(document.getElementById('wo-duration').value);
    if (!dur || dur < 1) { this.toast('⚠ Enter duration in minutes'); return; }
    const type    = document.getElementById('wo-type').value;
    const level   = this._woLevel || 'moderate';
    const p       = FS.getP();
    const isoDate = this.logDateOffset === 0 ? undefined : this.logISOForViewedDay();
    FS.addWo({
      type, duration: dur, level,
      notes: document.getElementById('wo-notes').value.trim(),
      cal:   ENGINE.estWorkoutCal(type, dur, level, p.weight),
    }, isoDate);
    this.closeWorkoutModal();
    this.toast(`✓ ${level.charAt(0).toUpperCase() + level.slice(1)} workout logged`);
    this.renderDashboard();
    if (this.cur === 'log') this.renderLog();
  },

  deleteMeal(id) {
    FS.delMeal(id);
    this.toast('Meal removed');
    this.renderDashboard();
    if (this.cur === 'log') this.renderLog();
  },

  deleteWorkout(id) {
    FS.delWo(id);
    this.toast('Workout removed');
    this.renderDashboard();
    if (this.cur === 'log') this.renderLog();
  },

  // ── WEEK CHART ────────────────────────────────────────────────────────────
  renderWeekChart(cId, lId) {
    const week = FS.weekData();
    const c = document.getElementById(cId);
    const l = document.getElementById(lId);
    if (!c) return;
    const lvlColors = {
      hard:     'linear-gradient(180deg,#ff7351,#c0340d)',
      moderate: 'linear-gradient(180deg,#f4ffc8,#cffc00)',
      light:    'linear-gradient(180deg,#3be8b0,#00b37d)',
      null:     'linear-gradient(180deg,#f4ffc8,#cffc00)',
    };
    c.innerHTML = week.map(d => `
      <div class="flex-1 flex flex-col h-full">
        <div class="flex-1 relative rounded-sm" style="background:#262626;min-height:4px">
          <div class="absolute bottom-0 inset-x-0 rounded-sm transition-all duration-700"
               style="height:${d.cal > 0 ? Math.max(Math.round(d.pct * 100), 4) : 0}%;
                      background:${lvlColors[d.level] || lvlColors.null};
                      ${d.isToday ? 'box-shadow:0 0 6px rgba(244,255,200,.3)' : ''}">
          </div>
        </div>
      </div>`).join('');
    if (l) l.innerHTML = week.map(d =>
      `<span class="${d.isToday ? 'text-primary font-bold' : ''}">${d.label}</span>`).join('');
  },

  // ── RENDER HELPERS ────────────────────────────────────────────────────────
  insightHTML(ins) {
    const cfg = {
      positive: { bg:'rgba(244,255,200,.07)', bdr:'rgba(244,255,200,.18)', ic:'text-primary',           ib:'rgba(244,255,200,.12)' },
      warning:  { bg:'rgba(255,238,171,.07)', bdr:'rgba(255,176,32,.2)',   ic:'text-tertiary',          ib:'rgba(255,176,32,.12)'  },
      critical: { bg:'rgba(255,115,81,.08)',  bdr:'rgba(255,115,81,.25)',  ic:'text-error',             ib:'rgba(255,115,81,.14)'  },
      info:     { bg:'rgba(255,255,255,.03)', bdr:'rgba(72,72,71,.3)',     ic:'text-on-surface-variant', ib:'rgba(72,72,71,.3)'    },
    };
    const c = cfg[ins.t] || cfg.info;
    return `<div class="rounded-xl p-4 flex items-start gap-3" style="background:${c.bg};outline:1px solid ${c.bdr}">
      <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5" style="background:${c.ib}">
        <span class="material-symbols-outlined text-sm ${c.ic}">${ins.i}</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-headline font-bold text-sm">${ins.title}</p>
        <p class="text-xs text-on-surface-variant mt-1 leading-relaxed">${ins.body}</p>
      </div>
    </div>`;
  },

  mealHTML(m, canDelete = true) {
    const icons = { breakfast:'light_mode', lunch:'wb_sunny', dinner:'bedtime', snack:'nutrition', pre_workout:'bolt', post_workout:'exercise' };
    const time  = new Date(m.ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const del   = canDelete
      ? `<button onclick="App.deleteMeal('${m.id}')" aria-label="Delete meal" class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform shrink-0"><span class="material-symbols-outlined text-error" style="font-size:16px">close</span></button>`
      : '';
    return `<div class="bg-surface-container-highest rounded-2xl p-4 flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(244,255,200,.08)">
        <span class="material-symbols-outlined text-primary text-sm">${icons[m.mealType] || 'restaurant'}</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-headline font-bold text-sm truncate">${this.esc(m.name)}</p>
        <p class="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">${m.mealType.replace('_',' ')} · ${time}</p>
      </div>
      <div class="text-right shrink-0 mr-1">
        <p class="font-headline font-bold text-sm text-primary">${m.calories || '—'}</p>
        <p class="text-[9px] text-on-surface-variant uppercase">kcal</p>
      </div>
      ${del}
    </div>`;
  },

  woHTML(w, canDelete = true) {
    const icons = { run:'directions_run', bike:'directions_bike', swim:'pool', hyrox:'fitness_center', strength:'exercise', hiit:'bolt', yoga:'self_improvement', walk:'directions_walk', other:'sports' };
    const time  = new Date(w.ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const lvlCol = { light:'#3be8b0', moderate:'#f4ffc8', hard:'#ff7351' };
    const del   = canDelete
      ? `<button onclick="App.deleteWorkout('${w.id}')" aria-label="Delete workout" class="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center active:scale-90 transition-transform shrink-0"><span class="material-symbols-outlined text-error" style="font-size:16px">close</span></button>`
      : '';
    return `<div class="bg-surface-container rounded-2xl p-4 flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgba(255,115,81,.1)">
        <span class="material-symbols-outlined text-error text-sm">${icons[w.type] || 'sports'}</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-headline font-bold text-sm capitalize">${this.esc(w.type)}${w.notes ? ' · ' + this.esc(w.notes) : ''}</p>
        <p class="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">${w.duration}min · <span style="color:${lvlCol[w.level] || '#f4ffc8'}">${(w.level || 'moderate').toUpperCase()}</span> · ${time}</p>
      </div>
      <div class="text-right shrink-0 mr-1">
        <p class="font-headline font-bold text-sm" style="color:#ff7351">${w.cal}</p>
        <p class="text-[9px] text-on-surface-variant uppercase">kcal</p>
      </div>
      ${del}
    </div>`;
  },

  emptyHTML(icon, title, sub) {
    return `<div class="flex flex-col items-center py-8 text-center">
      <div class="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-on-surface-variant">${icon}</span>
      </div>
      <p class="font-headline font-bold text-sm uppercase tracking-wider text-on-surface-variant">${title}</p>
      <p class="text-xs text-on-surface-variant mt-1 opacity-60">${sub}</p>
    </div>`;
  },

  esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
};

// Single DOMContentLoaded — no duplicate (FIX applied)
document.addEventListener('DOMContentLoaded', () => App.init());
