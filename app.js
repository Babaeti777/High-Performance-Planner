// ==================== High-Performance Planner App ====================
// Optimized version with debouncing, event delegation, and improved performance

// ==================== Utility Functions (defined once) ====================
const Utils = {
    // Debounce function to prevent excessive calls
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    formatDate(date) {
        return date.toISOString().split('T')[0];
    },

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    },

    getMonthKey(month, year) {
        return `${year}-${String(month + 1).padStart(2, '0')}`;
    },

    // Sanitize input to prevent XSS
    sanitize(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Show toast notification
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: var(--bg-card);
            color: var(--text-primary);
            padding: 16px 24px;
            border-radius: 8px;
            border-left: 4px solid var(--accent-${type === 'error' ? 'danger' : type === 'success' ? 'secondary' : 'primary'});
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            max-width: 300px;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }
};

// Constants (defined once)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PRIORITY_ICONS = {
    'urgent-important': '🔥 ',
    'not-urgent-important': '📅 ',
    'urgent-not-important': '⚡ ',
    'not-urgent-not-important': '🗑️ '
};

// Holidays - can be extended dynamically
const holidays = {
    '2025-01-01': 'New Year\'s Day',
    '2025-01-20': 'Martin Luther King Jr. Day',
    '2025-02-14': 'Valentine\'s Day',
    '2025-02-17': 'Presidents\' Day',
    '2025-04-20': 'Easter Sunday',
    '2025-05-11': 'Mother\'s Day',
    '2025-05-26': 'Memorial Day',
    '2025-06-15': 'Father\'s Day',
    '2025-06-19': 'Juneteenth',
    '2025-07-04': 'Independence Day',
    '2025-09-01': 'Labor Day',
    '2025-10-13': 'Columbus Day',
    '2025-10-31': 'Halloween',
    '2025-11-11': 'Veterans Day',
    '2025-11-27': 'Thanksgiving',
    '2025-12-25': 'Christmas Day',
    '2026-01-01': 'New Year\'s Day'
};

// ==================== Global State ====================
const AppState = {
    currentDate: new Date(),
    currentWeekStart: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedNote: null,
    data: {
        daily: {},
        monthly: {},
        eisenhower: {
            'urgent-important': [],
            'not-urgent-important': [],
            'urgent-not-important': [],
            'not-urgent-not-important': []
        },
        notes: [],
        lessons: { daily: {}, monthly: {} }
    }
};

// Timer state with cleanup tracking
const TimerState = {
    taskName: '',
    startTime: null,
    elapsed: 0,
    running: false,
    interval: null,
    taskDuration: 0,

    // Cleanup method to prevent memory leaks
    cleanup() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.running = false;
    }
};

// ==================== Debounced Save ====================
const saveDataImmediate = () => {
    try {
        localStorage.setItem('plannerData', JSON.stringify(AppState.data));
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            Utils.showToast('Storage full! Please export and clear old data.', 'error', 5000);
        }
    }
};

// Debounced version - waits 500ms after last change before saving
const saveData = Utils.debounce(saveDataImmediate, 500);

function loadData() {
    try {
        const saved = localStorage.getItem('plannerData');
        if (saved) {
            const parsed = JSON.parse(saved);
            AppState.data = {
                daily: parsed.daily || {},
                monthly: parsed.monthly || {},
                eisenhower: parsed.eisenhower || {
                    'urgent-important': [],
                    'not-urgent-important': [],
                    'urgent-not-important': [],
                    'not-urgent-not-important': []
                },
                notes: parsed.notes || [],
                lessons: parsed.lessons || { daily: {}, monthly: {} }
            };
        }
    } catch (error) {
        Utils.showToast('Error loading data', 'error');
    }
}

// ==================== Core Task Functions ====================
function createTask(text, options = {}) {
    return {
        id: Date.now(),
        text: Utils.sanitize(text),
        completed: false,
        duration: options.duration || 0,
        createdAt: new Date().toISOString(),
        ...(options.quadrant && { source: 'eisenhower', quadrant: options.quadrant })
    };
}

function addTaskToDate(dateKey, task) {
    if (!AppState.data.daily[dateKey]) {
        AppState.data.daily[dateKey] = { tasks: [] };
    }
    AppState.data.daily[dateKey].tasks.push(task);

    if (task.quadrant) {
        AppState.data.eisenhower[task.quadrant].push({
            ...task,
            scheduledDate: dateKey
        });
    }
    saveData();
}

function toggleTaskComplete(taskId, dateKey) {
    const dayData = AppState.data.daily[dateKey];
    if (!dayData) return;

    const task = dayData.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;

    // Sync with Eisenhower if applicable
    if (task.source === 'eisenhower' && task.quadrant) {
        const eisenTask = AppState.data.eisenhower[task.quadrant]?.find(t => t.id === task.id);
        if (eisenTask) eisenTask.completed = task.completed;
    }
    saveData();
}

