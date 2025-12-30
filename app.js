// ==================== High-Performance Planner App ====================
// Streamlined and cleaned version

// Global state management
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
        lessons: {
            daily: {},
            monthly: {}
        }
    }
};

// Timer state for task timing
const TimerState = {
    taskName: '',
    startTime: null,
    elapsed: 0,
    running: false,
    interval: null,
    taskDuration: 0
};

// ==================== Utility Functions ====================
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

function getMonthKey(month, year) {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function saveData() {
    localStorage.setItem('plannerData', JSON.stringify(AppState.data));
}

function loadData() {
    const saved = localStorage.getItem('plannerData');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all properties exist
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
}

// ==================== Holiday Data ====================
const holidays = {
    '2025-01-01': 'New Year\'s Day',
    '2025-01-20': 'Martin Luther King Jr. Day',
    '2025-02-14': 'Valentine\'s Day',
    '2025-02-17': 'Presidents\' Day',
    '2025-03-17': 'St. Patrick\'s Day',
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
    '2025-12-31': 'New Year\'s Eve'
};

function getHoliday(date) {
    return holidays[formatDate(date)];
}

// ==================== Core Task Functions (Reusable) ====================
function createTask(text, options = {}) {
    const taskId = Date.now();
    const task = {
        id: taskId,
        text: text,
        completed: false,
        duration: options.duration || 0,
        createdAt: new Date().toISOString()
    };

    if (options.quadrant) {
        task.source = 'eisenhower';
        task.quadrant = options.quadrant;
    }

    return task;
}

function addTaskToDate(dateKey, task) {
    if (!AppState.data.daily[dateKey]) {
        AppState.data.daily[dateKey] = { tasks: [] };
    }
    AppState.data.daily[dateKey].tasks.push(task);

    // If it's an Eisenhower task, add to matrix too
    if (task.quadrant) {
        AppState.data.eisenhower[task.quadrant].push({
            ...task,
            scheduledDate: dateKey
        });
    }

    saveData();
}

function toggleTaskComplete(task, dateKey) {
    task.completed = !task.completed;

    // Sync with Eisenhower if applicable
    if (task.source === 'eisenhower' && task.quadrant) {
        const eisenTask = AppState.data.eisenhower[task.quadrant]?.find(t => t.id === task.id);
        if (eisenTask) {
            eisenTask.completed = task.completed;
        }
    }

    saveData();
}

function deleteTask(tasks, index, task) {
    tasks.splice(index, 1);

    // Remove from Eisenhower if applicable
    if (task.source === 'eisenhower' && task.quadrant) {
        const eisenTasks = AppState.data.eisenhower[task.quadrant];
        const eisenIndex = eisenTasks.findIndex(t => t.id === task.id);
        if (eisenIndex !== -1) {
            eisenTasks.splice(eisenIndex, 1);
        }
    }

    saveData();
}

// ==================== Tab Navigation ====================
function initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            navItems.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Refresh the view when switching tabs
            switch(targetTab) {
                case 'schedule':
                    renderWeeklyView();
                    break;
                case 'monthly':
                    renderMonthlyPlanner();
                    break;
                case 'eisenhower':
                    renderEisenhowerMatrix();
                    break;
                case 'notes':
                    renderNotes();
                    break;
            }
        });
    });
}

// ==================== Weekly Schedule ====================
function initWeeklyPlanner() {
    if (!AppState.currentWeekStart) {
        AppState.currentWeekStart = getWeekStart(new Date());
    }

    const prevWeek = document.getElementById('prevWeek');
    const nextWeek = document.getElementById('nextWeek');
    const thisWeekBtn = document.getElementById('thisWeekBtn');

    if (prevWeek) {
        prevWeek.addEventListener('click', () => {
            AppState.currentWeekStart.setDate(AppState.currentWeekStart.getDate() - 7);
            renderWeeklyView();
        });
    }

    if (nextWeek) {
        nextWeek.addEventListener('click', () => {
            AppState.currentWeekStart.setDate(AppState.currentWeekStart.getDate() + 7);
            renderWeeklyView();
        });
    }

    if (thisWeekBtn) {
        thisWeekBtn.addEventListener('click', () => {
            AppState.currentWeekStart = getWeekStart(new Date());
            renderWeeklyView();
        });
    }

    initTaskModal();
    initTimer();
    renderWeeklyView();
}

