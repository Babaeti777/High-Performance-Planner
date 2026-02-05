// ==================== High-Performance Planner App ====================
// Enhanced with Gantt charts, Week view, and smart matrix sorting

// Global state management
const AppState = {
    currentDate: new Date(),
    currentWeekStart: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedNote: null,
    selectedDate: null,  // For Day/Week popup
    popupWeekStart: null, // For week view in popup
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

// Routines state
const RoutinesState = {
    routines: JSON.parse(localStorage.getItem('dailyRoutines') || '[]'),
    editingId: null,
    clockInterval: null
};

// Default routines for new users (with emojis)
const DEFAULT_ROUTINES = [
    { id: 1, name: 'Morning Routine', emoji: '🌅', startTime: '06:00', duration: 1, color: '#10b981', days: [0,1,2,3,4,5,6] },
    { id: 2, name: 'Exercise', emoji: '💪', startTime: '07:00', duration: 1, color: '#f59e0b', days: [1,2,3,4,5] },
    { id: 3, name: 'Work Block 1', emoji: '💼', startTime: '09:00', duration: 3, color: '#6366f1', days: [1,2,3,4,5] },
    { id: 4, name: 'Lunch', emoji: '🍽️', startTime: '12:00', duration: 1, color: '#ec4899', days: [0,1,2,3,4,5,6] },
    { id: 5, name: 'Work Block 2', emoji: '💻', startTime: '13:00', duration: 4, color: '#6366f1', days: [1,2,3,4,5] },
    { id: 6, name: 'Evening Routine', emoji: '🌙', startTime: '21:00', duration: 1, color: '#8b5cf6', days: [0,1,2,3,4,5,6] }
];

// Timer state for countdown timer
const TimerState = {
    taskName: '',
    taskId: null,
    taskDateKey: null,
    originalDuration: 0,
    remainingSeconds: 0,
    running: false,
    interval: null,
    motivationInterval: null,
    isFullscreen: false,
    isOvertime: false
};

// Motivational quotes
const MOTIVATION_QUOTES = [
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { quote: "It's not about having time, it's about making time.", author: "Unknown" },
    { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { quote: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { quote: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
    { quote: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { quote: "Small daily improvements are the key to staggering long-term results.", author: "Unknown" },
    { quote: "Productivity is never an accident. It is always the result of commitment.", author: "Paul J. Meyer" },
    { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { quote: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { quote: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
    { quote: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
    { quote: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
    { quote: "The future depends on what you do today.", author: "Mahatma Gandhi" },
    { quote: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
    { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
];

// Eisenhower quadrant colors
const QUADRANT_COLORS = {
    'urgent-important': '#ef4444',
    'not-urgent-important': '#6366f1',
    'urgent-not-important': '#f59e0b',
    'not-urgent-not-important': '#64748b'
};

const QUADRANT_NAMES = {
    'urgent-important': 'Do First',
    'not-urgent-important': 'Schedule',
    'urgent-not-important': 'Delegate',
    'not-urgent-not-important': 'Eliminate'
};

// ==================== Calendar & Time Constants ====================
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const DAY_VIEW_PX_PER_HOUR = 60;
const WEEK_VIEW_PX_PER_HOUR = 50;
const GANTT_BAR_HEIGHT = 40;
const MAX_VISIBLE_TASKS_CALENDAR = 3;
const DEFAULT_START_TIME = '09:00';
const DEFAULT_DURATION = 1;

// ==================== Utility Functions ====================
function formatDate(date) {
    // Use local time to avoid timezone shifting issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
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
    '2025-12-31': 'New Year\'s Eve',
    '2026-01-01': 'New Year\'s Day'
};

function getHoliday(date) {
    return holidays[formatDate(date)];
}

// ==================== Core Task Functions ====================
function createTask(text, options = {}) {
    const taskId = Date.now() + Math.random();
    const task = {
        id: taskId,
        text: text,
        completed: false,
        duration: options.duration || DEFAULT_DURATION,
        startTime: options.startTime || DEFAULT_START_TIME,
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

    // Check if all tasks for the day are complete - trigger auto-push
    checkAndAutoPushNextDay(dateKey);
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
            showTab(targetTab);
        });
    });
}

// Show a specific tab by name
function showTab(targetTab) {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    document.querySelector(`.nav-item[data-tab="${targetTab}"]`)?.classList.add('active');
    document.getElementById(targetTab)?.classList.add('active');

    // Refresh the view when switching tabs
    switch(targetTab) {
        case 'calendar':
            renderCalendar();
            break;
        case 'eisenhower':
            renderEisenhowerMatrix();
            break;
        case 'notes':
            renderNotes();
            break;
        case 'bids':
            if (typeof BidTracker !== 'undefined') {
                BidTracker.render();
            }
            break;
    }
}

// ==================== Calendar (Monthly View) ====================
function initCalendar() {
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
        renderCalendar();
    });

    yearSelect.addEventListener('change', (e) => {
        AppState.currentYear = parseInt(e.target.value);
        renderCalendar();
    });

    prevMonth.addEventListener('click', () => {
        AppState.currentMonth--;
        if (AppState.currentMonth < 0) {
            AppState.currentMonth = 11;
            AppState.currentYear--;
        }
        monthSelect.value = AppState.currentMonth;
        yearSelect.value = AppState.currentYear;
        renderCalendar();
    });

    nextMonth.addEventListener('click', () => {
        AppState.currentMonth++;
        if (AppState.currentMonth > 11) {
            AppState.currentMonth = 0;
            AppState.currentYear++;
        }
        monthSelect.value = AppState.currentMonth;
        yearSelect.value = AppState.currentYear;
        renderCalendar();
    });

    thisMonthBtn.addEventListener('click', () => {
        const now = new Date();
        AppState.currentMonth = now.getMonth();
        AppState.currentYear = now.getFullYear();
        monthSelect.value = AppState.currentMonth;
        yearSelect.value = AppState.currentYear;
        renderCalendar();
    });

    addMonthlyGoal.addEventListener('click', () => addMonthlyGoalHandler());
    monthlyGoalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addMonthlyGoalHandler();
    });

    saveMonthlyLessons.addEventListener('click', saveMonthlyLessonsHandler);

    renderCalendar();
}

function renderCalendar() {
    const calendar = document.getElementById('calendarGrid');
    if (!calendar) return;

    calendar.innerHTML = '';
    const monthKey = getMonthKey(AppState.currentMonth, AppState.currentYear);

    // Create header
    const header = document.createElement('div');
    header.className = 'calendar-header';
    DAY_NAMES.forEach(name => {
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

            // Show tasks with colors based on quadrant
            tasks.slice(0, MAX_VISIBLE_TASKS_CALENDAR).forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'calendar-task';
                if (task.completed) {
                    taskDiv.classList.add('completed');
                }
                if (task.quadrant) {
                    taskDiv.style.borderLeftColor = QUADRANT_COLORS[task.quadrant];
                }

                // Show duration
                const durationText = task.duration ? ` (${task.duration}h)` : '';
                taskDiv.textContent = task.text + durationText;
                taskList.appendChild(taskDiv);
            });

            if (tasks.length > MAX_VISIBLE_TASKS_CALENDAR) {
                const more = document.createElement('div');
                more.className = 'calendar-task-more';
                more.textContent = `+${tasks.length - MAX_VISIBLE_TASKS_CALENDAR} more`;
                taskList.appendChild(more);
            }

            day.appendChild(taskList);
        }

        // Click to open Day/Week popup
        day.addEventListener('click', () => {
            openDayWeekPopup(date);
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

    // Render monthly goals
    renderMonthlyGoals(monthKey);

    // Load lessons
    const lessonsTextarea = document.getElementById('monthlyLessons');
    if (lessonsTextarea) {
        lessonsTextarea.value = AppState.data.lessons.monthly[monthKey] || '';
    }
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
    if (!goalList) return;

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

    const btn = document.getElementById('saveMonthlyLessons');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = 'var(--accent-secondary)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1500);
}

// ==================== Day/Week Popup ====================
function initDayWeekPopup() {
    const modal = document.getElementById('dayWeekModal');
    const closeDayWeek = document.getElementById('closeDayWeek');
    const closeDayWeekBtn = document.getElementById('closeDayWeekBtn');
    const viewTabs = document.querySelectorAll('.view-tab');
    const openMatrixBtn = document.getElementById('openMatrixFromDay');
    const addTaskBtn = document.getElementById('addTaskFromPopup');
    const prevWeekBtn = document.getElementById('prevWeekPopup');
    const nextWeekBtn = document.getElementById('nextWeekPopup');

    // Close handlers
    const closePopup = () => {
        modal.classList.add('hidden');
    };

    closeDayWeek.addEventListener('click', closePopup);
    closeDayWeekBtn.addEventListener('click', closePopup);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePopup();
    });

    // Tab switching
    viewTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            viewTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const view = tab.dataset.view;
            const dayView = document.getElementById('dayViewContainer');
            const weekView = document.getElementById('weekViewContainer');

            if (view === 'day') {
                dayView.classList.remove('hidden');
                weekView.classList.add('hidden');
                renderDayView(AppState.selectedDate);
            } else {
                dayView.classList.add('hidden');
                weekView.classList.remove('hidden');
                renderWeekView();
            }
        });
    });

    // Open Matrix button
    openMatrixBtn.addEventListener('click', () => {
        closePopup();
        document.querySelector('[data-tab="eisenhower"]').click();
    });

    // Add Task button
    addTaskBtn.addEventListener('click', () => {
        closePopup();
        openTaskModal(AppState.selectedDate);
    });

    // Week navigation in popup
    prevWeekBtn.addEventListener('click', () => {
        const newStart = new Date(AppState.popupWeekStart);
        newStart.setDate(newStart.getDate() - 7);
        AppState.popupWeekStart = newStart;
        renderWeekView();
    });

    nextWeekBtn.addEventListener('click', () => {
        const newStart = new Date(AppState.popupWeekStart);
        newStart.setDate(newStart.getDate() + 7);
        AppState.popupWeekStart = newStart;
        renderWeekView();
    });

    // Generate time labels
    generateTimeLabels();
}

function openDayWeekPopup(date) {
    AppState.selectedDate = date;
    AppState.popupWeekStart = getWeekStart(new Date(date));

    const modal = document.getElementById('dayWeekModal');
    const title = document.getElementById('dayWeekTitle');

    title.textContent = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Reset to day view
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.view-tab[data-view="day"]').classList.add('active');
    document.getElementById('dayViewContainer').classList.remove('hidden');
    document.getElementById('weekViewContainer').classList.add('hidden');

    modal.classList.remove('hidden');
    renderDayView(date);
}

function generateTimeLabels() {
    const ganttLabels = document.getElementById('ganttTimeLabels');
    const weekTimeColumn = document.getElementById('weekTimeColumn');

    // Clear existing labels to prevent duplication
    ganttLabels.innerHTML = '';
    weekTimeColumn.innerHTML = '';

    // Generate time slots using constants
    for (let hour = DAY_START_HOUR; hour <= DAY_END_HOUR; hour++) {
        const timeLabel = hour <= 12 ? `${hour === 0 ? 12 : hour}${hour < 12 ? 'AM' : 'PM'}` : `${hour - 12}PM`;

        // Gantt chart labels
        const ganttLabel = document.createElement('div');
        ganttLabel.className = 'gantt-time-label';
        ganttLabel.textContent = timeLabel;
        ganttLabels.appendChild(ganttLabel);

        // Week view time column
        const weekLabel = document.createElement('div');
        weekLabel.className = 'week-time-slot';
        weekLabel.textContent = timeLabel;
        weekTimeColumn.appendChild(weekLabel);
    }
}