function deleteTask(taskId, dateKey) {
    const dayData = AppState.data.daily[dateKey];
    if (!dayData) return null;

    const taskIndex = dayData.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;

    const task = dayData.tasks[taskIndex];
    dayData.tasks.splice(taskIndex, 1);

    // Remove from Eisenhower if applicable
    if (task.source === 'eisenhower' && task.quadrant) {
        const eisenTasks = AppState.data.eisenhower[task.quadrant];
        const eisenIndex = eisenTasks.findIndex(t => t.id === task.id);
        if (eisenIndex !== -1) eisenTasks.splice(eisenIndex, 1);
    }
    saveData();
    return task;
}

// ==================== DOM Cache ====================
const DOMCache = {
    elements: {},
    get(id) {
        if (!this.elements[id]) {
            this.elements[id] = document.getElementById(id);
        }
        return this.elements[id];
    },
    clear() {
        this.elements = {};
    }
};

// ==================== Tab Navigation ====================
function initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            navItems.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
            document.getElementById(targetTab)?.classList.add('active');

            // Refresh view when switching tabs
            const refreshMap = {
                'schedule': renderWeeklyView,
                'monthly': renderMonthlyPlanner,
                'eisenhower': renderEisenhowerMatrix,
                'notes': renderNotes,
                'search': () => {} // Search doesn't need refresh
            };
            refreshMap[targetTab]?.();
        });
    });
}

// ==================== Weekly Schedule with Event Delegation ====================
function initWeeklyPlanner() {
    if (!AppState.currentWeekStart) {
        AppState.currentWeekStart = Utils.getWeekStart(new Date());
    }

    // Navigation buttons
    DOMCache.get('prevWeek')?.addEventListener('click', () => {
        AppState.currentWeekStart.setDate(AppState.currentWeekStart.getDate() - 7);
        renderWeeklyView();
    });

    DOMCache.get('nextWeek')?.addEventListener('click', () => {
        AppState.currentWeekStart.setDate(AppState.currentWeekStart.getDate() + 7);
        renderWeeklyView();
    });

    DOMCache.get('thisWeekBtn')?.addEventListener('click', () => {
        AppState.currentWeekStart = Utils.getWeekStart(new Date());
        renderWeeklyView();
    });

    // Event delegation for task actions
    const weekDaysContainer = DOMCache.get('weekDaysContainer');
    if (weekDaysContainer) {
        weekDaysContainer.addEventListener('click', handleWeeklyTaskClick);
        weekDaysContainer.addEventListener('change', handleWeeklyTaskChange);
    }

    initTaskModal();
    initTimer();
    renderWeeklyView();
}

// Event delegation handler for clicks
function handleWeeklyTaskClick(e) {
    const target = e.target;

    // Handle delete button
    if (target.classList.contains('task-delete-btn')) {
        const taskItem = target.closest('.day-task-item');
        const taskId = parseInt(taskItem?.dataset.taskId);
        const dateKey = taskItem?.dataset.dateKey;
        if (taskId && dateKey) {
            deleteTask(taskId, dateKey);
            renderWeeklyView();
        }
        return;
    }

    // Handle start timer button
    if (target.classList.contains('task-start-btn')) {
        const taskItem = target.closest('.day-task-item');
        const taskId = parseInt(taskItem?.dataset.taskId);
        const dateKey = taskItem?.dataset.dateKey;
        if (taskId && dateKey) {
            const task = AppState.data.daily[dateKey]?.tasks.find(t => t.id === taskId);
            if (task) startTaskTimer(task);
        }
        return;
    }
}

// Event delegation handler for checkbox changes
function handleWeeklyTaskChange(e) {
    const target = e.target;

    if (target.classList.contains('task-checkbox')) {
        const taskItem = target.closest('.day-task-item');
        const taskId = parseInt(taskItem?.dataset.taskId);
        const dateKey = taskItem?.dataset.dateKey;
        if (taskId && dateKey) {
            toggleTaskComplete(taskId, dateKey);
            taskItem.classList.toggle('completed');
        }
    }
}