function renderWeeklyView() {
    const weekTitle = document.getElementById('weekTitle');
    const weekDateRange = document.getElementById('weekDateRange');
    const weekDaysContainer = document.getElementById('weekDaysContainer');

    if (!weekTitle || !weekDateRange || !weekDaysContainer) return;

    const today = formatDate(new Date());
    const weekEnd = new Date(AppState.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const isThisWeek = formatDate(AppState.currentWeekStart) <= today && today <= formatDate(weekEnd);

    weekTitle.textContent = isThisWeek ? 'This Week' : 'Week of ' + AppState.currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    weekDateRange.textContent = AppState.currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' - ' + weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    weekDaysContainer.innerHTML = '';

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
        const date = new Date(AppState.currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateKey = formatDate(date);
        const holiday = getHoliday(date);

        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        if (dateKey === today) {
            dayCard.classList.add('today');
        }

        const header = document.createElement('div');
        header.className = 'day-card-header';

        const dayInfo = document.createElement('div');
        dayInfo.className = 'day-info';

        const dayNameEl = document.createElement('span');
        dayNameEl.className = 'day-name';
        dayNameEl.textContent = dayNames[i];

        const dayDateEl = document.createElement('span');
        dayDateEl.className = 'day-date';
        dayDateEl.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        dayInfo.appendChild(dayNameEl);
        dayInfo.appendChild(dayDateEl);

        // Show holiday if any
        if (holiday) {
            const holidayBadge = document.createElement('span');
            holidayBadge.className = 'holiday-badge';
            holidayBadge.textContent = holiday;
            dayInfo.appendChild(holidayBadge);
        }

        const tasks = AppState.data.daily[dateKey]?.tasks || [];
        const taskCount = document.createElement('span');
        taskCount.className = 'day-task-count';
        taskCount.textContent = tasks.length === 0 ? 'No tasks' : `${tasks.length} task${tasks.length > 1 ? 's' : ''}`;

        header.appendChild(dayInfo);
        header.appendChild(taskCount);

        const tasksList = document.createElement('div');
        tasksList.className = 'day-tasks-list';

        if (tasks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'day-empty';
            empty.textContent = 'Click + to add tasks';
            tasksList.appendChild(empty);
        } else {
            tasks.forEach((task, index) => {
                const taskItem = createTaskElement(task, index, tasks, dateKey);
                tasksList.appendChild(taskItem);
            });
        }

        dayCard.appendChild(header);
        dayCard.appendChild(tasksList);
        weekDaysContainer.appendChild(dayCard);
    }
}

function createTaskElement(task, index, tasks, dateKey) {
    const taskItem = document.createElement('div');
    taskItem.className = 'day-task-item';
    if (task.completed) {
        taskItem.classList.add('completed');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
        toggleTaskComplete(task, dateKey);
        renderWeeklyView();
    });

    const taskText = document.createElement('span');
    taskText.className = 'task-text';
    const priorityIcons = {
        'urgent-important': '🔥 ',
        'not-urgent-important': '📅 ',
        'urgent-not-important': '⚡ ',
        'not-urgent-not-important': '🗑️ '
    };
    const icon = task.quadrant ? priorityIcons[task.quadrant] : '';
    taskText.textContent = icon + task.text;

    taskItem.appendChild(checkbox);
    taskItem.appendChild(taskText);

    if (task.duration && task.duration > 0) {
        const duration = document.createElement('span');
        duration.className = 'task-duration';
        duration.textContent = task.duration + 'h';
        taskItem.appendChild(duration);
    }

    if (!task.completed) {
        const startBtn = document.createElement('button');
        startBtn.className = 'task-start-btn';
        startBtn.textContent = '▶';
        startBtn.title = 'Start timer';
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startTaskTimer(task);
        });
        taskItem.appendChild(startBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(tasks, index, task);
        renderWeeklyView();
    });

    taskItem.appendChild(deleteBtn);
    return taskItem;
}