// ==================== Day View (Gantt Chart) ====================
function renderDayView(date) {
    const dateKey = formatDate(date);
    const ganttChart = document.getElementById('ganttChart');
    const dayTaskList = document.getElementById('dayTaskList');

    ganttChart.innerHTML = '';
    dayTaskList.innerHTML = '';

    const tasks = AppState.data.daily[dateKey]?.tasks || [];

    if (tasks.length === 0) {
        ganttChart.innerHTML = '<div class="gantt-empty">No tasks scheduled for this day. Click "Add Task" to create one.</div>';
        return;
    }

    // Sort tasks by start time
    const sortedTasks = [...tasks].sort((a, b) => {
        const timeA = a.startTime || DEFAULT_START_TIME;
        const timeB = b.startTime || DEFAULT_START_TIME;
        return timeA.localeCompare(timeB);
    });

    // Calculate lanes for overlapping tasks
    function getTaskEndMinutes(task) {
        const startTime = task.startTime || DEFAULT_START_TIME;
        const duration = task.duration || DEFAULT_DURATION;
        const [startHour, startMin] = startTime.split(':').map(Number);
        return (startHour * 60 + startMin) + (duration * 60);
    }

    function getTaskStartMinutes(task) {
        const startTime = task.startTime || DEFAULT_START_TIME;
        const [startHour, startMin] = startTime.split(':').map(Number);
        return startHour * 60 + startMin;
    }

    // Assign lanes to avoid overlapping
    const taskLanes = [];
    sortedTasks.forEach(task => {
        const taskStart = getTaskStartMinutes(task);
        const taskEnd = getTaskEndMinutes(task);

        // Find the first lane where this task doesn't overlap
        let assignedLane = 0;
        for (let lane = 0; lane < taskLanes.length; lane++) {
            const laneEndTime = taskLanes[lane];
            if (taskStart >= laneEndTime) {
                assignedLane = lane;
                taskLanes[lane] = taskEnd;
                break;
            }
            assignedLane = lane + 1;
        }

        // If no suitable lane found, create a new one
        if (assignedLane >= taskLanes.length) {
            taskLanes.push(taskEnd);
        } else {
            taskLanes[assignedLane] = taskEnd;
        }

        task._lane = assignedLane;
    });

    const totalLanes = Math.max(taskLanes.length, 1);

    // Render Gantt bars with lane positioning
    sortedTasks.forEach((task) => {
        const startTime = task.startTime || DEFAULT_START_TIME;
        const duration = task.duration || DEFAULT_DURATION;
        const [startHour, startMin] = startTime.split(':').map(Number);

        // Calculate position using constants
        const startOffset = (startHour - DAY_START_HOUR) * DAY_VIEW_PX_PER_HOUR + startMin;
        const widthPx = duration * DAY_VIEW_PX_PER_HOUR;

        const ganttBar = document.createElement('div');
        ganttBar.className = 'gantt-bar';
        if (task.completed) ganttBar.classList.add('completed');

        const color = task.quadrant ? QUADRANT_COLORS[task.quadrant] : 'var(--accent-primary)';
        ganttBar.style.backgroundColor = color;
        ganttBar.style.left = `${startOffset}px`;
        ganttBar.style.width = `${widthPx}px`;
        ganttBar.style.top = `${task._lane * GANTT_BAR_HEIGHT}px`;

        ganttBar.innerHTML = `
            <span class="gantt-bar-text">${task.text}</span>
            <span class="gantt-bar-duration">${duration}h</span>
        `;

        ganttBar.addEventListener('click', () => {
            startTaskTimer(task, dateKey);
        });

        ganttChart.appendChild(ganttBar);

        // Add to task list
        const taskItem = document.createElement('div');
        taskItem.className = 'day-task-item-detail';
        if (task.completed) taskItem.classList.add('completed');

        const quadrantBadge = task.quadrant ? `<span class="quadrant-badge" style="background: ${QUADRANT_COLORS[task.quadrant]}">${QUADRANT_NAMES[task.quadrant]}</span>` : '';

        taskItem.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-info">
                <span class="task-name">${task.text}</span>
                <div class="task-meta-row">
                    <span class="task-time">${startTime} - ${calculateEndTime(startTime, duration)}</span>
                    <span class="task-duration-badge">${duration}h</span>
                    ${quadrantBadge}
                </div>
            </div>
            <div class="task-actions">
                <button class="timer-icon-btn" title="Start countdown timer">⏳</button>
                <button class="task-delete-btn" title="Delete">×</button>
            </div>
        `;

        const checkbox = taskItem.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => {
            toggleTaskComplete(task, dateKey);
            renderDayView(date);
        });

        const timerBtn = taskItem.querySelector('.timer-icon-btn');
        timerBtn.addEventListener('click', () => {
            startTaskTimer(task, dateKey);
        });

        const deleteBtn = taskItem.querySelector('.task-delete-btn');
        deleteBtn.addEventListener('click', () => {
            const dailyTasks = AppState.data.daily[dateKey].tasks;
            const taskIndex = dailyTasks.findIndex(t => t.id === task.id);
            if (taskIndex !== -1) {
                deleteTask(dailyTasks, taskIndex, task);
                renderDayView(date);
            }
        });

        dayTaskList.appendChild(taskItem);
    });
}

function calculateEndTime(startTime, duration) {
    const [hour, min] = startTime.split(':').map(Number);
    const endHour = hour + Math.floor(duration);
    const endMin = min + (duration % 1) * 60;
    const finalHour = endHour + Math.floor(endMin / 60);
    const finalMin = endMin % 60;
    return `${String(finalHour).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`;
}

// ==================== Week View (Google Calendar Style) ====================
function renderWeekView() {
    const weekDaysColumns = document.getElementById('weekDaysColumns');
    const weekRangeLabel = document.getElementById('weekRangeLabel');

    weekDaysColumns.innerHTML = '';

    const weekEnd = new Date(AppState.popupWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    weekRangeLabel.textContent = `${AppState.popupWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const today = formatDate(new Date());

    for (let i = 0; i < 7; i++) {
        const date = new Date(AppState.popupWeekStart);
        date.setDate(date.getDate() + i);
        const dateKey = formatDate(date);

        const dayColumn = document.createElement('div');
        dayColumn.className = 'week-day-column';
        if (dateKey === today) dayColumn.classList.add('today');

        // Day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        dayHeader.innerHTML = `
            <span class="week-day-name">${DAY_NAMES[i]}</span>
            <span class="week-day-date">${date.getDate()}</span>
        `;

        // Open matrix button for the day
        const openMatrixDayBtn = document.createElement('button');
        openMatrixDayBtn.className = 'open-matrix-day-btn';
        openMatrixDayBtn.textContent = '🎯';
        openMatrixDayBtn.title = 'Open Matrix for this day';
        openMatrixDayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            AppState.selectedDate = date;
            document.getElementById('dayWeekModal').classList.add('hidden');
            document.querySelector('[data-tab="eisenhower"]').click();
        });
        dayHeader.appendChild(openMatrixDayBtn);

        dayColumn.appendChild(dayHeader);

        // Tasks grid (time slots from 6AM to 10PM)
        const tasksGrid = document.createElement('div');
        tasksGrid.className = 'week-day-tasks-grid';

        // Create time slot backgrounds with click-to-add functionality
        for (let hour = DAY_START_HOUR; hour <= DAY_END_HOUR; hour++) {
            const slot = document.createElement('div');
            slot.className = 'week-time-slot-bg';
            slot.title = `Click to add task at ${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`;

            // Quick-add on click
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                const clickedHour = hour;
                openTaskModalWithTime(date, `${String(clickedHour).padStart(2, '0')}:00`);
            });

            tasksGrid.appendChild(slot);
        }

        // Add routines for this day
        const dayOfWeek = date.getDay(); // 0 = Sunday
        const dayRoutines = RoutinesState.routines.filter(r => r.days && r.days.includes(dayOfWeek));

        dayRoutines.forEach(routine => {
            const [startHour, startMin] = routine.startTime.split(':').map(Number);
            const duration = routine.duration || DEFAULT_DURATION;

            // Calculate position
            const topOffset = (startHour - DAY_START_HOUR) * WEEK_VIEW_PX_PER_HOUR + (startMin / 60) * WEEK_VIEW_PX_PER_HOUR;
            const height = duration * WEEK_VIEW_PX_PER_HOUR;

            // Skip if outside visible time range
            if (startHour < DAY_START_HOUR || startHour >= DAY_END_HOUR) return;

            const routineBlock = document.createElement('div');
            routineBlock.className = 'week-task-block week-routine-block';
            routineBlock.style.backgroundColor = routine.color || '#10b981';
            routineBlock.style.top = `${topOffset}px`;
            routineBlock.style.height = `${Math.max(height, 25)}px`;
            routineBlock.style.opacity = '0.7';
            routineBlock.style.borderStyle = 'dashed';

            routineBlock.innerHTML = `
                <span class="week-task-text">${routine.emoji || ''} ${routine.name}</span>
                <span class="week-task-duration">${duration}h</span>
            `;

            routineBlock.addEventListener('click', (e) => {
                e.stopPropagation();
                // Don't open task view for routines
            });

            tasksGrid.appendChild(routineBlock);
        });

        // Add tasks as positioned blocks
        const tasks = AppState.data.daily[dateKey]?.tasks || [];
        tasks.forEach(task => {
            const startTime = task.startTime || DEFAULT_START_TIME;
            const duration = task.duration || DEFAULT_DURATION;
            const [startHour, startMin] = startTime.split(':').map(Number);

            // Calculate position using constants
            const topOffset = (startHour - DAY_START_HOUR) * WEEK_VIEW_PX_PER_HOUR + (startMin / 60) * WEEK_VIEW_PX_PER_HOUR;
            const height = duration * WEEK_VIEW_PX_PER_HOUR;

            const taskBlock = document.createElement('div');
            taskBlock.className = 'week-task-block';
            if (task.completed) taskBlock.classList.add('completed');

            const color = task.quadrant ? QUADRANT_COLORS[task.quadrant] : 'var(--accent-primary)';
            taskBlock.style.backgroundColor = color;
            taskBlock.style.top = `${topOffset}px`;
            taskBlock.style.height = `${height}px`;

            taskBlock.innerHTML = `
                <span class="week-task-text">${task.text}</span>
                <span class="week-task-duration">${duration}h</span>
            `;

            taskBlock.addEventListener('click', (e) => {
                e.stopPropagation();
                AppState.selectedDate = date;

                // Switch to day view for this day
                document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('.view-tab[data-view="day"]').classList.add('active');
                document.getElementById('dayViewContainer').classList.remove('hidden');
                document.getElementById('weekViewContainer').classList.add('hidden');

                document.getElementById('dayWeekTitle').textContent = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                renderDayView(date);
            });

            tasksGrid.appendChild(taskBlock);
        });

        // Click on empty space to add task
        dayColumn.addEventListener('click', () => {
            AppState.selectedDate = date;
            document.getElementById('dayWeekModal').classList.add('hidden');
            openTaskModal(date);
        });

        dayColumn.appendChild(tasksGrid);
        weekDaysColumns.appendChild(dayColumn);
    }
}

// ==================== Task Modal ====================
function initTaskModal() {
    const modal = document.getElementById('taskModal');
    const floatingBtn = document.getElementById('floatingAddBtn');
    const closeModal = document.getElementById('closeModal');
    const cancelModal = document.getElementById('cancelModal');
    const saveTaskBtn = document.getElementById('saveTask');

    floatingBtn.addEventListener('click', () => {
        openTaskModal(new Date());
    });

    const closeModalFn = () => {
        modal.classList.add('hidden');
        document.getElementById('modalTaskName').value = '';
        document.getElementById('modalTaskPriority').value = '';
        document.getElementById('modalTaskDuration').value = '1';
        document.getElementById('modalTaskStartTime').value = '09:00';
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
        const dateKey = document.getElementById('modalTaskDate').value;
        const priority = document.getElementById('modalTaskPriority').value;
        const duration = parseFloat(document.getElementById('modalTaskDuration').value) || DEFAULT_DURATION;
        const startTime = document.getElementById('modalTaskStartTime').value || DEFAULT_START_TIME;

        if (!taskName) {
            document.getElementById('modalTaskName').focus();
            return;
        }

        if (!dateKey) {
            document.getElementById('modalTaskDate').focus();
            return;
        }

        const task = createTask(taskName, { quadrant: priority || null, duration, startTime });
        addTaskToDate(dateKey, task);

        renderCalendar();
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

function openTaskModal(date) {
    const modal = document.getElementById('taskModal');
    const dateInput = document.getElementById('modalTaskDate');

    dateInput.value = formatDate(date);
    modal.classList.remove('hidden');
    document.getElementById('modalTaskName').focus();
}

// Open task modal with pre-filled time (for quick-add from time slots)
function openTaskModalWithTime(date, startTime) {
    const modal = document.getElementById('taskModal');
    const dateInput = document.getElementById('modalTaskDate');
    const timeInput = document.getElementById('modalTaskStartTime');

    // Close day/week modal if open
    const dayWeekModal = document.getElementById('dayWeekModal');
    if (dayWeekModal) {
        dayWeekModal.classList.add('hidden');
    }

    dateInput.value = formatDate(date);
    timeInput.value = startTime;
    modal.classList.remove('hidden');
    document.getElementById('modalTaskName').focus();
}

// ==================== Enhanced Countdown Timer ====================
function initTimer() {
    const timerModal = document.getElementById('timerModal');
    const closeBtn = document.getElementById('closeTimerModal');
    const playPauseBtn = document.getElementById('timerPlayPause');
    const restartBtn = document.getElementById('timerRestart');
    const stopBtn = document.getElementById('timerStop');
    const fullscreenBtn = document.getElementById('timerFullscreenBtn');

    if (!timerModal) return;

    // Close button
    closeBtn.addEventListener('click', () => {
        closeTimerAndSave();
    });

    // Play/Pause button
    playPauseBtn.addEventListener('click', () => {
        if (TimerState.running) {
            pauseCountdown();
        } else {
            resumeCountdown();
        }
    });

    // Restart button
    restartBtn.addEventListener('click', () => {
        restartCountdown();
    });

    // Stop button - saves remaining time
    stopBtn.addEventListener('click', () => {
        closeTimerAndSave();
    });

    // Fullscreen button
    fullscreenBtn.addEventListener('click', () => {
        toggleFullscreen();
    });

    // Keyboard handler for Ctrl+Esc
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Escape' && TimerState.isFullscreen) {
            exitFullscreen();
        }
        // Also allow just Escape to exit fullscreen
        if (e.key === 'Escape' && TimerState.isFullscreen) {
            exitFullscreen();
        }
    });

    // Click outside to close (when not fullscreen)
    timerModal.addEventListener('click', (e) => {
        if (e.target === timerModal && !TimerState.isFullscreen) {
            closeTimerAndSave();
        }
    });
}

function startTaskTimer(task, dateKey = null) {
    const durationHours = task.duration || DEFAULT_DURATION;
    const durationSeconds = Math.floor(durationHours * 3600);

    TimerState.taskName = task.text;
    TimerState.taskId = task.id;
    TimerState.taskDateKey = dateKey;
    TimerState.originalDuration = durationHours;
    TimerState.remainingSeconds = durationSeconds;
    TimerState.running = false;
    TimerState.isOvertime = false;

    // Update UI
    const timerModal = document.getElementById('timerModal');
    const taskNameEl = document.getElementById('timerTaskName');

    taskNameEl.textContent = task.text;
    timerModal.classList.remove('hidden');

    // Reset progress circle
    updateCountdownDisplay();
    updateProgressBar();

    // Show initial quote
    showRandomMotivation();

    // Start motivation rotation (every 90 seconds)
    TimerState.motivationInterval = setInterval(showRandomMotivation, 90000);

    // Auto-start the timer
    resumeCountdown();
}

function resumeCountdown() {
    TimerState.running = true;
    updatePlayPauseButton();

    TimerState.interval = setInterval(() => {
        if (!TimerState.running) return;

        TimerState.remainingSeconds--;

        // Check for overtime
        if (TimerState.remainingSeconds < 0 && !TimerState.isOvertime) {
            TimerState.isOvertime = true;
            document.getElementById('countdownLabel').textContent = 'overtime';
            document.getElementById('timerModalContent').classList.add('overtime');
        }

        updateCountdownDisplay();
        updateProgressBar();
    }, 1000);
}

function pauseCountdown() {
    TimerState.running = false;
    if (TimerState.interval) {
        clearInterval(TimerState.interval);
        TimerState.interval = null;
    }
    updatePlayPauseButton();
}

function restartCountdown() {
    pauseCountdown();

    const durationSeconds = Math.floor(TimerState.originalDuration * 3600);
    TimerState.remainingSeconds = durationSeconds;
    TimerState.isOvertime = false;

    document.getElementById('countdownLabel').textContent = 'remaining';
    document.getElementById('timerModalContent').classList.remove('overtime');

    updateCountdownDisplay();
    updateProgressBar();
    resumeCountdown();
}

function closeTimerAndSave() {
    pauseCountdown();

    // Clear motivation interval
    if (TimerState.motivationInterval) {
        clearInterval(TimerState.motivationInterval);
        TimerState.motivationInterval = null;
    }

    // Exit fullscreen if active
    if (TimerState.isFullscreen) {
        exitFullscreen();
    }

    // Calculate remaining time and update task duration
    if (TimerState.remainingSeconds > 0 && TimerState.taskId) {
        const remainingHours = Math.round((TimerState.remainingSeconds / 3600) * 100) / 100;
        updateTaskDuration(TimerState.taskId, TimerState.taskDateKey, remainingHours);
        showToast(`Task paused. ${formatTimeDisplay(TimerState.remainingSeconds)} remaining saved.`);
    } else if (TimerState.isOvertime) {
        const overtimeSeconds = Math.abs(TimerState.remainingSeconds);
        showToast(`Task overtime by ${formatTimeDisplay(overtimeSeconds)}. Great persistence!`);
    }

    // Hide modal
    document.getElementById('timerModal').classList.add('hidden');
    document.getElementById('timerModalContent').classList.remove('overtime');

    // Reset state
    TimerState.taskId = null;
    TimerState.taskDateKey = null;
    TimerState.isOvertime = false;

    // Refresh views
    renderCalendar();
    renderEisenhowerMatrix();
}

function updateTaskDuration(taskId, dateKey, newDuration) {
    // Update in daily tasks
    if (dateKey && AppState.data.daily[dateKey]) {
        const task = AppState.data.daily[dateKey].tasks.find(t => t.id === taskId);
        if (task) {
            task.duration = newDuration;
        }
    }

    // Update in Eisenhower matrix
    for (const quadrant of Object.keys(AppState.data.eisenhower)) {
        const task = AppState.data.eisenhower[quadrant].find(t => t.id === taskId);
        if (task) {
            task.duration = newDuration;
            break;
        }
    }

    saveData();
}

function updateCountdownDisplay() {
    const display = document.getElementById('countdownDisplay');
    const seconds = TimerState.remainingSeconds;

    if (seconds >= 0) {
        display.textContent = formatTimeDisplay(seconds);
        display.classList.remove('negative');
    } else {
        // Negative time (overtime)
        display.textContent = '-' + formatTimeDisplay(Math.abs(seconds));
        display.classList.add('negative');
    }
}

function formatTimeDisplay(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateProgressBar() {
    const progressFill = document.getElementById('timerProgressFill');
    const totalSeconds = TimerState.originalDuration * 3600;

    if (TimerState.remainingSeconds >= 0) {
        // Calculate percentage remaining (bar empties as time passes)
        const percentRemaining = (TimerState.remainingSeconds / totalSeconds) * 100;
        progressFill.style.width = percentRemaining + '%';
    } else {
        // Empty bar when in overtime
        progressFill.style.width = '0%';
    }
}

function updatePlayPauseButton() {
    const playIcon = document.querySelector('#timerPlayPause .play-icon');
    const pauseIcon = document.querySelector('#timerPlayPause .pause-icon');
    const playLabel = document.querySelector('#timerPlayPause .play-label');
    const pauseLabel = document.querySelector('#timerPlayPause .pause-label');

    if (TimerState.running) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        if (playLabel) playLabel.classList.add('hidden');
        if (pauseLabel) pauseLabel.classList.remove('hidden');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        if (playLabel) playLabel.classList.remove('hidden');
        if (pauseLabel) pauseLabel.classList.add('hidden');
    }
}

function toggleFullscreen() {
    if (TimerState.isFullscreen) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

function enterFullscreen() {
    TimerState.isFullscreen = true;
    document.getElementById('timerModal').classList.add('fullscreen');
    document.getElementById('timerFullscreenBtn').textContent = '⛶';
    document.getElementById('timerFullscreenBtn').title = 'Exit Fullscreen (Ctrl+Esc)';
}

function exitFullscreen() {
    TimerState.isFullscreen = false;
    document.getElementById('timerModal').classList.remove('fullscreen');
    document.getElementById('timerFullscreenBtn').textContent = '⛶';
    document.getElementById('timerFullscreenBtn').title = 'Fullscreen (Ctrl+Esc to exit)';
}

function showRandomMotivation() {
    const randomIndex = Math.floor(Math.random() * MOTIVATION_QUOTES.length);
    const motivation = MOTIVATION_QUOTES[randomIndex];

    const quoteEl = document.getElementById('motivationQuote');
    const authorEl = document.getElementById('motivationAuthor');

    // Fade out
    quoteEl.style.opacity = '0';
    authorEl.style.opacity = '0';

    setTimeout(() => {
        quoteEl.textContent = `"${motivation.quote}"`;
        authorEl.textContent = `— ${motivation.author}`;

        // Fade in
        quoteEl.style.opacity = '1';
        authorEl.style.opacity = '1';
    }, 300);
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

            const duration = parseFloat(durationInput.value) || DEFAULT_DURATION;
            const scheduledDate = scheduleInput.value || null;

            const newTask = {
                id: Date.now() + Math.random(),
                text: taskText,
                completed: false,
                quadrant: quadrant,
                duration: duration,
                scheduledDate: scheduledDate,
                startTime: '09:00',
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
                    duration: duration,
                    startTime: '09:00'
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

// Sort tasks within quadrant: past due and shorter duration on top, longest duration in middle
function sortQuadrantTasks(tasks) {
    const today = formatDate(new Date());

    return [...tasks].sort((a, b) => {
        // First priority: incomplete tasks before completed
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }

        // Second priority: past due tasks go to top
        const aOverdue = a.scheduledDate && a.scheduledDate < today && !a.completed;
        const bOverdue = b.scheduledDate && b.scheduledDate < today && !b.completed;

        if (aOverdue !== bOverdue) {
            return aOverdue ? -1 : 1;
        }

        // Third priority: tasks scheduled for today
        const aIsToday = a.scheduledDate === today;
        const bIsToday = b.scheduledDate === today;

        if (aIsToday !== bIsToday) {
            return aIsToday ? -1 : 1;
        }

        // Fourth priority: shorter duration tasks on top (longer in middle/bottom)
        const aDuration = a.duration || DEFAULT_DURATION;
        const bDuration = b.duration || DEFAULT_DURATION;

        return aDuration - bDuration;
    });
}

function renderEisenhowerMatrix() {
    const quadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
    const today = formatDate(new Date());

    quadrants.forEach(quadrant => {
        const taskList = document.querySelector(`.matrix-task-list[data-quadrant="${quadrant}"]`);
        taskList.innerHTML = '';

        const tasks = AppState.data.eisenhower[quadrant] || [];
        const sortedTasks = sortQuadrantTasks(tasks);

        if (sortedTasks.length === 0) {
            taskList.innerHTML = '<li class="empty-quadrant">No tasks in this quadrant</li>';
            return;
        }

        sortedTasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = 'matrix-task-item';

            const isOverdue = task.scheduledDate && task.scheduledDate < today && !task.completed;
            if (isOverdue) {
                li.classList.add('overdue');
            }

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

                // Check for auto-push
                if (task.scheduledDate) {
                    checkAndAutoPushNextDay(task.scheduledDate);
                }

                renderEisenhowerMatrix();
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
                if (isOverdue) {
                    scheduleBadge.classList.add('overdue');
                }
                const schedDate = new Date(task.scheduledDate + 'T00:00:00');
                scheduleBadge.textContent = schedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                metaInfo.appendChild(scheduleBadge);
            }

            textContainer.appendChild(text);
            if (metaInfo.children.length > 0) {
                textContainer.appendChild(metaInfo);
            }

            // Timer button
            const timerBtn = document.createElement('button');
            timerBtn.className = 'timer-icon-btn';
            timerBtn.title = 'Start countdown timer';
            timerBtn.textContent = '⏳';
            timerBtn.addEventListener('click', () => {
                startTaskTimer(task, task.scheduledDate);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', () => {
                // Find in original array (not sorted)
                const originalIndex = tasks.findIndex(t => t.id === task.id);
                if (originalIndex !== -1) {
                    // Remove from eisenhower
                    tasks.splice(originalIndex, 1);

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
                }
            });

            if (task.completed) {
                li.classList.add('completed');
            }

            // Create actions container
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'task-actions';
            actionsContainer.appendChild(timerBtn);
            actionsContainer.appendChild(deleteBtn);

            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(actionsContainer);
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
        card.style.borderLeftColor = QUADRANT_COLORS[quadrant];

        card.innerHTML = `
            <div class="stat-label">${QUADRANT_NAMES[quadrant]}</div>
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

// ==================== Auto-Push Next Day Tasks ====================
function checkAndAutoPushNextDay(dateKey) {
    const tasks = AppState.data.daily[dateKey]?.tasks || [];

    // Check if all tasks for this date are completed
    const allCompleted = tasks.length > 0 && tasks.every(t => t.completed);

    if (allCompleted) {
        // Get next day's date
        const currentDate = new Date(dateKey + 'T00:00:00');
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateKey = formatDate(nextDate);

        // Get next day's tasks that aren't in the matrix yet
        const nextDayTasks = AppState.data.daily[nextDateKey]?.tasks || [];

        nextDayTasks.forEach(task => {
            if (!task.quadrant && !task.source) {
                // This task doesn't have a quadrant assignment yet
                // Could prompt user to assign, or auto-assign based on duration
                // For now, we'll just add to "not-urgent-important" as default
                task.quadrant = 'not-urgent-important';
                task.source = 'eisenhower';

                // Add to eisenhower matrix
                AppState.data.eisenhower['not-urgent-important'].push({
                    ...task,
                    scheduledDate: nextDateKey
                });
            }
        });

        saveData();
        showToast(`Day complete! Next day's tasks have been added to the matrix.`);
        renderEisenhowerMatrix();
    }
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
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
    const sidebar = document.getElementById('sidebar');

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
        mobileMenuToggle.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Mobile menu toggle button
    mobileMenuToggle.addEventListener('click', () => {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    // Close button inside sidebar
    sidebarClose.addEventListener('click', closeSidebar);

    // Click on overlay to close
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Close sidebar when a nav item is clicked (on mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });

    // Collapse sidebar toggle (desktop)
    if (sidebarCollapseBtn) {
        // Load saved collapse state
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            sidebarCollapseBtn.textContent = '»';
            sidebarCollapseBtn.title = 'Expand sidebar';
        }

        sidebarCollapseBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const collapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', collapsed);
            sidebarCollapseBtn.textContent = collapsed ? '»' : '«';
            sidebarCollapseBtn.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
        });
    }
}

// ==================== Google Calendar Integration ====================
const GoogleCalendarState = {
    isConnected: false,
    accessToken: null,
    tokenClient: null,
    clientId: localStorage.getItem('googleClientId') || '',
    syncToGoogle: localStorage.getItem('syncToGoogle') !== 'false',
    syncFromGoogle: localStorage.getItem('syncFromGoogle') === 'true',
    availableCalendars: [],
    selectedCalendars: JSON.parse(localStorage.getItem('selectedCalendars') || '["primary"]')
};

// Fetch available calendars from Google
async function fetchAvailableCalendars() {
    if (!GoogleCalendarState.isConnected) return [];

    try {
        const response = await gapi.client.calendar.calendarList.list();
        const calendars = response.result.items || [];
        GoogleCalendarState.availableCalendars = calendars.map(cal => ({
            id: cal.id,
            name: cal.summary,
            color: cal.backgroundColor,
            primary: cal.primary || false,
            accessRole: cal.accessRole
        }));
        return GoogleCalendarState.availableCalendars;
    } catch (error) {
        console.error('Failed to fetch calendars:', error);
        return [];
    }
}

// Update calendar selection UI in settings
async function updateCalendarSelectionUI() {
    const container = document.getElementById('calendarSelectionList');
    if (!container) return;

    if (!GoogleCalendarState.isConnected) {
        container.innerHTML = '<p class="calendar-list-empty">Connect to Google Calendar to see your calendars</p>';
        return;
    }

    container.innerHTML = '<p class="calendar-list-loading">Loading calendars...</p>';

    const calendars = await fetchAvailableCalendars();

    if (calendars.length === 0) {
        container.innerHTML = '<p class="calendar-list-empty">No calendars found</p>';
        return;
    }

    container.innerHTML = calendars.map(cal => `
        <label class="calendar-select-item" style="--cal-color: ${cal.color}">
            <input type="checkbox"
                   value="${cal.id}"
                   ${GoogleCalendarState.selectedCalendars.includes(cal.id) ? 'checked' : ''}
                   class="calendar-checkbox">
            <span class="calendar-color-dot"></span>
            <span class="calendar-name">${cal.name}${cal.primary ? ' (Primary)' : ''}</span>
        </label>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.calendar-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const selected = Array.from(container.querySelectorAll('.calendar-checkbox:checked'))
                .map(cb => cb.value);
            GoogleCalendarState.selectedCalendars = selected.length > 0 ? selected : ['primary'];
            localStorage.setItem('selectedCalendars', JSON.stringify(GoogleCalendarState.selectedCalendars));
        });
    });
}

const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

// Toast notification helper
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

// Update Google connection status UI
function updateGoogleStatus(connected) {
    GoogleCalendarState.isConnected = connected;
    const statusEl = document.getElementById('googleStatus');
    const connectBtn = document.getElementById('googleConnectBtn');
    const syncBtn = document.getElementById('googleSyncBtn');

    if (connected) {
        statusEl.className = 'google-status connected';
        statusEl.querySelector('.status-text').textContent = 'Connected';
        connectBtn.innerHTML = '<span>🔌</span> <span>Disconnect</span>';
        syncBtn.style.display = 'flex';
    } else {
        statusEl.className = 'google-status disconnected';
        statusEl.querySelector('.status-text').textContent = 'Not connected';
        connectBtn.innerHTML = '<span>📅</span> <span>Connect Google</span>';
        syncBtn.style.display = 'none';
    }
}

// Initialize Google API client
async function initGoogleApi() {
    if (!GoogleCalendarState.clientId) return;

    try {
        await new Promise((resolve, reject) => {
            gapi.load('client', { callback: resolve, onerror: reject });
        });

        await gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
        });

        // Initialize token client
        GoogleCalendarState.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GoogleCalendarState.clientId,
            scope: GOOGLE_API_SCOPES,
            callback: (response) => {
                if (response.error) {
                    console.error('Auth error:', response.error);
                    if (response.error !== 'user_closed_popup') {
                        showToast('Authentication failed');
                    }
                    return;
                }
                GoogleCalendarState.accessToken = response.access_token;
                // Save token to localStorage for persistence across sessions
                localStorage.setItem('googleAccessToken', response.access_token);
                localStorage.setItem('googleTokenTime', Date.now().toString());
                localStorage.setItem('googleAuthorized', 'true');
                gapi.client.setToken({ access_token: response.access_token });
                updateGoogleStatus(true);
                showToast('Connected to Google Calendar!');
                // Dispatch event for settings page
                window.dispatchEvent(new Event('googleStatusChanged'));
            },
        });

        // Check if user has previously authorized
        const wasAuthorized = localStorage.getItem('googleAuthorized') === 'true';
        const storedToken = localStorage.getItem('googleAccessToken');
        const tokenTime = parseInt(localStorage.getItem('googleTokenTime') || '0');
        const tokenAge = Date.now() - tokenTime;
        const TOKEN_EXPIRY = 55 * 60 * 1000; // 55 minutes (tokens last ~60 min)

        if (storedToken && tokenAge < TOKEN_EXPIRY) {
            // Token might still be valid, try to use it
            gapi.client.setToken({ access_token: storedToken });
            GoogleCalendarState.accessToken = storedToken;
            try {
                await gapi.client.calendar.calendarList.list({ maxResults: 1 });
                updateGoogleStatus(true);
                window.dispatchEvent(new Event('googleStatusChanged'));
                return;
            } catch (error) {
                console.log('Stored token invalid, will try to refresh...');
            }
        }

        // If previously authorized, try silent token refresh
        if (wasAuthorized && GoogleCalendarState.tokenClient) {
            console.log('Attempting silent token refresh...');
            try {
                // Request new token silently (no prompt)
                GoogleCalendarState.tokenClient.requestAccessToken({ prompt: '' });
            } catch (error) {
                console.log('Silent refresh failed, user needs to reconnect');
                updateGoogleStatus(false);
            }
        }
    } catch (error) {
        console.error('Failed to initialize Google API:', error);
    }
}

// Connect to Google Calendar
function connectGoogleCalendar() {
    if (!GoogleCalendarState.clientId) {
        document.getElementById('googleSettingsModal').classList.remove('hidden');
        return;
    }

    if (GoogleCalendarState.isConnected) {
        // Disconnect
        gapi.client.setToken(null);
        GoogleCalendarState.accessToken = null;
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleTokenTime');
        localStorage.removeItem('googleAuthorized');
        updateGoogleStatus(false);
        window.dispatchEvent(new Event('googleStatusChanged'));
        showToast('Disconnected from Google Calendar');
        return;
    }

    // Request access
    if (GoogleCalendarState.tokenClient) {
        GoogleCalendarState.tokenClient.requestAccessToken({ prompt: 'consent' });
    }
}

// Sync tasks to Google Calendar
async function syncToGoogleCalendar() {
    if (!GoogleCalendarState.isConnected || !GoogleCalendarState.syncToGoogle) {
        showToast('Connect to Google Calendar first');
        return;
    }

    showToast('Syncing to Google Calendar...');

    let syncedCount = 0;
    const quadrantGoogleColors = {
        'urgent-important': '11', // Red
        'not-urgent-important': '9', // Blue
        'urgent-not-important': '5', // Yellow
        'not-urgent-not-important': '8' // Gray
    };

    try {
        // Sync scheduled tasks from Eisenhower matrix
        for (const quadrant of Object.keys(AppState.data.eisenhower)) {
            const tasks = AppState.data.eisenhower[quadrant];

            for (const task of tasks) {
                if (!task.scheduledDate || task.googleEventId) continue;

                const startTime = task.startTime || DEFAULT_START_TIME;
                const startDate = new Date(task.scheduledDate + 'T' + startTime + ':00');
                const endDate = new Date(startDate);
                const duration = task.duration || DEFAULT_DURATION;
                endDate.setHours(startDate.getHours() + Math.floor(duration));
                endDate.setMinutes(startDate.getMinutes() + (duration % 1) * 60);

                const event = {
                    summary: task.text,
                    description: `Priority: ${QUADRANT_NAMES[quadrant]}\nCreated by High-Performance Planner`,
                    start: {
                        dateTime: startDate.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    end: {
                        dateTime: endDate.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    colorId: quadrantGoogleColors[quadrant]
                };

                const response = await gapi.client.calendar.events.insert({
                    calendarId: 'primary',
                    resource: event
                });

                task.googleEventId = response.result.id;
                syncedCount++;
            }
        }

        saveData();
        showToast(`Synced ${syncedCount} task${syncedCount !== 1 ? 's' : ''} to Google Calendar`);
    } catch (error) {
        console.error('Sync error:', error);
        showToast('Sync failed. Please try again.');
    }
}

// Sync events from Google Calendar (multiple calendars)
async function syncFromGoogleCalendar() {
    if (!GoogleCalendarState.isConnected || !GoogleCalendarState.syncFromGoogle) {
        return;
    }

    showToast('Importing from Google Calendars...');

    try {
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        let totalImported = 0;
        const calendarsToSync = GoogleCalendarState.selectedCalendars;

        // Fetch events from all selected calendars
        for (const calendarId of calendarsToSync) {
            try {
                const response = await gapi.client.calendar.events.list({
                    calendarId: calendarId,
                    timeMin: today.toISOString(),
                    timeMax: nextMonth.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 100
                });

                const events = response.result.items || [];

                // Find calendar info for color
                const calInfo = GoogleCalendarState.availableCalendars.find(c => c.id === calendarId);
                const calendarColor = calInfo?.color || '#6366f1';
                const calendarName = calInfo?.name || 'Calendar';

                for (const event of events) {
                    if (!event.start.dateTime) continue; // Skip all-day events

                    const startDate = new Date(event.start.dateTime);
                    const endDate = new Date(event.end.dateTime);
                    const dateKey = formatDate(startDate);
                    const duration = (endDate - startDate) / (1000 * 60 * 60); // hours
                    const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

                    // Check if already exists
                    const existingTasks = AppState.data.daily[dateKey]?.tasks || [];
                    const alreadyExists = existingTasks.some(t => t.googleEventId === event.id);

                    if (!alreadyExists) {
                        if (!AppState.data.daily[dateKey]) {
                            AppState.data.daily[dateKey] = { tasks: [] };
                        }

                        AppState.data.daily[dateKey].tasks.push({
                            id: Date.now() + Math.random(),
                            text: event.summary || 'Untitled Event',
                            completed: false,
                            duration: Math.round(duration * 10) / 10,
                            startTime: startTime,
                            source: 'google',
                            googleEventId: event.id,
                            googleCalendarId: calendarId,
                            googleCalendarName: calendarName,
                            googleCalendarColor: calendarColor,
                            createdAt: new Date().toISOString()
                        });

                        totalImported++;
                    }
                }
            } catch (calError) {
                console.error(`Failed to fetch from calendar ${calendarId}:`, calError);
            }
        }

        if (totalImported > 0) {
            saveData();
            renderCalendar();
        }

        const calCount = calendarsToSync.length;
        showToast(`Imported ${totalImported} event${totalImported !== 1 ? 's' : ''} from ${calCount} calendar${calCount !== 1 ? 's' : ''}`);
    } catch (error) {
        console.error('Import error:', error);
        showToast('Import failed. Please try again.');
    }
}

// Full sync (both directions)
// silent = true for background auto-sync (no UI updates or toasts)
async function fullGoogleSync(silent = false) {
    if (!GoogleCalendarState.isConnected) {
        if (!silent) showToast('Connect to Google Calendar first');
        return;
    }

    const syncBtn = document.getElementById('googleSyncBtn');

    if (!silent) {
        syncBtn.innerHTML = '<span>⏳</span> <span>Syncing...</span>';
        syncBtn.disabled = true;
    }

    try {
        let synced = false;
        if (GoogleCalendarState.syncToGoogle) {
            await syncToGoogleCalendar();
            synced = true;
        }
        if (GoogleCalendarState.syncFromGoogle) {
            await syncFromGoogleCalendar();
            synced = true;
        }

        // Also sync bid deadlines to Google Calendar if enabled
        if (GoogleCalendarState.syncToGoogle && typeof BidTracker !== 'undefined') {
            await syncBidDeadlinesToGoogle();
        }

        if (!silent && synced) {
            showToast('Sync complete!');
        }
    } catch (error) {
        if (!silent) {
            showToast('Sync failed: ' + error.message);
        }
        throw error;
    } finally {
        if (!silent) {
            syncBtn.innerHTML = '<span>🔄</span> <span>Sync Now</span>';
            syncBtn.disabled = false;
        }
    }
}

// Sync bid deadlines to Google Calendar
async function syncBidDeadlinesToGoogle() {
    if (typeof BidTracker === 'undefined' || !BidTracker.bids) return;

    const activeBids = BidTracker.bids.filter(b => ['researching', 'preparing'].includes(b.status));

    for (const bid of activeBids) {
        if (!bid.dueDate || bid.googleEventId) continue; // Skip if no due date or already synced

        try {
            const dueDate = new Date(bid.dueDate);
            const endDate = new Date(dueDate);
            endDate.setHours(endDate.getHours() + 1);

            const event = {
                summary: `📋 BID DUE: ${bid.projectName}`,
                description: `Client: ${bid.client}\nBid Number: ${bid.bidNumber || 'N/A'}\nEstimated Value: ${bid.estimatedValue || 'N/A'}\n\nGenerated by High-Performance Planner`,
                start: {
                    dateTime: dueDate.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                    dateTime: endDate.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                colorId: '11', // Red for urgent
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 60 },      // 1 hour before
                        { method: 'popup', minutes: 1440 },    // 1 day before
                        { method: 'popup', minutes: 4320 }     // 3 days before
                    ]
                }
            };

            const response = await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event
            });

            // Store Google Event ID to prevent duplicates
            bid.googleEventId = response.result.id;
            BidTracker.saveBids();
        } catch (error) {
            console.warn(`Failed to sync bid "${bid.projectName}" to Google:`, error);
        }
    }
}

// Initialize Google Calendar UI handlers
function initGoogleCalendar() {
    const connectBtn = document.getElementById('googleConnectBtn');
    const syncBtn = document.getElementById('googleSyncBtn');
    const settingsModal = document.getElementById('googleSettingsModal');
    const closeSettings = document.getElementById('closeGoogleSettings');
    const cancelSettings = document.getElementById('cancelGoogleSettings');
    const saveSettings = document.getElementById('saveGoogleSettings');
    const clientIdInput = document.getElementById('googleClientId');
    const syncToGoogleCheckbox = document.getElementById('syncToGoogle');
    const syncFromGoogleCheckbox = document.getElementById('syncFromGoogle');

    // Load saved settings
    if (GoogleCalendarState.clientId) {
        clientIdInput.value = GoogleCalendarState.clientId;
    }
    syncToGoogleCheckbox.checked = GoogleCalendarState.syncToGoogle;
    syncFromGoogleCheckbox.checked = GoogleCalendarState.syncFromGoogle;

    // Connect button
    connectBtn.addEventListener('click', () => {
        if (!GoogleCalendarState.clientId) {
            settingsModal.classList.remove('hidden');
        } else {
            connectGoogleCalendar();
        }
    });

    // Sync button
    syncBtn.addEventListener('click', fullGoogleSync);

    // Settings modal handlers
    const closeSettingsModal = () => {
        settingsModal.classList.add('hidden');
    };

    closeSettings.addEventListener('click', closeSettingsModal);
    cancelSettings.addEventListener('click', closeSettingsModal);

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });

    // Save settings
    saveSettings.addEventListener('click', async () => {
        const clientId = clientIdInput.value.trim();
        const syncTo = syncToGoogleCheckbox.checked;
        const syncFrom = syncFromGoogleCheckbox.checked;

        if (!clientId) {
            showToast('Please enter a Client ID');
            return;
        }

        // Save settings
        GoogleCalendarState.clientId = clientId;
        GoogleCalendarState.syncToGoogle = syncTo;
        GoogleCalendarState.syncFromGoogle = syncFrom;

        localStorage.setItem('googleClientId', clientId);
        localStorage.setItem('syncToGoogle', syncTo);
        localStorage.setItem('syncFromGoogle', syncFrom);

        closeSettingsModal();

        // Initialize Google API with new client ID
        await initGoogleApi();

        // Try to connect
        connectGoogleCalendar();
    });

    // Initialize Google API if client ID exists
    if (GoogleCalendarState.clientId) {
        // Wait for Google API to load
        const checkGapiLoaded = setInterval(() => {
            if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
                clearInterval(checkGapiLoaded);
                initGoogleApi();
            }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => clearInterval(checkGapiLoaded), 5000);
    }

    // Auto-sync every 2 minutes when connected
    const AUTO_SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes
    let autoSyncInterval = null;

    function startAutoSync() {
        if (autoSyncInterval) clearInterval(autoSyncInterval);

        autoSyncInterval = setInterval(async () => {
            if (GoogleCalendarState.isConnected && (GoogleCalendarState.syncToGoogle || GoogleCalendarState.syncFromGoogle)) {
                console.log('[Auto-sync] Running background sync...');
                try {
                    await fullGoogleSync(true); // true = silent mode (no toast)
                } catch (error) {
                    console.warn('[Auto-sync] Failed:', error.message);
                }
            }
        }, AUTO_SYNC_INTERVAL);

        console.log('[Auto-sync] Started - syncing every 2 minutes');
    }

    // Start auto-sync when connected
    window.addEventListener('googleStatusChanged', () => {
        if (GoogleCalendarState.isConnected) {
            startAutoSync();
        } else if (autoSyncInterval) {
            clearInterval(autoSyncInterval);
            autoSyncInterval = null;
            console.log('[Auto-sync] Stopped');
        }
    });

    // Also start if already connected on page load
    if (GoogleCalendarState.isConnected) {
        startAutoSync();
    }
}

// ==================== Home Page & Routines ====================
function initHomePage() {
    // Initialize with default routines if none exist
    if (RoutinesState.routines.length === 0) {
        RoutinesState.routines = DEFAULT_ROUTINES;
        saveRoutines();
    }

    // Initialize right sidebar
    initScheduleSidebar();

    // Update home page greeting and stats
    updateHomeGreeting();
    updateHomeStats();
    renderUpcomingItems();

    // Start clock
    updateClock();
    RoutinesState.clockInterval = setInterval(updateClock, 1000);

    // Render routines list
    renderRoutines();
    renderSidebarRoutines();

    // Home page quick action buttons
    document.querySelectorAll('.quick-action-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
            showTab(tab);
        });
    });

    document.getElementById('quickAddRoutine')?.addEventListener('click', () => {
        document.getElementById('routinesPanel')?.classList.remove('hidden');
    });

    // Smart Schedule AI button
    initSmartSchedule();

    // Manage routines buttons (multiple locations)
    document.getElementById('sidebarManageRoutines')?.addEventListener('click', () => {
        document.getElementById('routinesPanel')?.classList.remove('hidden');
    });

    // Close routines panel
    document.getElementById('closeRoutinesPanel')?.addEventListener('click', () => {
        document.getElementById('routinesPanel')?.classList.add('hidden');
    });

    // Add routine button
    document.getElementById('addRoutineBtn')?.addEventListener('click', () => {
        openRoutineModal();
    });

    // Routine modal handlers
    initRoutineModal();

    // Emoji picker
    initEmojiPicker();
}

// Initialize schedule sidebar
function initScheduleSidebar() {
    // Render mini clock dots
    renderMiniClockDots();

    // Render vertical timeline
    renderVerticalTimeline();

    // Sidebar toggle for mobile
    const toggleBtn = document.getElementById('scheduleToggleBtn');
    const sidebar = document.getElementById('scheduleSidebar');

    toggleBtn?.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            if (!e.target.closest('.schedule-sidebar') && !e.target.closest('.schedule-toggle-btn')) {
                sidebar?.classList.remove('open');
            }
        }
    });
}

function renderMiniClockDots() {
    const dotsGroup = document.getElementById('miniClockDots');
    if (!dotsGroup) return;

    dotsGroup.innerHTML = '';

    // 12 hour dots
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * 360 - 90;
        const radian = (angle * Math.PI) / 180;
        const radius = 42;
        const x = 50 + Math.cos(radian) * radius;
        const y = 50 + Math.sin(radian) * radius;

        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', i % 3 === 0 ? 2 : 1);
        dot.setAttribute('class', 'mini-clock-dot');
        dotsGroup.appendChild(dot);
    }
}

function renderVerticalTimeline() {
    const container = document.getElementById('verticalTimelineScroll');
    if (!container) return;

    const now = new Date();
    const currentHour = now.getHours();

    // Show 1 hour before and 5 hours after current time (6 hours total)
    const startHour = Math.max(0, currentHour - 1);
    const endHour = Math.min(24, currentHour + 5);

    const today = new Date().getDay();
    const todayStr = formatDate(now);
    const todayRoutines = RoutinesState.routines.filter(r => r.days.includes(today));
    const todayTasks = AppState.data.daily[todayStr]?.tasks || [];
    const scheduledTasks = todayTasks.filter(task => task.startTime && !task.completed);

    container.innerHTML = '';

    for (let hour = startHour; hour < endHour; hour++) {
        const hourDiv = document.createElement('div');
        hourDiv.className = `v-timeline-hour ${hour === currentHour ? 'current-hour' : ''}`;

        const hourLabel = document.createElement('div');
        hourLabel.className = 'v-hour-label';
        hourLabel.textContent = `${String(hour).padStart(2, '0')}:00`;

        const hourContent = document.createElement('div');
        hourContent.className = 'v-hour-content';

        // Add routines that fall within this hour
        todayRoutines.forEach(routine => {
            const [rHour] = routine.startTime.split(':').map(Number);
            const rEndHour = rHour + routine.duration;
            if (hour >= rHour && hour < rEndHour) {
                const block = document.createElement('div');
                block.className = 'v-timeline-block';
                block.style.background = routine.color;
                block.innerHTML = `
                    <span class="block-emoji">${routine.emoji || '📌'}</span>
                    <span class="block-name">${routine.name}</span>
                `;
                block.addEventListener('click', () => openRoutineModal(routine.id));
                hourContent.appendChild(block);
            }
        });

        // Add tasks that fall within this hour
        scheduledTasks.forEach(task => {
            const [tHour] = task.startTime.split(':').map(Number);
            const tEndHour = tHour + (task.duration || DEFAULT_DURATION);
            if (hour >= tHour && hour < tEndHour) {
                const block = document.createElement('div');
                block.className = 'v-timeline-block';
                block.style.background = '#10b981';
                block.innerHTML = `
                    <span class="block-emoji">📋</span>
                    <span class="block-name">${task.text}</span>
                `;
                hourContent.appendChild(block);
            }
        });

        // Add now marker in current hour
        if (hour === currentHour) {
            const minutes = now.getMinutes();
            const markerPosition = (minutes / 60) * 100;
            const nowLine = document.createElement('div');
            nowLine.className = 'v-now-line';
            nowLine.style.top = `${markerPosition}%`;
            hourContent.appendChild(nowLine);
        }

        hourDiv.appendChild(hourLabel);
        hourDiv.appendChild(hourContent);
        container.appendChild(hourDiv);
    }

    // Auto-scroll to current hour
    const currentHourEl = container.querySelector('.current-hour');
    if (currentHourEl) {
        currentHourEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function renderSidebarRoutines() {
    const list = document.getElementById('sidebarRoutinesList');
    if (!list) return;

    const today = new Date().getDay();
    const todayRoutines = RoutinesState.routines
        .filter(r => r.days.includes(today))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (todayRoutines.length === 0) {
        list.innerHTML = '<p style="padding:12px;color:var(--text-muted);font-size:12px;text-align:center;">No routines for today</p>';
        return;
    }

    list.innerHTML = todayRoutines.map(routine => `
        <div class="sidebar-routine-item" data-id="${routine.id}">
            <span class="routine-emoji">${routine.emoji || '📌'}</span>
            <div class="routine-info-mini">
                <div class="routine-name-mini">${routine.name}</div>
                <div class="routine-time-mini">${routine.startTime} - ${calculateEndTime(routine.startTime, routine.duration)}</div>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.sidebar-routine-item').forEach(item => {
        item.addEventListener('click', () => {
            openRoutineModal(parseInt(item.dataset.id));
        });
    });
}

function updateHomeGreeting() {
    const greetingEl = document.getElementById('greetingText');
    const dateEl = document.getElementById('welcomeDate');

    if (!greetingEl) return;

    const hour = new Date().getHours();
    let greeting = 'Hello';

    if (hour >= 5 && hour < 12) {
        greeting = 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
    } else if (hour >= 17 && hour < 21) {
        greeting = 'Good Evening';
    } else {
        greeting = 'Good Night';
    }

    greetingEl.textContent = `${greeting}! 👋`;

    if (dateEl) {
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

function updateHomeStats() {
    const today = formatDate(new Date());
    const todayTasks = AppState.data.daily[today]?.tasks || [];

    document.getElementById('todayTaskCount').textContent = todayTasks.length;
    document.getElementById('completedTaskCount').textContent = todayTasks.filter(t => t.completed).length;

    // Count urgent tasks
    let urgentCount = 0;
    Object.values(AppState.data.eisenhower).forEach(quadrant => {
        quadrant.forEach(task => {
            if (task.scheduledDate === today && !task.completed) {
                urgentCount++;
            }
        });
    });
    document.getElementById('urgentTaskCount').textContent = urgentCount;
}

function renderUpcomingItems() {
    const list = document.getElementById('upcomingList');
    if (!list) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const today = now.getDay();
    const todayStr = formatDate(now);

    const upcoming = [];

    // Add routines
    RoutinesState.routines.forEach(routine => {
        if (!routine.days.includes(today)) return;
        const [h, m] = routine.startTime.split(':').map(Number);
        const startMinutes = h * 60 + m;
        if (startMinutes > currentMinutes) {
            upcoming.push({
                time: routine.startTime,
                name: `${routine.emoji || ''} ${routine.name}`,
                type: 'Routine',
                minutes: startMinutes,
                color: routine.color
            });
        }
    });

    // Add tasks
    const todayTasks = AppState.data.daily[todayStr]?.tasks || [];
    todayTasks.forEach(task => {
        if (!task.startTime || task.completed) return;
        const [h, m] = task.startTime.split(':').map(Number);
        const startMinutes = h * 60 + m;
        if (startMinutes > currentMinutes) {
            upcoming.push({
                time: task.startTime,
                name: task.text,
                type: 'Task',
                minutes: startMinutes,
                color: '#10b981'
            });
        }
    });

    // Sort by time and take first 4
    upcoming.sort((a, b) => a.minutes - b.minutes);
    const next4 = upcoming.slice(0, 4);

    if (next4.length === 0) {
        list.innerHTML = '<div class="upcoming-empty">No upcoming items today 🎉</div>';
        return;
    }

    list.innerHTML = next4.map(item => `
        <div class="upcoming-item" style="border-left-color:${item.color}">
            <span class="upcoming-time">${item.time}</span>
            <span class="upcoming-name">${item.name}</span>
            <span class="upcoming-type">${item.type}</span>
        </div>
    `).join('');
}

function initEmojiPicker() {
    const selectedBtn = document.getElementById('selectedEmoji');
    const dropdown = document.getElementById('emojiDropdown');

    if (!selectedBtn || !dropdown) return;

    selectedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    dropdown.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedBtn.textContent = btn.dataset.emoji;
            dropdown.classList.add('hidden');
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.emoji-picker-mini')) {
            dropdown.classList.add('hidden');
        }
    });
}

// Helper to get the current routine based on time
function getCurrentRoutine() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const routine of RoutinesState.routines) {
        if (!routine.days.includes(currentDay)) continue;

        const [startH, startM] = routine.startTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = startMinutes + routine.duration * 60;

        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            return routine;
        }
    }
    return null;
}