function renderWeeklyView() {
    const weekTitle = DOMCache.get('weekTitle');
    const weekDateRange = DOMCache.get('weekDateRange');
    const weekDaysContainer = DOMCache.get('weekDaysContainer');

    if (!weekTitle || !weekDateRange || !weekDaysContainer) return;

    const today = Utils.formatDate(new Date());
    const weekEnd = new Date(AppState.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const isThisWeek = Utils.formatDate(AppState.currentWeekStart) <= today && today <= Utils.formatDate(weekEnd);

    weekTitle.textContent = isThisWeek ? 'This Week' : 'Week of ' + AppState.currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    weekDateRange.textContent = AppState.currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' - ' + weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Build HTML string for better performance (single DOM update)
    let html = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date(AppState.currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateKey = Utils.formatDate(date);
        const holiday = holidays[dateKey];
        const isToday = dateKey === today;
        const tasks = AppState.data.daily[dateKey]?.tasks || [];

        html += `
            <div class="day-card${isToday ? ' today' : ''}" role="listitem">
                <div class="day-card-header">
                    <div class="day-info">
                        <span class="day-name">${DAY_NAMES[i]}</span>
                        <span class="day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        ${holiday ? `<span class="holiday-badge">${holiday}</span>` : ''}
                    </div>
                    <span class="day-task-count">${tasks.length === 0 ? 'No tasks' : `${tasks.length} task${tasks.length > 1 ? 's' : ''}`}</span>
                </div>
                <div class="day-tasks-list">
                    ${tasks.length === 0
                        ? '<div class="day-empty">Click + to add tasks</div>'
                        : tasks.map(task => createTaskHTML(task, dateKey)).join('')
                    }
                </div>
            </div>
        `;
    }
    weekDaysContainer.innerHTML = html;
}

function createTaskHTML(task, dateKey) {
    const icon = task.quadrant ? PRIORITY_ICONS[task.quadrant] : '';
    return `
        <div class="day-task-item${task.completed ? ' completed' : ''}"
             data-task-id="${task.id}"
             data-date-key="${dateKey}">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark task complete">
            <span class="task-text">${icon}${Utils.sanitize(task.text)}</span>
            ${task.duration > 0 ? `<span class="task-duration">${task.duration}h</span>` : ''}
            ${!task.completed ? '<button class="task-start-btn" title="Start timer">▶</button>' : ''}
            <button class="task-delete-btn" title="Delete task">×</button>
        </div>
    `;
}

// ==================== Task Modal ====================
function initTaskModal() {
    const modal = DOMCache.get('taskModal');
    const floatingBtn = DOMCache.get('floatingAddBtn');
    const closeModal = DOMCache.get('closeModal');
    const cancelModal = DOMCache.get('cancelModal');
    const saveTaskBtn = DOMCache.get('saveTask');
    const modalTaskDay = DOMCache.get('modalTaskDay');
    const modalTaskName = DOMCache.get('modalTaskName');

    if (!modal || !floatingBtn) return;

    const closeModalFn = () => {
        modal.classList.add('hidden');
        modalTaskName.value = '';
        DOMCache.get('modalTaskPriority').value = '';
        DOMCache.get('modalTaskDuration').value = '';
    };

    floatingBtn.addEventListener('click', () => {
        populateDayOptions(modalTaskDay);
        modal.classList.remove('hidden');
        modalTaskName.focus();
    });

    closeModal?.addEventListener('click', closeModalFn);
    cancelModal?.addEventListener('click', closeModalFn);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModalFn(); });

    saveTaskBtn?.addEventListener('click', () => {
        const taskName = modalTaskName.value.trim();
        if (!taskName) {
            modalTaskName.focus();
            return;
        }

        const dateKey = modalTaskDay.value;
        const priority = DOMCache.get('modalTaskPriority').value;
        const duration = parseFloat(DOMCache.get('modalTaskDuration').value) || 0;

        const task = createTask(taskName, { quadrant: priority || null, duration });
        addTaskToDate(dateKey, task);

        renderWeeklyView();
        if (priority) renderEisenhowerMatrix();
        closeModalFn();
    });

    modalTaskName?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveTaskBtn.click();
    });
}