// ==================== Task Modal ====================
function initTaskModal() {
    const modal = document.getElementById('taskModal');
    const floatingBtn = document.getElementById('floatingAddBtn');
    const closeModal = document.getElementById('closeModal');
    const cancelModal = document.getElementById('cancelModal');
    const saveTaskBtn = document.getElementById('saveTask');
    const modalTaskDay = document.getElementById('modalTaskDay');

    if (!modal || !floatingBtn) return;

    function populateDayOptions() {
        modalTaskDay.innerHTML = '';
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let i = 0; i < 7; i++) {
            const date = new Date(AppState.currentWeekStart);
            date.setDate(date.getDate() + i);
            const dateKey = formatDate(date);

            const option = document.createElement('option');
            option.value = dateKey;
            option.textContent = dayNames[i] + ', ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (dateKey === formatDate(new Date())) {
                option.selected = true;
            }

            modalTaskDay.appendChild(option);
        }
    }

    floatingBtn.addEventListener('click', () => {
        populateDayOptions();
        modal.classList.remove('hidden');
        document.getElementById('modalTaskName').focus();
    });

    const closeModalFn = () => {
        modal.classList.add('hidden');
        document.getElementById('modalTaskName').value = '';
        document.getElementById('modalTaskPriority').value = '';
        document.getElementById('modalTaskDuration').value = '';
    };

    closeModal.addEventListener('click', closeModalFn);
    cancelModal.addEventListener('click', closeModalFn);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalFn();
        }
    });

    saveTaskBtn.addEventListener('click', () => {
        const taskName = document.getElementById('modalTaskName').value.trim();
        const dateKey = modalTaskDay.value;
        const priority = document.getElementById('modalTaskPriority').value;
        const duration = parseFloat(document.getElementById('modalTaskDuration').value) || 0;

        if (!taskName) {
            document.getElementById('modalTaskName').focus();
            return;
        }

        const task = createTask(taskName, { quadrant: priority || null, duration });
        addTaskToDate(dateKey, task);

        renderWeeklyView();
        if (priority) {
            renderEisenhowerMatrix();
        }
        closeModalFn();
    });

    document.getElementById('modalTaskName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveTaskBtn.click();
        }
    });
}

// ==================== Timer ====================
function initTimer() {
    const closeTimer = document.getElementById('closeTimer');
    const pauseTimer = document.getElementById('pauseTimer');
    const stopTimer = document.getElementById('stopTimer');

    if (!closeTimer) return;

    closeTimer.addEventListener('click', () => {
        document.getElementById('timerWidget').classList.add('hidden');
        pauseTimerFn();
    });

    pauseTimer.addEventListener('click', () => {
        if (TimerState.running) {
            pauseTimerFn();
            pauseTimer.textContent = '▶ Resume';
        } else {
            resumeTimerFn();
            pauseTimer.textContent = '⏸ Pause';
        }
    });

    stopTimer.addEventListener('click', () => {
        stopTimerFn();
        document.getElementById('timerWidget').classList.add('hidden');
    });
}

function startTaskTimer(task) {
    TimerState.taskName = task.text;
    TimerState.startTime = Date.now();
    TimerState.elapsed = 0;
    TimerState.running = true;
    TimerState.taskDuration = task.duration || 0;

    const timerWidget = document.getElementById('timerWidget');
    const timerTaskName = document.getElementById('timerTaskName');
    const pauseTimer = document.getElementById('pauseTimer');

    timerWidget.classList.remove('hidden');
    timerTaskName.textContent = task.text;
    pauseTimer.textContent = '⏸ Pause';

    updateTimer();
    TimerState.interval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!TimerState.running) return;

    const now = Date.now();
    TimerState.elapsed = Math.floor((now - TimerState.startTime) / 1000);

    const minutes = Math.floor(TimerState.elapsed / 60);
    const seconds = TimerState.elapsed % 60;

    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

    if (TimerState.taskDuration > 0) {
        const progressCircle = document.getElementById('progressCircle');
        const totalSeconds = TimerState.taskDuration * 3600;
        const progress = Math.min(TimerState.elapsed / totalSeconds, 1);
        const dashOffset = 565.48 * (1 - progress);
        progressCircle.style.strokeDashoffset = dashOffset;
    }
}