function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Update mini digital time in sidebar
    const miniDigitalTime = document.getElementById('miniDigitalTime');
    if (miniDigitalTime) {
        miniDigitalTime.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Update mini date in sidebar
    const miniDate = document.getElementById('miniDate');
    if (miniDate) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        miniDate.textContent = now.toLocaleDateString('en-US', options);
    }

    // Update mini clock hands (SVG line elements)
    const miniHourHand = document.getElementById('miniHourHand');
    const miniMinuteHand = document.getElementById('miniMinuteHand');

    if (miniHourHand && miniMinuteHand) {
        const hourAngle = ((hours % 12) + minutes / 60) * 30 - 90;
        const minuteAngle = minutes * 6 - 90;

        // Calculate hand endpoints (from center at 50,50)
        const hourRad = (hourAngle * Math.PI) / 180;
        const minuteRad = (minuteAngle * Math.PI) / 180;

        const hourLen = 22;
        const minuteLen = 30;

        miniHourHand.setAttribute('x2', 50 + Math.cos(hourRad) * hourLen);
        miniHourHand.setAttribute('y2', 50 + Math.sin(hourRad) * hourLen);
        miniMinuteHand.setAttribute('x2', 50 + Math.cos(minuteRad) * minuteLen);
        miniMinuteHand.setAttribute('y2', 50 + Math.sin(minuteRad) * minuteLen);
    }

    // Update current activity in sidebar
    const activityName = document.getElementById('currentActivityMiniName');
    if (activityName) {
        const currentRoutine = getCurrentRoutine();
        activityName.textContent = currentRoutine ? `${currentRoutine.emoji || ''} ${currentRoutine.name}` : 'Free time';
    }

    // Update now marker on timeline
    updateNowMarker();

    // Update current activity
    updateCurrentActivity();

    // Re-render vertical timeline every minute to keep it current
    if (typeof renderVerticalTimeline === 'function') {
        renderVerticalTimeline();
    }
    if (typeof renderSidebarRoutines === 'function') {
        renderSidebarRoutines();
    }
}