function populateDayOptions(select) {
    select.innerHTML = '';
    const today = Utils.formatDate(new Date());

    for (let i = 0; i < 7; i++) {
        const date = new Date(AppState.currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateKey = Utils.formatDate(date);

        const option = document.createElement('option');
        option.value = dateKey;
        option.textContent = DAY_NAMES[i] + ', ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dateKey === today) option.selected = true;
        select.appendChild(option);
    }
}

// ==================== Timer with Proper Cleanup ====================
function initTimer() {
    const closeTimer = DOMCache.get('closeTimer');
    const pauseTimer = DOMCache.get('pauseTimer');
    const stopTimer = DOMCache.get('stopTimer');

    if (!closeTimer) return;

    closeTimer.addEventListener('click', () => {
        DOMCache.get('timerWidget').classList.add('hidden');
        TimerState.cleanup();
    });

    pauseTimer?.addEventListener('click', () => {
        if (TimerState.running) {
            TimerState.cleanup();
            pauseTimer.textContent = '▶ Resume';
        } else {
            resumeTimer();
            pauseTimer.textContent = '⏸ Pause';
        }
    });

    stopTimer?.addEventListener('click', () => {
        stopTimerFn();
        DOMCache.get('timerWidget').classList.add('hidden');
    });

    // Cleanup on page unload to prevent memory leaks
    window.addEventListener('beforeunload', () => TimerState.cleanup());
}

function startTaskTimer(task) {
    // Clean up any existing timer first
    TimerState.cleanup();

    TimerState.taskName = task.text;
    TimerState.startTime = Date.now();
    TimerState.elapsed = 0;
    TimerState.running = true;
    TimerState.taskDuration = task.duration || 0;

    const timerWidget = DOMCache.get('timerWidget');
    const timerTaskName = DOMCache.get('timerTaskName');
    const pauseTimer = DOMCache.get('pauseTimer');

    timerWidget?.classList.remove('hidden');
    if (timerTaskName) timerTaskName.textContent = task.text;
    if (pauseTimer) pauseTimer.textContent = '⏸ Pause';

    updateTimer();
    TimerState.interval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!TimerState.running) return;

    TimerState.elapsed = Math.floor((Date.now() - TimerState.startTime) / 1000);

    const minutes = Math.floor(TimerState.elapsed / 60);
    const seconds = TimerState.elapsed % 60;

    const timerDisplay = DOMCache.get('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }

    if (TimerState.taskDuration > 0) {
        const progressCircle = DOMCache.get('progressCircle');
        if (progressCircle) {
            const totalSeconds = TimerState.taskDuration * 3600;
            const progress = Math.min(TimerState.elapsed / totalSeconds, 1);
            progressCircle.style.strokeDashoffset = 565.48 * (1 - progress);
        }
    }
}

function resumeTimer() {
    TimerState.running = true;
    TimerState.startTime = Date.now() - (TimerState.elapsed * 1000);
    TimerState.interval = setInterval(updateTimer, 1000);
}

function stopTimerFn() {
    TimerState.cleanup();
    TimerState.taskName = '';
    TimerState.elapsed = 0;

    const timerDisplay = DOMCache.get('timerDisplay');
    const progressCircle = DOMCache.get('progressCircle');
    if (timerDisplay) timerDisplay.textContent = '00:00';
    if (progressCircle) progressCircle.style.strokeDashoffset = 565.48;
}

// ==================== Monthly Planner ====================
function initMonthlyPlanner() {
    const prevMonth = DOMCache.get('prevMonth');
    const nextMonth = DOMCache.get('nextMonth');
    const thisMonthBtn = DOMCache.get('thisMonthBtn');
    const monthSelect = DOMCache.get('monthSelect');
    const yearSelect = DOMCache.get('yearSelect');

    // Populate selects once
    MONTH_NAMES.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect?.appendChild(option);
    });

    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 3; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect?.appendChild(option);
    }

    if (monthSelect) monthSelect.value = AppState.currentMonth;
    if (yearSelect) yearSelect.value = AppState.currentYear;

    monthSelect?.addEventListener('change', (e) => {
        AppState.currentMonth = parseInt(e.target.value);
        renderMonthlyPlanner();
    });

    yearSelect?.addEventListener('change', (e) => {
        AppState.currentYear = parseInt(e.target.value);
        renderMonthlyPlanner();
    });

    prevMonth?.addEventListener('click', () => {
        AppState.currentMonth--;
        if (AppState.currentMonth < 0) {
            AppState.currentMonth = 11;
            AppState.currentYear--;
        }
        if (monthSelect) monthSelect.value = AppState.currentMonth;
        if (yearSelect) yearSelect.value = AppState.currentYear;
        renderMonthlyPlanner();
    });

    nextMonth?.addEventListener('click', () => {
        AppState.currentMonth++;
        if (AppState.currentMonth > 11) {
            AppState.currentMonth = 0;
            AppState.currentYear++;
        }
        if (monthSelect) monthSelect.value = AppState.currentMonth;
        if (yearSelect) yearSelect.value = AppState.currentYear;
        renderMonthlyPlanner();
    });

    thisMonthBtn?.addEventListener('click', () => {
        AppState.currentMonth = new Date().getMonth();
        AppState.currentYear = new Date().getFullYear();
        if (monthSelect) monthSelect.value = AppState.currentMonth;
        if (yearSelect) yearSelect.value = AppState.currentYear;
        renderMonthlyPlanner();
    });

    DOMCache.get('addMonthlyGoal')?.addEventListener('click', addMonthlyGoalHandler);
    DOMCache.get('monthlyGoalInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addMonthlyGoalHandler();
    });

    DOMCache.get('saveMonthlyLessons')?.addEventListener('click', saveMonthlyLessonsHandler);

    // Event delegation for goal list
    DOMCache.get('monthlyGoalList')?.addEventListener('click', handleGoalClick);
    DOMCache.get('monthlyGoalList')?.addEventListener('change', handleGoalChange);

    renderMonthlyPlanner();
}

