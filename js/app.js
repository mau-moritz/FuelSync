// ===========================
// FUELSYNC — APP CONTROLLER
// ===========================

const App = {

  currentPage: 'dashboard',

  init() {
    this.bindNav();
    this.checkOnboarding();
    this.renderDashboard();
    this.updateDateDisplay();
  },

  bindNav() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const page = tab.dataset.page;
        this.navigate(page);
      });
    });
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.nav-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.page === page)
    );
    document.querySelectorAll('.page').forEach(p =>
      p.classList.toggle('active', p.id === `page-${page}`)
    );
    // Render the page
    if (page === 'dashboard') this.renderDashboard();
    if (page === 'log') this.renderLog();
    if (page === 'insights') this.renderInsights();
    if (page === 'profile') this.renderProfile();
  },

  updateDateDisplay() {
    const el = document.getElementById('nav-date');
    if (!el) return;
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    el.textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
  },

  checkOnboarding() {
    const profile = FS.getProfile();
    if (!profile.onboarded) {
      setTimeout(() => this.openOnboarding(), 300);
    }
  },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  },

  // ========== ONBOARDING ==========
  openOnboarding() {
    document.getElementById('modal-onboarding').classList.add('open');
  },

  closeOnboarding() {
    document.getElementById('modal-onboarding').classList.remove('open');
  },

  saveOnboarding() {
    const p = FS.getProfile();
    p.name = document.getElementById('ob-name').value.trim() || 'Athlete';
    p.sex = document.getElementById('ob-sex').value;
    p.age = parseInt(document.getElementById('ob-age').value) || 25;
    p.weight = parseFloat(document.getElementById('ob-weight').value) || 75;
    p.height = parseInt(document.getElementById('ob-height').value) || 175;
    p.goal = document.getElementById('ob-goal').value;
    p.activityBase = document.getElementById('ob-activity').value;
    p.targetRace = document.getElementById('ob-race').value.trim();
    p.onboarded = true;
    FS.saveProfile(p);
    this.closeOnboarding();
    this.toast('🚀 Profile saved — let\'s fuel your performance!');
    this.renderDashboard();
  },

  // ========== DASHBOARD ==========
  renderDashboard() {
    const profile = FS.getProfile();
    const todayMeals = FS.getTodayMeals();
    const todayWorkouts = FS.getTodayWorkouts();
    const targets = FS.calcTargets(profile, todayWorkouts);
    const totals = FS.sumMacros(todayMeals);

    // Greeting
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    const firstName = profile.name ? profile.name.split(' ')[0] : 'Athlete';
    document.getElementById('dash-greeting').textContent = `${greet}, ${firstName}`;

    // Hero
    document.getElementById('dash-hero-cal').textContent = Math.round(totals.calories);
    document.getElementById('dash-hero-target').textContent = `of ${Math.round(targets.calories)} kcal`;

    // Calorie progress bar
    const calPct = Math.min((totals.calories / (targets.calories || 1)) * 100, 100);
    document.getElementById('dash-cal-bar').style.width = `${calPct}%`;
    document.getElementById('dash-cal-bar').className = `progress-bar-fill ${calPct > 90 ? 'fill-lime' : calPct > 60 ? 'fill-mint' : 'fill-orange'}`;

    // Macros
    document.getElementById('dash-macro-carbs-val').textContent = totals.carbs;
    document.getElementById('dash-macro-carbs-tgt').textContent = `/ ${targets.carbs}g`;
    document.getElementById('dash-macro-prot-val').textContent = totals.protein;
    document.getElementById('dash-macro-prot-tgt').textContent = `/ ${targets.protein}g`;
    document.getElementById('dash-macro-fat-val').textContent = totals.fat;
    document.getElementById('dash-macro-fat-tgt').textContent = `/ ${targets.fat}g`;

    this.setMiniBar('bar-carbs', totals.carbs, targets.carbs, 'fill-lime');
    this.setMiniBar('bar-prot', totals.protein, targets.protein, 'fill-orange');
    this.setMiniBar('bar-fat', totals.fat, targets.fat, 'fill-mint');

    // Stat cards
    document.getElementById('sc-cal-val').textContent = Math.round(totals.calories);
    document.getElementById('sc-cal-unit').textContent = `kcal / ${Math.round(targets.calories)}`;
    document.getElementById('sc-carb-val').textContent = Math.round(totals.carbs);
    document.getElementById('sc-carb-unit').textContent = `g / ${targets.carbs}g`;
    document.getElementById('sc-prot-val').textContent = Math.round(totals.protein);
    document.getElementById('sc-prot-unit').textContent = `g / ${targets.protein}g`;

    // Today's workouts
    const wEl = document.getElementById('dash-workouts');
    if (todayWorkouts.length === 0) {
      wEl.innerHTML = `<div class="empty-state" style="padding:20px">
        <div class="empty-icon">🏃</div>
        <div class="empty-title">No sessions logged</div>
        <p>Log your training to adjust your fuel targets</p>
      </div>`;
    } else {
      wEl.innerHTML = todayWorkouts.map(w => this.workoutItemHTML(w)).join('');
    }

    // Quick insights (top 2)
    const insights = FS.generateInsights(profile, todayMeals, todayWorkouts, targets);
    document.getElementById('dash-insights').innerHTML = insights.slice(0, 2).map(i => this.insightHTML(i)).join('');

    this.renderWeekChart();
  },

  setMiniBar(id, value, target, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = Math.min((value / (target || 1)) * 100, 100);
    el.style.width = `${pct}%`;
    el.className = `progress-bar-fill ${cls}`;
  },

  renderWeekChart() {
    const weekData = FS.getWeekData();
    const chart = document.getElementById('week-chart');
    if (!chart) return;
    chart.innerHTML = weekData.map(d => `
      <div class="week-bar-wrap ${d.isToday ? 'today' : ''}">
        <div class="week-bar-track">
          <div class="week-bar-fill ${d.hasWorkout ? 'fill-orange' : 'fill-lime'}" 
               style="height:${Math.round(d.pct * 100)}%"></div>
        </div>
        <div class="week-day-label">${d.label}</div>
      </div>
    `).join('');
  },

  insightHTML(insight) {
    return `<div class="insight-card ${insight.type}">
      <div class="insight-icon">${insight.icon}</div>
      <div>
        <div class="insight-title">${insight.title}</div>
        <div class="insight-body">${insight.body}</div>
      </div>
    </div>`;
  },

  workoutItemHTML(w) {
    const icons = {run:'🏃',bike:'🚴',swim:'🏊',hyrox:'🏋️',strength:'💪',yoga:'🧘',hiit:'⚡',walk:'🚶',other:'🏅'};
    const icon = icons[w.type] || '🏅';
    const bgMap = {run:'rgba(200,245,66,0.1)',bike:'rgba(59,232,176,0.1)',swim:'rgba(59,232,176,0.1)',hyrox:'rgba(255,107,43,0.15)',strength:'rgba(255,107,43,0.1)',default:'rgba(255,255,255,0.05)'};
    const bg = bgMap[w.type] || bgMap.default;
    return `<div class="log-item">
      <div class="log-icon" style="background:${bg}">${icon}</div>
      <div class="log-info">
        <div class="log-name">${this.capitalize(w.type)}${w.notes ? ' — ' + w.notes : ''}</div>
        <div class="log-meta">${w.duration} min · Intensity ${w.intensity}/10</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--accent2)">${w.caloriesBurned}</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">kcal</div>
      </div>
    </div>`;
  },

  mealItemHTML(m) {
    const mealIcons = {breakfast:'🌅',lunch:'☀️',dinner:'🌙',snack:'🍎',pre_workout:'⚡',post_workout:'💪'};
    const icon = mealIcons[m.mealType] || '🍽️';
    return `<div class="log-item">
      <div class="log-icon" style="background:rgba(200,245,66,0.08)">${icon}</div>
      <div class="log-info">
        <div class="log-name">${m.name}</div>
        <div class="log-meta">${this.capitalize(m.mealType.replace('_',' '))} · ${this.formatTime(m.timestamp)}</div>
      </div>
      <div class="log-macros">
        <span><strong>${m.calories}</strong>kcal</span>
        <span><strong>${m.carbs}g</strong>carb</span>
        <span><strong>${m.protein}g</strong>prot</span>
      </div>
      <button class="btn btn-danger" onclick="App.deleteMeal('${m.id}')" style="margin-left:8px">✕</button>
    </div>`;
  },

  // ========== LOG PAGE ==========
  renderLog() {
    const todayMeals = FS.getTodayMeals();
    const todayWorkouts = FS.getTodayWorkouts();

    const mealsEl = document.getElementById('log-meals-list');
    if (todayMeals.length === 0) {
      mealsEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🥗</div>
        <div class="empty-title">No meals logged today</div>
        <p>Hit "+ Log Meal" to start tracking</p>
      </div>`;
    } else {
      mealsEl.innerHTML = todayMeals.map(m => this.mealItemHTML(m)).join('');
    }

    const workoutsEl = document.getElementById('log-workouts-list');
    if (todayWorkouts.length === 0) {
      workoutsEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🏋️</div>
        <div class="empty-title">No workouts logged</div>
        <p>Hit "+ Log Workout" to track your training</p>
      </div>`;
    } else {
      workoutsEl.innerHTML = todayWorkouts.map(w => `
        ${this.workoutItemHTML(w)}
      `).join('') + todayWorkouts.map(w => `
        <div style="display:none">
          <button onclick="App.deleteWorkout('${w.id}')"></button>
        </div>`).join('');
      // Re-inject with delete buttons
      workoutsEl.innerHTML = todayWorkouts.map(w => {
        const icons = {run:'🏃',bike:'🚴',swim:'🏊',hyrox:'🏋️',strength:'💪',yoga:'🧘',hiit:'⚡',walk:'🚶',other:'🏅'};
        const icon = icons[w.type] || '🏅';
        const bgMap = {run:'rgba(200,245,66,0.1)',bike:'rgba(59,232,176,0.1)',swim:'rgba(59,232,176,0.1)',hyrox:'rgba(255,107,43,0.15)',strength:'rgba(255,107,43,0.1)'};
        const bg = bgMap[w.type] || 'rgba(255,255,255,0.05)';
        return `<div class="log-item">
          <div class="log-icon" style="background:${bg}">${icon}</div>
          <div class="log-info">
            <div class="log-name">${this.capitalize(w.type)}${w.notes ? ' — ' + w.notes : ''}</div>
            <div class="log-meta">${w.duration} min · Intensity ${w.intensity}/10 · ${this.formatTime(w.timestamp)}</div>
          </div>
          <div style="text-align:right;margin-right:8px">
            <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--accent2)">${w.caloriesBurned}</div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">kcal</div>
          </div>
          <button class="btn btn-danger" onclick="App.deleteWorkout('${w.id}')">✕</button>
        </div>`;
      }).join('');
    }
  },

  // ---- Meal Modal ----
  openMealModal() {
    document.getElementById('modal-meal').classList.add('open');
    document.getElementById('meal-name').focus();
  },

  closeMealModal() {
    document.getElementById('modal-meal').classList.remove('open');
    document.getElementById('form-meal').reset();
  },

  saveMeal() {
    const name = document.getElementById('meal-name').value.trim();
    if (!name) { this.toast('⚠ Add a meal name'); return; }
    const meal = {
      name,
      mealType: document.getElementById('meal-type').value,
      calories: parseInt(document.getElementById('meal-cal').value) || 0,
      carbs: parseInt(document.getElementById('meal-carbs').value) || 0,
      protein: parseInt(document.getElementById('meal-protein').value) || 0,
      fat: parseInt(document.getElementById('meal-fat').value) || 0,
      notes: document.getElementById('meal-notes').value.trim(),
    };
    FS.addMeal(meal);
    this.closeMealModal();
    this.toast('✓ Meal logged');
    this.renderLog();
    if (this.currentPage === 'dashboard') this.renderDashboard();
  },

  deleteMeal(id) {
    FS.deleteMeal(id);
    this.toast('Meal removed');
    this.renderLog();
    this.renderDashboard();
  },

  // ---- Workout Modal ----
  openWorkoutModal() {
    document.getElementById('modal-workout').classList.add('open');
    this.updateCalEstimate();
  },

  closeWorkoutModal() {
    document.getElementById('modal-workout').classList.remove('open');
    document.getElementById('form-workout').reset();
    document.getElementById('wo-intensity-val').textContent = '5';
  },

  updateCalEstimate() {
    const type = document.getElementById('wo-type').value;
    const duration = parseInt(document.getElementById('wo-duration').value) || 30;
    const intensity = parseInt(document.getElementById('wo-intensity').value) || 5;
    const est = FS.estimateCalories(type, duration, intensity);
    document.getElementById('wo-cal-est').textContent = `~${est} kcal estimated`;
  },

  saveWorkout() {
    const type = document.getElementById('wo-type').value;
    const duration = parseInt(document.getElementById('wo-duration').value);
    if (!duration || duration < 1) { this.toast('⚠ Add duration'); return; }
    const intensity = parseInt(document.getElementById('wo-intensity').value) || 5;
    const workout = {
      type,
      duration,
      intensity,
      notes: document.getElementById('wo-notes').value.trim(),
      caloriesBurned: FS.estimateCalories(type, duration, intensity),
    };
    FS.addWorkout(workout);
    this.closeWorkoutModal();
    this.toast('✓ Workout logged');
    this.renderLog();
    if (this.currentPage === 'dashboard') this.renderDashboard();
  },

  deleteWorkout(id) {
    FS.deleteWorkout(id);
    this.toast('Workout removed');
    this.renderLog();
    this.renderDashboard();
  },

  // ========== INSIGHTS PAGE ==========
  renderInsights() {
    const profile = FS.getProfile();
    const todayMeals = FS.getTodayMeals();
    const todayWorkouts = FS.getTodayWorkouts();
    const targets = FS.calcTargets(profile, todayWorkouts);
    const insights = FS.generateInsights(profile, todayMeals, todayWorkouts, targets);
    const totals = FS.sumMacros(todayMeals);

    document.getElementById('insights-list').innerHTML =
      insights.map(i => this.insightHTML(i)).join('');

    // Week summary
    const weekData = FS.getWeekData();
    const daysLogged = weekData.filter(d => d.calories > 0).length;
    const avgCal = daysLogged > 0
      ? Math.round(weekData.filter(d => d.calories > 0).reduce((s, d) => s + d.calories, 0) / daysLogged)
      : 0;
    const workoutDays = weekData.filter(d => d.hasWorkout).length;

    document.getElementById('week-days-logged').textContent = daysLogged;
    document.getElementById('week-avg-cal').textContent = avgCal || '—';
    document.getElementById('week-workout-days').textContent = workoutDays;

    // Consistency score
    const score = Math.round((daysLogged / 7) * 50 + (workoutDays / 7) * 30 + (avgCal > 0 ? 20 : 0));
    document.getElementById('consistency-score').textContent = score;
    document.getElementById('consistency-bar').style.width = `${score}%`;

    // Render insight week chart
    const weekChartI = document.getElementById('week-chart-insights');
    if (weekChartI) {
      weekChartI.innerHTML = weekData.map(d => `
        <div class="week-bar-wrap ${d.isToday ? 'today' : ''}">
          <div class="week-bar-track">
            <div class="week-bar-fill ${d.hasWorkout ? 'fill-orange' : 'fill-lime'}" 
                 style="height:${Math.round(d.pct * 100)}%"></div>
          </div>
          <div class="week-day-label">${d.label}</div>
        </div>
      `).join('');
    }

    // Goal-specific tip
    const tips = {
      endurance: { icon: '🏃', title: 'Endurance Tip', body: 'Aim for 7–10g carbs/kg on long run days. Never skip post-session protein within 30 minutes.' },
      strength: { icon: '💪', title: 'Strength Tip', body: 'Target 1.6–2.2g protein/kg daily. Time carbs around training for performance and recovery.' },
      hybrid: { icon: '⚡', title: 'HYROX Tip', body: 'Hybrid training demands high carbs AND protein. Don\'t cut either — your engine needs both.' },
      weight_loss: { icon: '🎯', title: 'Fat Loss Tip', body: 'Preserve muscle by keeping protein high. A 300–500 kcal deficit is enough — don\'t over-restrict.' },
    };
    const tip = tips[profile.goal] || tips.endurance;
    document.getElementById('goal-tip').innerHTML = this.insightHTML({ type: 'info', ...tip });
  },

  // ========== PROFILE PAGE ==========
  renderProfile() {
    const p = FS.getProfile();
    document.getElementById('prof-name').value = p.name || '';
    document.getElementById('prof-age').value = p.age || 25;
    document.getElementById('prof-sex').value = p.sex || 'male';
    document.getElementById('prof-weight').value = p.weight || 75;
    document.getElementById('prof-height').value = p.height || 175;
    document.getElementById('prof-goal').value = p.goal || 'endurance';
    document.getElementById('prof-activity').value = p.activityBase || 'moderate';
    document.getElementById('prof-race').value = p.targetRace || '';

    // Show calculated targets
    const targets = FS.calcTargets(p, []);
    document.getElementById('prof-tdee').textContent = FS.calcTDEE(p);
    document.getElementById('prof-target-cal').textContent = targets.calories;
    document.getElementById('prof-target-carbs').textContent = targets.carbs + 'g';
    document.getElementById('prof-target-prot').textContent = targets.protein + 'g';
    document.getElementById('prof-target-fat').textContent = targets.fat + 'g';
  },

  saveProfile() {
    const p = FS.getProfile();
    p.name = document.getElementById('prof-name').value.trim() || 'Athlete';
    p.age = parseInt(document.getElementById('prof-age').value) || 25;
    p.sex = document.getElementById('prof-sex').value;
    p.weight = parseFloat(document.getElementById('prof-weight').value) || 75;
    p.height = parseInt(document.getElementById('prof-height').value) || 175;
    p.goal = document.getElementById('prof-goal').value;
    p.activityBase = document.getElementById('prof-activity').value;
    p.targetRace = document.getElementById('prof-race').value.trim();
    p.onboarded = true;
    FS.saveProfile(p);
    this.toast('✓ Profile updated');
    this.renderProfile();
    this.renderDashboard();
  },

  clearAllData() {
    if (confirm('Clear ALL data? This cannot be undone.')) {
      localStorage.clear();
      this.toast('Data cleared');
      location.reload();
    }
  },

  // ---- UTILS ----
  capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  },

  formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