function renderClockDots() {
    const dotsGroup = document.getElementById('clockDots');
    if (!dotsGroup) return;

    dotsGroup.innerHTML = '';

    // 12 hour dots
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * 360 - 90;
        const radian = (angle * Math.PI) / 180;
        const isMajor = i % 3 === 0; // 12, 3, 6, 9 are major
        const radius = 130;
        const x = 150 + Math.cos(radian) * radius;
        const y = 150 + Math.sin(radian) * radius;

        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', isMajor ? 5 : 3);
        dot.setAttribute('class', `clock-dot ${isMajor ? 'major' : ''}`);
        dotsGroup.appendChild(dot);
    }
}

function renderTimelineHours() {
    const container = document.getElementById('timelineHours');
    if (!container) return;

    container.innerHTML = '';

    // Show hours from 6am to midnight (waking hours)
    const hours = [6, 9, 12, 15, 18, 21, 24];
    hours.forEach(h => {
        const label = document.createElement('span');
        label.className = 'timeline-hour-label';
        label.textContent = h === 24 ? '00' : String(h).padStart(2, '0');
        container.appendChild(label);
    });
}

function renderTimeline() {
    renderTimelineRoutines();
    renderTimelineTasks();
    updateNowMarker();
}

function renderTimelineRoutines() {
    const container = document.getElementById('timelineRoutines');
    if (!container) return;

    container.innerHTML = '';

    const today = new Date().getDay();
    const todayRoutines = RoutinesState.routines.filter(r => r.days.includes(today));

    // Timeline represents 6:00 to 24:00 (18 hours)
    const startHour = 6;
    const endHour = 24;
    const totalMinutes = (endHour - startHour) * 60;

    todayRoutines.forEach(routine => {
        const [hours, mins] = routine.startTime.split(':').map(Number);
        const routineStart = hours * 60 + mins;
        const routineEnd = routineStart + routine.duration * 60;

        // Skip if outside timeline range
        if (routineEnd <= startHour * 60 || routineStart >= endHour * 60) return;

        // Calculate position
        const adjustedStart = Math.max(routineStart - startHour * 60, 0);
        const adjustedEnd = Math.min(routineEnd - startHour * 60, totalMinutes);

        const left = (adjustedStart / totalMinutes) * 100;
        const width = ((adjustedEnd - adjustedStart) / totalMinutes) * 100;

        const block = document.createElement('div');
        block.className = 'timeline-block';
        block.style.left = `${left}%`;
        block.style.width = `${width}%`;
        block.style.background = routine.color;
        block.innerHTML = `<span class="timeline-block-text">${routine.name}</span>`;
        block.title = `${routine.name} (${routine.startTime} - ${calculateEndTime(routine.startTime, routine.duration)})`;
        block.addEventListener('click', () => openRoutineModal(routine.id));

        container.appendChild(block);
    });
}