function pauseTimerFn() {
    TimerState.running = false;
    if (TimerState.interval) {
        clearInterval(TimerState.interval);
    }
}

function resumeTimerFn() {
    TimerState.running = true;
    TimerState.startTime = Date.now() - (TimerState.elapsed * 1000);
    TimerState.interval = setInterval(updateTimer, 1000);
}

function stopTimerFn() {
    pauseTimerFn();
    TimerState.taskName = '';
    TimerState.elapsed = 0;
    document.getElementById('timerDisplay').textContent = '00:00';
    document.getElementById('progressCircle').style.strokeDashoffset = 565.48;
}

// ==================== Monthly Planner ====================
function initMonthlyPlanner() {
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    const thisMonthBtn = document.getElementById('thisMonthBtn');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const addMonthlyGoal = document.getElementById('addMonthlyGoal');
    const monthlyGoalInput = document.getElementById('monthlyGoalInput');
    const saveMonthlyLessons = document.getElementById('saveMonthlyLessons');

    // Populate month select
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    // Populate year select
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 3; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    monthSelect.value = AppState.currentMonth;
    yearSelect.value = AppState.currentYear;

    monthSelect.addEventListener('change', (e) => {
        AppState.currentMonth = parseInt(e.target.value);
        renderMonthlyPlanner();
    });

    yearSelect.addEventListener('change', (e) => {
        AppState.currentYear = parseInt(e.target.value);
        renderMonthlyPlanner();
    });

    prevMonth.addEventListener('click', () => {
        AppState.currentMonth--;
        if (AppState.currentMonth < 0) {
            AppState.currentMonth = 11;
            AppState.currentYear--;
        }
        monthSelect.value = AppState.currentMonth;
        yearSelect.value = AppState.currentYear;
        renderMonthlyPlanner();
    });

    nextMonth.addEventListener('click', () => {
        AppState.currentMonth++;
        if (AppState.currentMonth > 11) {
            AppState.currentMonth = 0;
            AppState.currentYear++;
        }
        monthSelect.value = AppState.currentMonth;
        yearSelect.value = AppState.currentYear;
        renderMonthlyPlanner();
    });

    thisMonthBtn.addEventListener('click', () => {
        AppState.currentMonth = new Date().getMonth();
        AppState.currentYear = new Date().getFullYear();
        monthSelect.value = AppState.currentMonth;
        yearSelect.value = AppState.currentYear;
        renderMonthlyPlanner();
    });

    addMonthlyGoal.addEventListener('click', () => addMonthlyGoalHandler());
    monthlyGoalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addMonthlyGoalHandler();
    });

    saveMonthlyLessons.addEventListener('click', saveMonthlyLessonsHandler);

    renderMonthlyPlanner();
}

function renderMonthlyPlanner() {
    const monthKey = getMonthKey(AppState.currentMonth, AppState.currentYear);

    renderCalendar();
    renderMonthlyGoals(monthKey);

    // Load lessons
    const lessonsTextarea = document.getElementById('monthlyLessons');
    if (lessonsTextarea) {
        lessonsTextarea.value = AppState.data.lessons.monthly[monthKey] || '';
    }
}

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    // Create header
    const header = document.createElement('div');
    header.className = 'calendar-header';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(name => {
        const dayName = document.createElement('div');
        dayName.className = 'calendar-day-name';
        dayName.textContent = name;
        header.appendChild(dayName);
    });
    calendar.appendChild(header);

    // Create grid
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    const firstDay = new Date(AppState.currentYear, AppState.currentMonth, 1);
    const lastDay = new Date(AppState.currentYear, AppState.currentMonth + 1, 0);
    const prevLastDay = new Date(AppState.currentYear, AppState.currentMonth, 0);

    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();

    const today = formatDate(new Date());

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = daysInPrevMonth - i;
        grid.appendChild(day);
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(AppState.currentYear, AppState.currentMonth, i);
        const dateKey = formatDate(date);

        const day = document.createElement('div');
        day.className = 'calendar-day';

        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = i;
        day.appendChild(dayNumber);

        if (dateKey === today) {
            day.classList.add('today');
        }

        const tasks = AppState.data.daily[dateKey]?.tasks || [];
        if (tasks.length > 0) {
            day.classList.add('has-tasks');

            const taskList = document.createElement('div');
            taskList.className = 'calendar-day-tasks';

            tasks.slice(0, 2).forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'calendar-task';
                if (task.completed) {
                    taskDiv.classList.add('completed');
                }
                taskDiv.textContent = task.text;
                taskList.appendChild(taskDiv);
            });

            if (tasks.length > 2) {
                const more = document.createElement('div');
                more.className = 'calendar-task-more';
                more.textContent = `+${tasks.length - 2} more`;
                taskList.appendChild(more);
            }

            day.appendChild(taskList);
        }

        day.addEventListener('click', () => {
            // Switch to schedule tab and scroll to that week
            AppState.currentWeekStart = getWeekStart(date);
            document.querySelector('[data-tab="schedule"]').click();
        });

        grid.appendChild(day);
    }

    // Next month days
    const totalCells = firstDayOfWeek + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = i;
        grid.appendChild(day);
    }

    calendar.appendChild(grid);
}