function handleGoalClick(e) {
    if (e.target.classList.contains('delete-btn')) {
        const goalItem = e.target.closest('.goal-item');
        const goalId = parseInt(goalItem?.dataset.goalId);
        const monthKey = Utils.getMonthKey(AppState.currentMonth, AppState.currentYear);

        if (goalId && AppState.data.monthly[monthKey]) {
            const goals = AppState.data.monthly[monthKey].goals;
            const index = goals.findIndex(g => g.id === goalId);
            if (index !== -1) {
                goals.splice(index, 1);
                saveData();
                renderMonthlyGoals(monthKey);
            }
        }
    }
}

function handleGoalChange(e) {
    if (e.target.classList.contains('task-checkbox')) {
        const goalItem = e.target.closest('.goal-item');
        const goalId = parseInt(goalItem?.dataset.goalId);
        const monthKey = Utils.getMonthKey(AppState.currentMonth, AppState.currentYear);

        if (goalId && AppState.data.monthly[monthKey]) {
            const goal = AppState.data.monthly[monthKey].goals.find(g => g.id === goalId);
            if (goal) {
                goal.completed = e.target.checked;
                goalItem.classList.toggle('completed', goal.completed);
                saveData();
            }
        }
    }
}

function renderMonthlyPlanner() {
    const monthKey = Utils.getMonthKey(AppState.currentMonth, AppState.currentYear);
    renderCalendar();
    renderMonthlyGoals(monthKey);

    const lessonsTextarea = DOMCache.get('monthlyLessons');
    if (lessonsTextarea) {
        lessonsTextarea.value = AppState.data.lessons.monthly[monthKey] || '';
    }
}