function renderTimelineTasks() {
    const container = document.getElementById('timelineTasks');
    if (!container) return;

    container.innerHTML = '';

    const today = formatDate(new Date());
    const todayTasks = AppState.data.daily[today]?.tasks || [];
    const scheduledTasks = todayTasks.filter(task => task.startTime && task.duration && !task.completed);

    const startHour = 6;
    const endHour = 24;
    const totalMinutes = (endHour - startHour) * 60;

    scheduledTasks.forEach(task => {
        const [hours, mins] = task.startTime.split(':').map(Number);
        const taskStart = hours * 60 + mins;
        const taskEnd = taskStart + (task.duration || DEFAULT_DURATION) * 60;

        if (taskEnd <= startHour * 60 || taskStart >= endHour * 60) return;

        const adjustedStart = Math.max(taskStart - startHour * 60, 0);
        const adjustedEnd = Math.min(taskEnd - startHour * 60, totalMinutes);

        const left = (adjustedStart / totalMinutes) * 100;
        const width = ((adjustedEnd - adjustedStart) / totalMinutes) * 100;

        const block = document.createElement('div');
        block.className = 'timeline-block';
        block.style.left = `${left}%`;
        block.style.width = `${width}%`;
        block.style.background = '#10b981';
        block.innerHTML = `<span class="timeline-block-text">${task.text}</span>`;
        block.title = `${task.text} (${task.startTime})`;

        container.appendChild(block);
    });
}