function addMonthlyGoalHandler() {
    const input = document.getElementById('monthlyGoalInput');
    const goalText = input.value.trim();
    if (!goalText) return;

    const monthKey = getMonthKey(AppState.currentMonth, AppState.currentYear);
    if (!AppState.data.monthly[monthKey]) {
        AppState.data.monthly[monthKey] = { goals: [] };
    }

    AppState.data.monthly[monthKey].goals.push({
        id: Date.now(),
        text: goalText,
        completed: false
    });

    input.value = '';
    saveData();
    renderMonthlyGoals(monthKey);
}

function renderMonthlyGoals(monthKey) {
    const goalList = document.getElementById('monthlyGoalList');
    goalList.innerHTML = '';

    const goals = AppState.data.monthly[monthKey]?.goals || [];

    if (goals.length === 0) {
        goalList.innerHTML = '<li class="empty-list">No goals yet. Add one above!</li>';
        return;
    }

    goals.forEach((goal, index) => {
        const li = document.createElement('li');
        li.className = `goal-item ${goal.completed ? 'completed' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = goal.completed;
        checkbox.addEventListener('change', () => {
            goal.completed = checkbox.checked;
            saveData();
            renderMonthlyGoals(monthKey);
        });

        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = goal.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', () => {
            goals.splice(index, 1);
            saveData();
            renderMonthlyGoals(monthKey);
        });

        li.appendChild(checkbox);
        li.appendChild(text);
        li.appendChild(deleteBtn);
        goalList.appendChild(li);
    });
}

function saveMonthlyLessonsHandler() {
    const textarea = document.getElementById('monthlyLessons');
    const monthKey = getMonthKey(AppState.currentMonth, AppState.currentYear);
    AppState.data.lessons.monthly[monthKey] = textarea.value;
    saveData();

    // Show brief success indicator
    const btn = document.getElementById('saveMonthlyLessons');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = 'var(--accent-secondary)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1500);
}

// ==================== Eisenhower Matrix ====================
function initEisenhowerMatrix() {
    const addButtons = document.querySelectorAll('.add-matrix-task');

    addButtons.forEach(button => {
        button.addEventListener('click', () => {
            const quadrant = button.dataset.quadrant;
            const input = document.querySelector(`.matrix-input[data-quadrant="${quadrant}"]`);
            const durationInput = document.querySelector(`.matrix-duration[data-quadrant="${quadrant}"]`);
            const scheduleInput = document.querySelector(`.matrix-schedule[data-quadrant="${quadrant}"]`);

            const taskText = input.value.trim();
            if (!taskText) return;

            const duration = parseFloat(durationInput.value) || 0;
            const scheduledDate = scheduleInput.value || null;

            const newTask = {
                id: Date.now(),
                text: taskText,
                completed: false,
                quadrant: quadrant,
                duration: duration,
                scheduledDate: scheduledDate,
                createdAt: new Date().toISOString()
            };

            AppState.data.eisenhower[quadrant].push(newTask);

            // If scheduled, add to daily tasks for that date
            if (scheduledDate) {
                if (!AppState.data.daily[scheduledDate]) {
                    AppState.data.daily[scheduledDate] = { tasks: [] };
                }

                AppState.data.daily[scheduledDate].tasks.push({
                    id: newTask.id,
                    text: taskText,
                    completed: false,
                    source: 'eisenhower',
                    quadrant: quadrant,
                    duration: duration
                });
            }

            input.value = '';
            durationInput.value = '';
            scheduleInput.value = '';
            saveData();
            renderEisenhowerMatrix();
        });

        const input = document.querySelector(`.matrix-input[data-quadrant="${button.dataset.quadrant}"]`);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                button.click();
            }
        });
    });

    renderEisenhowerMatrix();
}

function renderEisenhowerMatrix() {
    const quadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];

    quadrants.forEach(quadrant => {
        const taskList = document.querySelector(`.matrix-task-list[data-quadrant="${quadrant}"]`);
        taskList.innerHTML = '';

        const tasks = AppState.data.eisenhower[quadrant] || [];

        if (tasks.length === 0) {
            taskList.innerHTML = '<li class="empty-quadrant">No tasks in this quadrant</li>';
            return;
        }

        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = 'matrix-task-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => {
                task.completed = checkbox.checked;
                li.classList.toggle('completed', task.completed);

                // Update in daily tasks if scheduled
                if (task.scheduledDate && AppState.data.daily[task.scheduledDate]) {
                    const dailyTask = AppState.data.daily[task.scheduledDate].tasks.find(t => t.id === task.id);
                    if (dailyTask) {
                        dailyTask.completed = task.completed;
                    }
                }

                saveData();
            });

            const textContainer = document.createElement('div');
            textContainer.className = 'task-content';

            const text = document.createElement('span');
            text.className = 'task-text';
            text.textContent = task.text;

            const metaInfo = document.createElement('div');
            metaInfo.className = 'task-meta';

            if (task.duration && task.duration > 0) {
                const durationBadge = document.createElement('span');
                durationBadge.className = 'task-duration';
                durationBadge.textContent = `${task.duration}h`;
                metaInfo.appendChild(durationBadge);
            }

            if (task.scheduledDate) {
                const scheduleBadge = document.createElement('span');
                scheduleBadge.className = 'task-scheduled';
                const schedDate = new Date(task.scheduledDate + 'T00:00:00');
                scheduleBadge.textContent = schedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                metaInfo.appendChild(scheduleBadge);
            }

            textContainer.appendChild(text);
            if (metaInfo.children.length > 0) {
                textContainer.appendChild(metaInfo);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', () => {
                // Remove from eisenhower
                tasks.splice(index, 1);

                // Remove from daily tasks if scheduled
                if (task.scheduledDate && AppState.data.daily[task.scheduledDate]) {
                    const dailyTasks = AppState.data.daily[task.scheduledDate].tasks;
                    const dailyIndex = dailyTasks.findIndex(t => t.id === task.id);
                    if (dailyIndex !== -1) {
                        dailyTasks.splice(dailyIndex, 1);
                    }
                }

                saveData();
                renderEisenhowerMatrix();
            });

            if (task.completed) {
                li.classList.add('completed');
            }

            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(deleteBtn);
            taskList.appendChild(li);
        });
    });

    renderMatrixStats();
}

function renderMatrixStats() {
    const statsContainer = document.getElementById('matrixStats');
    if (!statsContainer) return;

    statsContainer.innerHTML = '';

    const quadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
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

    let totalHours = 0;
    let totalTasks = 0;
    let completedTasks = 0;

    quadrants.forEach(quadrant => {
        const tasks = AppState.data.eisenhower[quadrant] || [];
        const hours = tasks.reduce((sum, task) => sum + (task.duration || 0), 0);
        const count = tasks.length;
        const completed = tasks.filter(t => t.completed).length;

        totalHours += hours;
        totalTasks += count;
        completedTasks += completed;

        const card = document.createElement('div');
        card.className = 'stat-card';
        card.style.borderLeftColor = quadrantColors[quadrant];

        card.innerHTML = `
            <div class="stat-label">${quadrantNames[quadrant]}</div>
            <div class="stat-value">${count}</div>
            <div class="stat-detail">${completed}/${count} done · ${hours.toFixed(1)}h</div>
        `;

        statsContainer.appendChild(card);
    });

    // Add total card at the beginning
    const totalCard = document.createElement('div');
    totalCard.className = 'stat-card total';
    totalCard.innerHTML = `
        <div class="stat-label">Total Progress</div>
        <div class="stat-value">${completedTasks}/${totalTasks}</div>
        <div class="stat-detail">${totalHours.toFixed(1)} hours planned</div>
    `;
    statsContainer.insertBefore(totalCard, statsContainer.firstChild);
}

// ==================== Notes ====================
function initNotes() {
    const addNote = document.getElementById('addNote');
    const noteTitle = document.getElementById('noteTitle');

    addNote.addEventListener('click', () => {
        const title = noteTitle.value.trim() || 'Untitled Note';

        const newNote = {
            id: Date.now(),
            title: title,
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        AppState.data.notes.unshift(newNote);
        AppState.selectedNote = newNote.id;
        noteTitle.value = '';
        saveData();
        renderNotes();
    });

    renderNotes();
}

function renderNotes() {
    const notesList = document.getElementById('notesList');
    const noteEditor = document.getElementById('noteEditor');

    // Render notes list
    notesList.innerHTML = '';

    if (AppState.data.notes.length === 0) {
        notesList.innerHTML = '<div class="empty-notes">No notes yet. Create one above!</div>';
    } else {
        AppState.data.notes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = `note-item ${note.id === AppState.selectedNote ? 'active' : ''}`;

            const noteItemTitle = document.createElement('div');
            noteItemTitle.className = 'note-item-title';
            noteItemTitle.textContent = note.title;

            const noteItemDate = document.createElement('div');
            noteItemDate.className = 'note-item-date';
            noteItemDate.textContent = new Date(note.updatedAt).toLocaleDateString();

            noteItem.appendChild(noteItemTitle);
            noteItem.appendChild(noteItemDate);

            noteItem.addEventListener('click', () => {
                AppState.selectedNote = note.id;
                renderNotes();
            });

            notesList.appendChild(noteItem);
        });
    }

    // Render note editor
    if (AppState.selectedNote) {
        const note = AppState.data.notes.find(n => n.id === AppState.selectedNote);
        if (note) {
            noteEditor.innerHTML = `
                <div class="note-editor-title">${note.title}</div>
                <div class="note-editor-date">Last updated: ${new Date(note.updatedAt).toLocaleString()}</div>
                <textarea class="note-editor-content" placeholder="Start writing...">${note.content}</textarea>
                <div class="note-actions">
                    <button class="btn btn-primary save-note-btn">Save</button>
                    <button class="btn btn-danger delete-note-btn">Delete</button>
                </div>
            `;

            const textarea = noteEditor.querySelector('.note-editor-content');
            const saveBtn = noteEditor.querySelector('.save-note-btn');
            const deleteBtn = noteEditor.querySelector('.delete-note-btn');

            saveBtn.addEventListener('click', () => {
                note.content = textarea.value;
                note.updatedAt = new Date().toISOString();
                saveData();

                saveBtn.textContent = '✓ Saved!';
                saveBtn.style.background = 'var(--accent-secondary)';
                setTimeout(() => {
                    saveBtn.textContent = 'Save';
                    saveBtn.style.background = '';
                }, 1500);

                renderNotes();
            });

            deleteBtn.addEventListener('click', () => {
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

// ==================== Import/Export ====================
function initImportExport() {
    const exportBtn = document.getElementById('exportData');
    const importBtn = document.getElementById('importData');
    const importFile = document.getElementById('importFile');

    exportBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(AppState.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `planner-backup-${formatDate(new Date())}.json`;
        link.click();
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (confirm('This will replace all current data. Continue?')) {
                    AppState.data = importedData;
                    saveData();
                    location.reload();
                }
            } catch (error) {
                alert('Invalid file format. Please select a valid backup file.');
            }
        };
        reader.readAsText(file);
    });
}

// ==================== Sidebar Toggle ====================
function initSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
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
    initImportExport();
    initSidebarToggle();
});