function renderCalendar() {
    const calendar = DOMCache.get('calendar');
    if (!calendar) return;

    const firstDay = new Date(AppState.currentYear, AppState.currentMonth, 1);
    const lastDay = new Date(AppState.currentYear, AppState.currentMonth + 1, 0);
    const prevLastDay = new Date(AppState.currentYear, AppState.currentMonth, 0);

    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();
    const today = Utils.formatDate(new Date());

    let html = `
        <div class="calendar-header">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="calendar-day-name">${d}</div>`).join('')}
        </div>
        <div class="calendar-grid">
    `;

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">${daysInPrevMonth - i}</div>`;
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(AppState.currentYear, AppState.currentMonth, i);
        const dateKey = Utils.formatDate(date);
        const isToday = dateKey === today;
        const tasks = AppState.data.daily[dateKey]?.tasks || [];

        html += `
            <div class="calendar-day${isToday ? ' today' : ''}${tasks.length > 0 ? ' has-tasks' : ''}" data-date="${dateKey}">
                <div class="calendar-day-number">${i}</div>
                ${tasks.length > 0 ? `
                    <div class="calendar-day-tasks">
                        ${tasks.slice(0, 2).map(task => `
                            <div class="calendar-task${task.completed ? ' completed' : ''}">${Utils.sanitize(task.text)}</div>
                        `).join('')}
                        ${tasks.length > 2 ? `<div class="calendar-task-more">+${tasks.length - 2} more</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Next month days
    const totalCells = firstDayOfWeek + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
    }

    html += '</div>';
    calendar.innerHTML = html;

    // Add click handlers via event delegation
    calendar.addEventListener('click', (e) => {
        const dayEl = e.target.closest('.calendar-day:not(.other-month)');
        if (dayEl?.dataset.date) {
            const date = new Date(dayEl.dataset.date + 'T00:00:00');
            AppState.currentWeekStart = Utils.getWeekStart(date);
            document.querySelector('[data-tab="schedule"]')?.click();
        }
    });
}

function addMonthlyGoalHandler() {
    const input = DOMCache.get('monthlyGoalInput');
    const goalText = input?.value.trim();
    if (!goalText) return;

    const monthKey = Utils.getMonthKey(AppState.currentMonth, AppState.currentYear);
    if (!AppState.data.monthly[monthKey]) {
        AppState.data.monthly[monthKey] = { goals: [] };
    }

    AppState.data.monthly[monthKey].goals.push({
        id: Date.now(),
        text: Utils.sanitize(goalText),
        completed: false
    });

    input.value = '';
    saveData();
    renderMonthlyGoals(monthKey);
}

function renderMonthlyGoals(monthKey) {
    const goalList = DOMCache.get('monthlyGoalList');
    if (!goalList) return;

    const goals = AppState.data.monthly[monthKey]?.goals || [];

    if (goals.length === 0) {
        goalList.innerHTML = '<li class="empty-list">No goals yet. Add one above!</li>';
        return;
    }

    goalList.innerHTML = goals.map(goal => `
        <li class="goal-item${goal.completed ? ' completed' : ''}" data-goal-id="${goal.id}">
            <input type="checkbox" class="task-checkbox" ${goal.completed ? 'checked' : ''}>
            <span class="task-text">${Utils.sanitize(goal.text)}</span>
            <button class="delete-btn">×</button>
        </li>
    `).join('');
}

function saveMonthlyLessonsHandler() {
    const textarea = DOMCache.get('monthlyLessons');
    const monthKey = Utils.getMonthKey(AppState.currentMonth, AppState.currentYear);
    AppState.data.lessons.monthly[monthKey] = textarea?.value || '';
    saveData();

    const btn = DOMCache.get('saveMonthlyLessons');
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓ Saved!';
        btn.style.background = 'var(--accent-secondary)';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 1500);
    }
}

// ==================== Eisenhower Matrix with Event Delegation ====================
function initEisenhowerMatrix() {
    const matrix = document.querySelector('.eisenhower-matrix');
    if (!matrix) return;

    // Event delegation for add buttons and inputs
    matrix.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-matrix-task')) {
            const quadrant = e.target.dataset.quadrant;
            addEisenhowerTask(quadrant);
        }
        if (e.target.classList.contains('delete-btn')) {
            const taskItem = e.target.closest('.matrix-task-item');
            const taskId = parseInt(taskItem?.dataset.taskId);
            const quadrant = taskItem?.dataset.quadrant;
            if (taskId && quadrant) {
                deleteEisenhowerTask(taskId, quadrant);
            }
        }
    });

    matrix.addEventListener('change', (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            const taskItem = e.target.closest('.matrix-task-item');
            const taskId = parseInt(taskItem?.dataset.taskId);
            const quadrant = taskItem?.dataset.quadrant;
            if (taskId && quadrant) {
                toggleEisenhowerTask(taskId, quadrant, e.target.checked);
                taskItem.classList.toggle('completed', e.target.checked);
            }
        }
    });

    matrix.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('matrix-input')) {
            const quadrant = e.target.dataset.quadrant;
            addEisenhowerTask(quadrant);
        }
    });

    renderEisenhowerMatrix();
}

function addEisenhowerTask(quadrant) {
    const input = document.querySelector(`.matrix-input[data-quadrant="${quadrant}"]`);
    const durationInput = document.querySelector(`.matrix-duration[data-quadrant="${quadrant}"]`);
    const scheduleInput = document.querySelector(`.matrix-schedule[data-quadrant="${quadrant}"]`);

    const taskText = input?.value.trim();
    if (!taskText) return;

    const duration = parseFloat(durationInput?.value) || 0;
    const scheduledDate = scheduleInput?.value || null;

    const newTask = {
        id: Date.now(),
        text: Utils.sanitize(taskText),
        completed: false,
        quadrant,
        duration,
        scheduledDate,
        createdAt: new Date().toISOString()
    };

    AppState.data.eisenhower[quadrant].push(newTask);

    // If scheduled, add to daily tasks
    if (scheduledDate) {
        if (!AppState.data.daily[scheduledDate]) {
            AppState.data.daily[scheduledDate] = { tasks: [] };
        }
        AppState.data.daily[scheduledDate].tasks.push({
            id: newTask.id,
            text: taskText,
            completed: false,
            source: 'eisenhower',
            quadrant,
            duration
        });
    }

    input.value = '';
    if (durationInput) durationInput.value = '';
    if (scheduleInput) scheduleInput.value = '';

    saveData();
    renderEisenhowerMatrix();
}

function toggleEisenhowerTask(taskId, quadrant, completed) {
    const task = AppState.data.eisenhower[quadrant]?.find(t => t.id === taskId);
    if (!task) return;

    task.completed = completed;

    // Sync with daily if scheduled
    if (task.scheduledDate && AppState.data.daily[task.scheduledDate]) {
        const dailyTask = AppState.data.daily[task.scheduledDate].tasks.find(t => t.id === taskId);
        if (dailyTask) dailyTask.completed = completed;
    }

    saveData();
}

function deleteEisenhowerTask(taskId, quadrant) {
    const tasks = AppState.data.eisenhower[quadrant];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = tasks[taskIndex];
    tasks.splice(taskIndex, 1);

    // Remove from daily if scheduled
    if (task.scheduledDate && AppState.data.daily[task.scheduledDate]) {
        const dailyTasks = AppState.data.daily[task.scheduledDate].tasks;
        const dailyIndex = dailyTasks.findIndex(t => t.id === taskId);
        if (dailyIndex !== -1) dailyTasks.splice(dailyIndex, 1);
    }

    saveData();
    renderEisenhowerMatrix();
}

function renderEisenhowerMatrix() {
    const quadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];

    quadrants.forEach(quadrant => {
        const taskList = document.querySelector(`.matrix-task-list[data-quadrant="${quadrant}"]`);
        if (!taskList) return;

        const tasks = AppState.data.eisenhower[quadrant] || [];

        if (tasks.length === 0) {
            taskList.innerHTML = '<li class="empty-quadrant">No tasks in this quadrant</li>';
            return;
        }

        taskList.innerHTML = tasks.map(task => `
            <li class="matrix-task-item${task.completed ? ' completed' : ''}" data-task-id="${task.id}" data-quadrant="${quadrant}">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <span class="task-text">${Utils.sanitize(task.text)}</span>
                    <div class="task-meta">
                        ${task.duration > 0 ? `<span class="task-duration">${task.duration}h</span>` : ''}
                        ${task.scheduledDate ? `<span class="task-scheduled">${new Date(task.scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>` : ''}
                    </div>
                </div>
                <button class="delete-btn">×</button>
            </li>
        `).join('');
    });

    renderMatrixStats();
}

function renderMatrixStats() {
    const statsContainer = DOMCache.get('matrixStats');
    if (!statsContainer) return;

    const quadrantNames = {
        'urgent-important': 'Do First',
        'not-urgent-important': 'Schedule',
        'urgent-not-important': 'Delegate',
        'not-urgent-not-important': 'Eliminate'
    };
    const quadrantColors = {
        'urgent-important': 'var(--urgent-important)',
        'not-urgent-important': 'var(--not-urgent-important)',
        'urgent-not-important': 'var(--urgent-not-important)',
        'not-urgent-not-important': 'var(--not-urgent-not-important)'
    };

    let totalHours = 0, totalTasks = 0, completedTasks = 0;
    let cardsHTML = '';

    Object.keys(quadrantNames).forEach(quadrant => {
        const tasks = AppState.data.eisenhower[quadrant] || [];
        const hours = tasks.reduce((sum, task) => sum + (task.duration || 0), 0);
        const count = tasks.length;
        const completed = tasks.filter(t => t.completed).length;

        totalHours += hours;
        totalTasks += count;
        completedTasks += completed;

        cardsHTML += `
            <div class="stat-card" style="border-left-color: ${quadrantColors[quadrant]}">
                <div class="stat-label">${quadrantNames[quadrant]}</div>
                <div class="stat-value">${count}</div>
                <div class="stat-detail">${completed}/${count} done · ${hours.toFixed(1)}h</div>
            </div>
        `;
    });

    statsContainer.innerHTML = `
        <div class="stat-card total">
            <div class="stat-label">Total Progress</div>
            <div class="stat-value">${completedTasks}/${totalTasks}</div>
            <div class="stat-detail">${totalHours.toFixed(1)} hours planned</div>
        </div>
        ${cardsHTML}
    `;
}

// ==================== Notes ====================
function initNotes() {
    DOMCache.get('addNote')?.addEventListener('click', addNoteHandler);

    // Event delegation for notes list
    DOMCache.get('notesList')?.addEventListener('click', (e) => {
        const noteItem = e.target.closest('.note-item');
        if (noteItem) {
            AppState.selectedNote = parseInt(noteItem.dataset.noteId);
            renderNotes();
        }
    });

    renderNotes();
}

function addNoteHandler() {
    const noteTitle = DOMCache.get('noteTitle');
    const title = noteTitle?.value.trim() || 'Untitled Note';

    const newNote = {
        id: Date.now(),
        title: Utils.sanitize(title),
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    AppState.data.notes.unshift(newNote);
    AppState.selectedNote = newNote.id;
    if (noteTitle) noteTitle.value = '';
    saveData();
    renderNotes();
}

function renderNotes() {
    const notesList = DOMCache.get('notesList');
    const noteEditor = DOMCache.get('noteEditor');

    if (!notesList || !noteEditor) return;

    // Render notes list
    if (AppState.data.notes.length === 0) {
        notesList.innerHTML = '<div class="empty-notes">No notes yet. Create one above!</div>';
    } else {
        notesList.innerHTML = AppState.data.notes.map(note => `
            <div class="note-item${note.id === AppState.selectedNote ? ' active' : ''}" data-note-id="${note.id}">
                <div class="note-item-title">${Utils.sanitize(note.title)}</div>
                <div class="note-item-date">${new Date(note.updatedAt).toLocaleDateString()}</div>
            </div>
        `).join('');
    }

    // Render note editor
    if (AppState.selectedNote) {
        const note = AppState.data.notes.find(n => n.id === AppState.selectedNote);
        if (note) {
            noteEditor.innerHTML = `
                <div class="note-editor-title">${Utils.sanitize(note.title)}</div>
                <div class="note-editor-date">Last updated: ${new Date(note.updatedAt).toLocaleString()}</div>
                <textarea class="note-editor-content" placeholder="Start writing...">${Utils.sanitize(note.content)}</textarea>
                <div class="note-actions">
                    <button class="btn btn-primary save-note-btn">Save</button>
                    <button class="btn btn-danger delete-note-btn">Delete</button>
                </div>
            `;

            const textarea = noteEditor.querySelector('.note-editor-content');
            const saveBtn = noteEditor.querySelector('.save-note-btn');
            const deleteBtn = noteEditor.querySelector('.delete-note-btn');

            saveBtn?.addEventListener('click', () => {
                note.content = textarea.value;
                note.updatedAt = new Date().toISOString();
                saveData();
                Utils.showToast('Note saved', 'success', 2000);
                renderNotes();
            });

            deleteBtn?.addEventListener('click', () => {
                if (confirm('Delete this note?')) {
                    const index = AppState.data.notes.indexOf(note);
                    AppState.data.notes.splice(index, 1);
                    AppState.selectedNote = null;
                    saveData();
                    renderNotes();
                }
            });
        }
    } else {
        noteEditor.innerHTML = '<p class="empty-state">Select a note or create a new one</p>';
    }
}

// ==================== Search (stub for accessibility tab) ====================
function initSearch() {
    const searchInput = DOMCache.get('searchInput');
    const clearSearch = DOMCache.get('clearSearch');
    const searchResults = DOMCache.get('searchResults');

    if (!searchInput) return;

    const performSearch = Utils.debounce(() => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            searchResults.innerHTML = '<p class="empty-state">Enter a search query to find tasks and notes</p>';
            return;
        }

        const results = [];

        // Search daily tasks
        Object.entries(AppState.data.daily).forEach(([dateKey, dayData]) => {
            dayData.tasks?.forEach(task => {
                if (task.text.toLowerCase().includes(query)) {
                    results.push({ type: 'task', date: dateKey, ...task });
                }
            });
        });

        // Search notes
        AppState.data.notes.forEach(note => {
            if (note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query)) {
                results.push({ type: 'note', ...note });
            }
        });

        if (results.length === 0) {
            searchResults.innerHTML = '<p class="empty-state">No results found</p>';
        } else {
            searchResults.innerHTML = results.map(item => `
                <div class="search-result-item" tabindex="0">
                    <div class="search-result-header">
                        <span class="search-result-text">${Utils.sanitize(item.text || item.title)}</span>
                    </div>
                    <div class="search-result-meta">
                        <span class="search-result-badge date">${item.type === 'task' ? item.date : 'Note'}</span>
                        ${item.quadrant ? `<span class="search-result-badge priority">${item.quadrant}</span>` : ''}
                    </div>
                </div>
            `).join('');
        }

        DOMCache.get('searchStats').innerHTML = `
            <div class="search-stat">
                <div class="search-stat-label">Results</div>
                <div class="search-stat-value">${results.length}</div>
            </div>
        `;
    }, 300);

    searchInput.addEventListener('input', performSearch);
    clearSearch?.addEventListener('click', () => {
        searchInput.value = '';
        searchResults.innerHTML = '<p class="empty-state">Enter a search query to find tasks and notes</p>';
        DOMCache.get('searchStats').innerHTML = '';
    });
}

// ==================== Import/Export ====================
function initImportExport() {
    const exportBtn = DOMCache.get('exportData');
    const importBtn = DOMCache.get('importData');
    const importFile = DOMCache.get('importFile');

    exportBtn?.addEventListener('click', () => {
        const dataStr = JSON.stringify(AppState.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `planner-backup-${Utils.formatDate(new Date())}.json`;
        link.click();
        URL.revokeObjectURL(url);
        Utils.showToast('Data exported', 'success');
    });

    importBtn?.addEventListener('click', () => importFile?.click());

    importFile?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (confirm('This will replace all current data. Continue?')) {
                    AppState.data = importedData;
                    saveDataImmediate(); // Save immediately for import
                    location.reload();
                }
            } catch (error) {
                Utils.showToast('Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
        importFile.value = ''; // Reset for future imports
    });
}

// ==================== Sidebar Toggle ====================
function initSidebarToggle() {
    const sidebarToggle = DOMCache.get('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');

    sidebarToggle?.addEventListener('click', () => {
        sidebar?.classList.toggle('collapsed');
        sidebarToggle.setAttribute('aria-expanded', !sidebar?.classList.contains('collapsed'));
    });
}

// ==================== Keyboard Shortcuts ====================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z - Undo (placeholder)
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            Utils.showToast('Undo not available in this version', 'info', 2000);
        }

        // Ctrl+F - Focus search
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            document.querySelector('[data-tab="search"]')?.click();
            setTimeout(() => DOMCache.get('searchInput')?.focus(), 100);
        }

        // Ctrl+N - New task
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            DOMCache.get('floatingAddBtn')?.click();
        }

        // ? - Toggle keyboard shortcuts help
        if (e.key === '?' && !e.target.matches('input, textarea')) {
            DOMCache.get('keyboardShortcuts')?.classList.toggle('hidden');
        }
    });
}

// ==================== Initialize App ====================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTabs();
    initWeeklyPlanner();
    initMonthlyPlanner();
    initEisenhowerMatrix();
    initNotes();
    initSearch();
    initImportExport();
    initSidebarToggle();
    initKeyboardShortcuts();
});