function updateNowMarker() {
    const marker = document.getElementById('timelineNowMarker');
    if (!marker) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const startHour = 6;
    const endHour = 24;
    const totalMinutes = (endHour - startHour) * 60;

    if (currentMinutes < startHour * 60 || currentMinutes > endHour * 60) {
        marker.style.display = 'none';
        return;
    }

    const position = ((currentMinutes - startHour * 60) / totalMinutes) * 100;
    marker.style.display = 'block';
    marker.style.left = `${position}%`;
}

function updateCurrentActivity() {
    const activityName = document.getElementById('currentActivityName');
    if (!activityName) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const today = new Date().getDay();
    const todayStr = formatDate(now);

    // Check routines first
    for (const routine of RoutinesState.routines) {
        if (!routine.days.includes(today)) continue;

        const [hours, mins] = routine.startTime.split(':').map(Number);
        const routineStart = hours * 60 + mins;
        const routineEnd = routineStart + routine.duration * 60;

        if (currentMinutes >= routineStart && currentMinutes < routineEnd) {
            activityName.textContent = routine.name;
            activityName.style.color = routine.color;
            return;
        }
    }

    // Check tasks
    const todayTasks = AppState.data.daily[todayStr]?.tasks || [];
    for (const task of todayTasks) {
        if (!task.startTime || task.completed) continue;

        const [hours, mins] = task.startTime.split(':').map(Number);
        const taskStart = hours * 60 + mins;
        const taskEnd = taskStart + (task.duration || DEFAULT_DURATION) * 60;

        if (currentMinutes >= taskStart && currentMinutes < taskEnd) {
            activityName.textContent = task.text;
            activityName.style.color = '#10b981';
            return;
        }
    }

    activityName.textContent = 'Free time';
    activityName.style.color = 'var(--text-primary)';
}

function renderRoutinesQuickView() {
    const container = document.getElementById('routinesQuickView');
    if (!container) return;

    const today = new Date().getDay();
    const todayRoutines = RoutinesState.routines.filter(r => r.days.includes(today));

    if (todayRoutines.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = todayRoutines.map(routine => {
        const endTime = calculateEndTime(routine.startTime, routine.duration);
        return `
            <div class="routine-chip" data-id="${routine.id}">
                <span class="routine-chip-color" style="background:${routine.color}"></span>
                <span class="routine-chip-name">${routine.name}</span>
                <span class="routine-chip-time">${routine.startTime}</span>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.routine-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            openRoutineModal(parseInt(chip.dataset.id));
        });
    });
}

function renderRoutines() {
    const list = document.getElementById('routinesList');
    if (!list) return;

    const today = new Date().getDay();
    const sortedRoutines = [...RoutinesState.routines].sort((a, b) => {
        return a.startTime.localeCompare(b.startTime);
    });

    if (sortedRoutines.length === 0) {
        list.innerHTML = '<p class="calendar-list-empty">No routines yet. Add your first routine!</p>';
        return;
    }

    list.innerHTML = sortedRoutines.map(routine => {
        const isToday = routine.days.includes(today);
        const endTime = calculateEndTime(routine.startTime, routine.duration);

        return `
            <div class="routine-item ${isToday ? '' : 'opacity-50'}" data-id="${routine.id}">
                <div class="routine-color" style="background:${routine.color}"></div>
                <div class="routine-info">
                    <div class="routine-name">${routine.name}</div>
                    <div class="routine-time">${routine.startTime} - ${endTime}</div>
                </div>
                <span class="routine-duration-badge">${routine.duration}h</span>
            </div>
        `;
    }).join('');

    // Add click handlers
    list.querySelectorAll('.routine-item').forEach(item => {
        item.addEventListener('click', () => {
            openRoutineModal(parseInt(item.dataset.id));
        });
    });
}

function calculateEndTime(startTime, duration) {
    const [hours, mins] = startTime.split(':').map(Number);
    const totalMins = hours * 60 + mins + duration * 60;
    const endHours = Math.floor(totalMins / 60) % 24;
    const endMins = totalMins % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

function initRoutineModal() {
    const modal = document.getElementById('routineModal');
    const closeBtn = document.getElementById('closeRoutineModal');
    const cancelBtn = document.getElementById('cancelRoutineModal');
    const saveBtn = document.getElementById('saveRoutineBtn');
    const deleteBtn = document.getElementById('deleteRoutineBtn');
    const colorPicker = document.getElementById('routineColorPicker');
    const daysPicker = document.getElementById('routineDaysPicker');

    if (!modal) return;

    // Close handlers
    const closeModal = () => {
        modal.classList.add('hidden');
        RoutinesState.editingId = null;
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Color picker
    colorPicker?.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', () => {
            colorPicker.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // Days picker
    daysPicker?.querySelectorAll('.day-option').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('selected');
        });
    });

    // Save
    saveBtn?.addEventListener('click', () => {
        const name = document.getElementById('routineName').value.trim();
        const startTime = document.getElementById('routineStartTime').value;
        const duration = parseFloat(document.getElementById('routineDuration').value);
        const color = colorPicker.querySelector('.color-option.selected')?.dataset.color || '#6366f1';
        const emoji = document.getElementById('selectedEmoji')?.textContent || '🏃';
        const days = Array.from(daysPicker.querySelectorAll('.day-option.selected'))
            .map(btn => parseInt(btn.dataset.day));

        if (!name) {
            showToast('Please enter a routine name');
            return;
        }

        if (days.length === 0) {
            showToast('Please select at least one day');
            return;
        }

        if (RoutinesState.editingId) {
            // Update existing
            const idx = RoutinesState.routines.findIndex(r => r.id === RoutinesState.editingId);
            if (idx !== -1) {
                RoutinesState.routines[idx] = { id: RoutinesState.editingId, name, emoji, startTime, duration, color, days };
            }
        } else {
            // Add new
            const newId = Date.now();
            RoutinesState.routines.push({ id: newId, name, emoji, startTime, duration, color, days });
        }

        saveRoutines();
        renderRoutines();
        renderTimeline();
        renderRoutinesQuickView();
        renderSidebarRoutines();
        closeModal();
        showToast(RoutinesState.editingId ? 'Routine updated' : 'Routine added');
    });

    // Delete
    deleteBtn?.addEventListener('click', () => {
        if (RoutinesState.editingId && confirm('Delete this routine?')) {
            RoutinesState.routines = RoutinesState.routines.filter(r => r.id !== RoutinesState.editingId);
            saveRoutines();
            renderRoutines();
            renderTimeline();
            renderRoutinesQuickView();
            closeModal();
            showToast('Routine deleted');
        }
    });
}

function openRoutineModal(routineId = null) {
    const modal = document.getElementById('routineModal');
    const title = document.getElementById('routineModalTitle');
    const deleteBtn = document.getElementById('deleteRoutineBtn');
    const nameInput = document.getElementById('routineName');
    const startInput = document.getElementById('routineStartTime');
    const durationInput = document.getElementById('routineDuration');
    const colorPicker = document.getElementById('routineColorPicker');
    const daysPicker = document.getElementById('routineDaysPicker');
    const emojiBtn = document.getElementById('selectedEmoji');

    RoutinesState.editingId = routineId;

    if (routineId) {
        // Edit mode
        const routine = RoutinesState.routines.find(r => r.id === routineId);
        if (!routine) return;

        title.textContent = 'Edit Routine';
        deleteBtn.style.display = 'inline-flex';
        nameInput.value = routine.name;
        startInput.value = routine.startTime;
        durationInput.value = routine.duration;

        // Set emoji
        if (emojiBtn) {
            emojiBtn.textContent = routine.emoji || '🏃';
        }

        // Set color
        colorPicker.querySelectorAll('.color-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.color === routine.color);
        });

        // Set days
        daysPicker.querySelectorAll('.day-option').forEach(btn => {
            btn.classList.toggle('selected', routine.days.includes(parseInt(btn.dataset.day)));
        });
    } else {
        // Add mode
        title.textContent = 'Add Routine';
        deleteBtn.style.display = 'none';
        nameInput.value = '';
        startInput.value = '09:00';
        durationInput.value = '1';

        // Reset emoji
        if (emojiBtn) {
            emojiBtn.textContent = '🏃';
        }

        // Reset color
        colorPicker.querySelectorAll('.color-option').forEach((btn, i) => {
            btn.classList.toggle('selected', i === 0);
        });

        // Reset days (all selected)
        daysPicker.querySelectorAll('.day-option').forEach(btn => {
            btn.classList.add('selected');
        });
    }

    modal.classList.remove('hidden');
}

function saveRoutines() {
    localStorage.setItem('dailyRoutines', JSON.stringify(RoutinesState.routines));
}

// ==================== Settings Page ====================
function initSettings() {
    const settingsClientId = document.getElementById('settingsClientId');
    const saveClientIdBtn = document.getElementById('saveClientId');
    const settingsConnectBtn = document.getElementById('settingsConnectGoogle');
    const settingsDisconnectBtn = document.getElementById('settingsDisconnectGoogle');
    const settingsGoogleStatus = document.getElementById('settingsGoogleStatus');
    const settingsAutoSync = document.getElementById('settingsAutoSync');
    const settingsImportGoogle = document.getElementById('settingsImportGoogle');
    const settingsExport = document.getElementById('settingsExport');
    const settingsImport = document.getElementById('settingsImport');
    const settingsImportFile = document.getElementById('settingsImportFile');
    const settingsClearData = document.getElementById('settingsClearData');

    // Load current settings
    settingsClientId.value = GoogleCalendarState.clientId || '';
    settingsAutoSync.checked = GoogleCalendarState.syncToGoogle;
    settingsImportGoogle.checked = GoogleCalendarState.syncFromGoogle;

    // Update status display
    function updateSettingsStatus() {
        const statusLabel = settingsGoogleStatus.querySelector('.status-label');
        if (GoogleCalendarState.isConnected) {
            settingsGoogleStatus.classList.remove('disconnected');
            settingsGoogleStatus.classList.add('connected');
            statusLabel.textContent = 'Connected';
            settingsConnectBtn.style.display = 'none';
            settingsDisconnectBtn.style.display = 'inline-flex';
        } else {
            settingsGoogleStatus.classList.remove('connected');
            settingsGoogleStatus.classList.add('disconnected');
            statusLabel.textContent = 'Not connected';
            settingsConnectBtn.style.display = 'inline-flex';
            settingsDisconnectBtn.style.display = 'none';
        }
    }
    updateSettingsStatus();

    // Save Client ID
    saveClientIdBtn.addEventListener('click', () => {
        const newClientId = settingsClientId.value.trim();
        if (newClientId) {
            GoogleCalendarState.clientId = newClientId;
            localStorage.setItem('googleClientId', newClientId);
            showToast('Client ID saved successfully');
            // Also update the modal input if it exists
            const modalClientId = document.getElementById('googleClientId');
            if (modalClientId) {
                modalClientId.value = newClientId;
            }
        } else {
            showToast('Please enter a valid Client ID');
        }
    });

    // Connect Google
    settingsConnectBtn.addEventListener('click', () => {
        if (!GoogleCalendarState.clientId) {
            showToast('Please save a Client ID first');
            return;
        }
        initGoogleAuth();
        setTimeout(updateSettingsStatus, 1000);
    });

    // Disconnect Google
    settingsDisconnectBtn.addEventListener('click', () => {
        if (typeof gapi !== 'undefined') {
            gapi.client.setToken(null);
        }
        GoogleCalendarState.isConnected = false;
        GoogleCalendarState.accessToken = null;
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleTokenTime');
        localStorage.removeItem('googleAuthorized');
        updateGoogleStatus(false);
        updateSettingsStatus();
        showToast('Disconnected from Google Calendar');
    });

    // Auto-sync toggle
    settingsAutoSync.addEventListener('change', () => {
        GoogleCalendarState.syncToGoogle = settingsAutoSync.checked;
        localStorage.setItem('syncToGoogle', settingsAutoSync.checked);
    });

    // Import from Google toggle
    settingsImportGoogle.addEventListener('change', () => {
        GoogleCalendarState.syncFromGoogle = settingsImportGoogle.checked;
        localStorage.setItem('syncFromGoogle', settingsImportGoogle.checked);
    });

    // Export data
    settingsExport.addEventListener('click', () => {
        document.getElementById('exportData').click();
    });

    // Import data
    settingsImport.addEventListener('click', () => {
        settingsImportFile.click();
    });

    settingsImportFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.tasks) {
                    tasks = data.tasks;
                    localStorage.setItem('plannerTasks', JSON.stringify(tasks));
                }
                if (data.notes) {
                    notes = data.notes;
                    localStorage.setItem('plannerNotes', JSON.stringify(notes));
                }
                renderAllQuadrants();
                renderCalendar();
                renderNotes();
                showToast('Data imported successfully');
            } catch (error) {
                showToast('Error importing data');
            }
        };
        reader.readAsText(file);
        settingsImportFile.value = '';
    });

    // Clear all data
    settingsClearData.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all your tasks, notes, and settings? This cannot be undone.')) {
            localStorage.clear();
            tasks = [];
            notes = [];
            renderAllQuadrants();
            renderCalendar();
            renderNotes();
            settingsClientId.value = '';
            GoogleCalendarState.clientId = '';
            GoogleCalendarState.isConnected = false;
            updateGoogleStatus();
            updateSettingsStatus();
            showToast('All data cleared');
        }
    });

    // Refresh calendar list button
    const refreshCalendarBtn = document.getElementById('refreshCalendarList');
    if (refreshCalendarBtn) {
        refreshCalendarBtn.addEventListener('click', () => {
            updateCalendarSelectionUI();
        });
    }

    // Listen for Google connection changes
    window.addEventListener('googleStatusChanged', () => {
        updateSettingsStatus();
        updateCalendarSelectionUI();
    });

    // Initial calendar list load if connected
    if (GoogleCalendarState.isConnected) {
        updateCalendarSelectionUI();
    }

    // ==================== AI Settings ====================
    const aiProvider = document.getElementById('aiProvider');
    const aiModel = document.getElementById('aiModel');
    const aiApiKey = document.getElementById('aiApiKey');
    const toggleAiKeyVisibility = document.getElementById('toggleAiKeyVisibility');
    const saveAiSettings = document.getElementById('saveAiSettings');
    const testAiConnection = document.getElementById('testAiConnection');
    const aiStatus = document.getElementById('aiStatus');

    if (aiProvider && aiModel && aiApiKey) {
        // Load current AI settings
        aiProvider.value = AIService.config.provider || 'claude';
        aiApiKey.value = AIService.config.apiKey || '';

        // Set model based on provider
        updateAiModelOptions();
        aiModel.value = AIService.config.model || 'claude-3-haiku-20240307';

        // Update AI status display
        function updateAiStatus() {
            const statusLabel = aiStatus.querySelector('.status-label');
            if (AIService.isConfigured()) {
                aiStatus.classList.remove('disconnected');
                aiStatus.classList.add('connected');
                statusLabel.textContent = 'Configured';
            } else {
                aiStatus.classList.remove('connected');
                aiStatus.classList.add('disconnected');
                statusLabel.textContent = 'Not configured';
            }
        }
        updateAiStatus();

        // Update model options based on provider
        function updateAiModelOptions() {
            const claudeModels = document.getElementById('claudeModels');
            const geminiModels = document.getElementById('geminiModels');
            if (aiProvider.value === 'claude') {
                claudeModels.style.display = 'block';
                geminiModels.style.display = 'none';
                if (!aiModel.value.startsWith('claude')) {
                    aiModel.value = 'claude-3-haiku-20240307';
                }
            } else {
                claudeModels.style.display = 'none';
                geminiModels.style.display = 'block';
                if (!aiModel.value.startsWith('gemini')) {
                    aiModel.value = 'gemini-2.0-flash';
                }
            }
        }

        aiProvider.addEventListener('change', updateAiModelOptions);

        // Toggle API key visibility
        toggleAiKeyVisibility.addEventListener('click', () => {
            if (aiApiKey.type === 'password') {
                aiApiKey.type = 'text';
                toggleAiKeyVisibility.textContent = '🙈';
            } else {
                aiApiKey.type = 'password';
                toggleAiKeyVisibility.textContent = '👁️';
            }
        });

        // Save AI settings
        saveAiSettings.addEventListener('click', () => {
            AIService.config.provider = aiProvider.value;
            AIService.config.model = aiModel.value;
            AIService.config.apiKey = aiApiKey.value.trim();
            AIService.saveConfig();
            updateAiStatus();
            showToast('AI settings saved successfully');
        });

        // Test AI connection
        testAiConnection.addEventListener('click', async () => {
            if (!aiApiKey.value.trim()) {
                showToast('Please enter an API key first');
                return;
            }

            // Temporarily save config for testing
            AIService.config.provider = aiProvider.value;
            AIService.config.model = aiModel.value;
            AIService.config.apiKey = aiApiKey.value.trim();

            testAiConnection.disabled = true;
            testAiConnection.textContent = 'Testing...';

            try {
                const response = await AIService.callAI('Say "Connection successful!" in exactly those words.');
                if (response.toLowerCase().includes('connection successful')) {
                    showToast('AI connection successful!');
                    AIService.saveConfig();
                    updateAiStatus();
                } else {
                    showToast('AI responded but may not be working correctly');
                }
            } catch (error) {
                showToast('Connection failed: ' + error.message);
            } finally {
                testAiConnection.disabled = false;
                testAiConnection.textContent = 'Test Connection';
            }
        });
    }
}

// ==================== Smart AI Schedule ====================
function initSmartSchedule() {
    const smartScheduleBtn = document.getElementById('smartScheduleBtn');
    const smartScheduleModal = document.getElementById('smartScheduleModal');
    const closeSmartSchedule = document.getElementById('closeSmartSchedule');
    const generateScheduleBtn = document.getElementById('generateScheduleBtn');
    const scheduleResult = document.getElementById('scheduleResult');
    const smartScheduleBody = document.getElementById('smartScheduleBody');

    if (!smartScheduleBtn || !smartScheduleModal) return;

    // Open modal
    smartScheduleBtn.addEventListener('click', () => {
        if (typeof AIService === 'undefined' || !AIService.isConfigured()) {
            showToast('Please configure AI in Settings first');
            document.querySelector('[data-tab="settings"]')?.click();
            return;
        }
        smartScheduleModal.classList.remove('hidden');
    });

    // Close modal
    closeSmartSchedule?.addEventListener('click', () => {
        smartScheduleModal.classList.add('hidden');
    });

    smartScheduleModal.addEventListener('click', (e) => {
        if (e.target === smartScheduleModal) {
            smartScheduleModal.classList.add('hidden');
        }
    });

    // Generate schedule
    generateScheduleBtn?.addEventListener('click', async () => {
        const days = parseInt(document.getElementById('scheduleDays').value) || 7;
        const workStart = document.getElementById('workStartTime').value || '06:00';
        const workEnd = document.getElementById('workEndTime').value || '22:00';

        // Show loading
        scheduleResult.classList.remove('hidden');
        scheduleResult.innerHTML = `
            <div class="ai-loading">
                <div class="ai-loading-spinner"></div>
                <span>AI is analyzing your workload and creating optimal schedule...</span>
            </div>
        `;
        document.querySelector('.smart-schedule-intro').style.display = 'none';

        try {
            // Gather all unscheduled and upcoming tasks
            const allTasks = [];
            const today = new Date();

            // Get tasks from Eisenhower matrix
            Object.entries(AppState.data.eisenhower).forEach(([quadrant, tasks]) => {
                tasks.forEach(task => {
                    if (!task.completed) {
                        allTasks.push({ ...task, quadrant });
                    }
                });
            });

            // Get tasks from daily
            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() + i);
                const dateKey = formatDate(date);
                const dayTasks = AppState.data.daily[dateKey]?.tasks || [];
                dayTasks.forEach(task => {
                    if (!task.completed && !allTasks.find(t => t.id === task.id)) {
                        allTasks.push(task);
                    }
                });
            }

            // Get bid deadlines
            let bidDeadlines = '';
            if (typeof BidTracker !== 'undefined' && BidTracker.bids) {
                const activeBids = BidTracker.bids.filter(b => ['researching', 'preparing'].includes(b.status));
                bidDeadlines = activeBids.map(b => `${b.projectName}: Due ${b.dueDate}`).join(', ');
            }

            const schedule = await AIService.generateSmartSchedule(
                allTasks,
                RoutinesState.routines,
                {
                    startDate: formatDate(today),
                    endDate: formatDate(new Date(today.getTime() + days * 24 * 60 * 60 * 1000)),
                    workStart,
                    workEnd,
                    bidDeadlines
                }
            );

            // Display schedule
            displaySmartSchedule(schedule);
        } catch (error) {
            scheduleResult.innerHTML = `
                <div class="error-message">
                    <p>❌ Failed to generate schedule: ${error.message}</p>
                    <button class="btn btn-secondary" onclick="document.querySelector('.smart-schedule-intro').style.display='block'; document.getElementById('scheduleResult').classList.add('hidden');">Try Again</button>
                </div>
            `;
        }
    });

    function displaySmartSchedule(schedule) {
        if (!schedule || !schedule.schedule) {
            scheduleResult.innerHTML = '<p>No schedule generated</p>';
            return;
        }

        // Group by date
        const byDate = {};
        schedule.schedule.forEach(item => {
            if (!byDate[item.date]) byDate[item.date] = [];
            byDate[item.date].push(item);
        });

        let html = `
            <div class="schedule-header">
                <h4>📅 Your Optimized Schedule</h4>
                ${schedule.utilizationRate ? `<span class="utilization-badge">${schedule.utilizationRate} utilized</span>` : ''}
            </div>
        `;

        // Render each day
        Object.entries(byDate).forEach(([date, items]) => {
            const dateObj = new Date(date + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

            html += `<div class="schedule-day">
                <div class="schedule-day-header">${dayName}</div>`;

            items.sort((a, b) => a.startTime.localeCompare(b.startTime)).forEach(item => {
                const typeClass = item.type || 'task';
                html += `
                    <div class="schedule-item ${typeClass}">
                        <span class="schedule-time">${item.startTime} - ${item.endTime}</span>
                        <span class="schedule-task-name">${item.taskName}</span>
                        ${item.priority ? `<span class="priority-indicator ${item.priority}">${item.priority}</span>` : ''}
                    </div>
                `;
            });

            html += '</div>';
        });

        // Add suggestions
        if (schedule.suggestions && schedule.suggestions.length > 0) {
            html += `
                <div class="schedule-suggestions">
                    <h5>💡 AI Suggestions</h5>
                    <ul>
                        ${schedule.suggestions.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Add conflicts warning
        if (schedule.conflicts && schedule.conflicts.length > 0) {
            html += `
                <div class="schedule-conflicts">
                    <h5>⚠️ Conflicts Detected</h5>
                    <ul>
                        ${schedule.conflicts.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        html += `
            <div class="schedule-actions">
                <button class="btn btn-primary" id="applyScheduleBtn">✅ Apply Schedule</button>
                <button class="btn btn-secondary" onclick="document.querySelector('.smart-schedule-intro').style.display='block'; document.getElementById('scheduleResult').classList.add('hidden');">🔄 Regenerate</button>
            </div>
        `;

        scheduleResult.innerHTML = html;

        // Apply schedule button
        document.getElementById('applyScheduleBtn')?.addEventListener('click', () => {
            applySmartSchedule(schedule);
        });
    }

    function applySmartSchedule(schedule) {
        if (!schedule || !schedule.schedule) return;

        let applied = 0;
        schedule.schedule.forEach(item => {
            if (item.type === 'task' && item.taskId) {
                // Find and update the task
                const dateKey = item.date;

                // Ensure daily entry exists
                if (!AppState.data.daily[dateKey]) {
                    AppState.data.daily[dateKey] = { tasks: [] };
                }

                // Check if task already exists for this date
                const existingTask = AppState.data.daily[dateKey].tasks.find(t => t.id === item.taskId);
                if (existingTask) {
                    existingTask.startTime = item.startTime;
                    existingTask.scheduledDate = dateKey;
                } else {
                    // Look for task in eisenhower matrix
                    for (const [quadrant, tasks] of Object.entries(AppState.data.eisenhower)) {
                        const task = tasks.find(t => t.id === item.taskId);
                        if (task) {
                            task.startTime = item.startTime;
                            task.scheduledDate = dateKey;

                            // Add to daily if not already there
                            if (!AppState.data.daily[dateKey].tasks.find(t => t.id === task.id)) {
                                AppState.data.daily[dateKey].tasks.push({ ...task });
                            }
                            break;
                        }
                    }
                }
                applied++;
            }
        });

        saveData();
        renderCalendar();
        renderEisenhowerMatrix();
        showToast(`Applied ${applied} scheduled items!`);
        smartScheduleModal.classList.add('hidden');

        // Reset modal state
        document.querySelector('.smart-schedule-intro').style.display = 'block';
        scheduleResult.classList.add('hidden');
    }
}

// ==================== Keyboard Shortcuts ====================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            // Allow Escape to close modals even when in input
            if (e.key === 'Escape') {
                closeAllModals();
            }
            return;
        }

        // Global shortcuts
        switch (e.key.toLowerCase()) {
            case 'n':
                // N = New task
                e.preventDefault();
                openTaskModal(new Date());
                break;

            case 'h':
                // H = Home
                e.preventDefault();
                document.querySelector('[data-tab="home"]')?.click();
                break;

            case 'p':
                // P = Prioritize (Eisenhower)
                e.preventDefault();
                document.querySelector('[data-tab="eisenhower"]')?.click();
                break;

            case 'c':
                // C = Calendar
                e.preventDefault();
                document.querySelector('[data-tab="calendar"]')?.click();
                break;

            case 'b':
                // B = Bid Tracker
                e.preventDefault();
                document.querySelector('[data-tab="bids"]')?.click();
                break;

            case 's':
                // S = Sync (if connected to Google)
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (GoogleCalendarState.isConnected) {
                        fullGoogleSync();
                    }
                }
                break;

            case '/':
            case '?':
                // ? = Show shortcuts help
                e.preventDefault();
                showShortcutsHelp();
                break;

            case 'escape':
                closeAllModals();
                break;
        }
    });
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function showShortcutsHelp() {
    showToast('Shortcuts: N=New Task, H=Home, P=Prioritize, C=Calendar, B=Bids, Ctrl+S=Sync, ?=Help');
}

// ==================== Initialize App ====================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTabs();
    initHomePage();
    initCalendar();
    initDayWeekPopup();
    initTaskModal();
    initTimer();
    initEisenhowerMatrix();
    initNotes();
    initImportExport();
    initSidebarToggle();
    initGoogleCalendar();
    initSettings();
    initKeyboardShortcuts();
});
