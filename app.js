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

// Default routines for new users
const DEFAULT_ROUTINES = [
    { id: 1, name: 'Morning Routine', startTime: '06:00', duration: 1, color: '#10b981', days: [0,1,2,3,4,5,6] },
    { id: 2, name: 'Exercise', startTime: '07:00', duration: 1, color: '#f59e0b', days: [1,2,3,4,5] },
    { id: 3, name: 'Work Block 1', startTime: '09:00', duration: 3, color: '#6366f1', days: [1,2,3,4,5] },
    { id: 4, name: 'Lunch', startTime: '12:00', duration: 1, color: '#ec4899', days: [0,1,2,3,4,5,6] },
    { id: 5, name: 'Work Block 2', startTime: '13:00', duration: 4, color: '#6366f1', days: [1,2,3,4,5] },
    { id: 6, name: 'Evening Routine', startTime: '21:00', duration: 1, color: '#8b5cf6', days: [0,1,2,3,4,5,6] }
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
        duration: options.duration || 1,
        startTime: options.startTime || '09:00',
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

            navItems.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

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
            }
        });
    });
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
        AppState.currentMonth = new Date().getMonth();
        AppState.currentYear = new Date().getFullYear();
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

            // Show tasks with colors based on quadrant
            tasks.slice(0, 3).forEach(task => {
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

            if (tasks.length > 3) {
                const more = document.createElement('div');
                more.className = 'calendar-task-more';
                more.textContent = `+${tasks.length - 3} more`;
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
        AppState.popupWeekStart.setDate(AppState.popupWeekStart.getDate() - 7);
        renderWeekView();
    });

    nextWeekBtn.addEventListener('click', () => {
        AppState.popupWeekStart.setDate(AppState.popupWeekStart.getDate() + 7);
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

    // Generate time slots (6 AM to 10 PM)
    for (let hour = 6; hour <= 22; hour++) {
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
        const timeA = a.startTime || '09:00';
        const timeB = b.startTime || '09:00';
        return timeA.localeCompare(timeB);
    });

    // Render Gantt bars
    sortedTasks.forEach((task, index) => {
        const startTime = task.startTime || '09:00';
        const duration = task.duration || 1;
        const [startHour, startMin] = startTime.split(':').map(Number);

        // Calculate position (6AM = 0, each hour = 60px)
        const startOffset = (startHour - 6) * 60 + startMin;
        const widthPx = duration * 60;

        const ganttBar = document.createElement('div');
        ganttBar.className = 'gantt-bar';
        if (task.completed) ganttBar.classList.add('completed');

        const color = task.quadrant ? QUADRANT_COLORS[task.quadrant] : 'var(--accent-primary)';
        ganttBar.style.backgroundColor = color;
        ganttBar.style.left = `${startOffset}px`;
        ganttBar.style.width = `${widthPx}px`;
        ganttBar.style.top = `${index * 40}px`;

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

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
            <span class="week-day-name">${dayNames[i]}</span>
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

        // Create time slot backgrounds
        for (let hour = 6; hour <= 22; hour++) {
            const slot = document.createElement('div');
            slot.className = 'week-time-slot-bg';
            tasksGrid.appendChild(slot);
        }

        // Add tasks as positioned blocks
        const tasks = AppState.data.daily[dateKey]?.tasks || [];
        tasks.forEach(task => {
            const startTime = task.startTime || '09:00';
            const duration = task.duration || 1;
            const [startHour, startMin] = startTime.split(':').map(Number);

            // Calculate position
            const topOffset = (startHour - 6) * 50 + (startMin / 60) * 50;
            const height = duration * 50;

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
        const duration = parseFloat(document.getElementById('modalTaskDuration').value) || 1;
        const startTime = document.getElementById('modalTaskStartTime').value || '09:00';

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
    const durationHours = task.duration || 1;
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

            const duration = parseFloat(durationInput.value) || 1;
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
        const aDuration = a.duration || 1;
        const bDuration = b.duration || 1;

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

                const startTime = task.startTime || '09:00';
                const startDate = new Date(task.scheduledDate + 'T' + startTime + ':00');
                const endDate = new Date(startDate);
                endDate.setHours(startDate.getHours() + Math.floor(task.duration || 1));
                endDate.setMinutes(startDate.getMinutes() + ((task.duration || 1) % 1) * 60);

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
async function fullGoogleSync() {
    if (!GoogleCalendarState.isConnected) {
        showToast('Connect to Google Calendar first');
        return;
    }

    const syncBtn = document.getElementById('googleSyncBtn');
    syncBtn.innerHTML = '<span>⏳</span> <span>Syncing...</span>';
    syncBtn.disabled = true;

    try {
        if (GoogleCalendarState.syncToGoogle) {
            await syncToGoogleCalendar();
        }
        if (GoogleCalendarState.syncFromGoogle) {
            await syncFromGoogleCalendar();
        }
    } finally {
        syncBtn.innerHTML = '<span>🔄</span> <span>Sync Now</span>';
        syncBtn.disabled = false;
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
}

// ==================== Home Page & Routines ====================
function initHomePage() {
    // Initialize with default routines if none exist
    if (RoutinesState.routines.length === 0) {
        RoutinesState.routines = DEFAULT_ROUTINES;
        saveRoutines();
    }

    // Start clock
    updateClock();
    RoutinesState.clockInterval = setInterval(updateClock, 1000);

    // Render clock markers
    renderClockMarkers();

    // Render everything on clock
    renderRoutines();
    renderRoutineSegments();
    renderTaskSegments();

    // Dropdown toggle
    const dropdownToggle = document.getElementById('routinesDropdownToggle');
    const dropdownContent = document.getElementById('routinesDropdownContent');

    dropdownToggle?.addEventListener('click', () => {
        dropdownToggle.classList.toggle('active');
        dropdownContent.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.routines-dropdown')) {
            dropdownToggle?.classList.remove('active');
            dropdownContent?.classList.add('hidden');
        }
    });

    // Add routine button
    document.getElementById('addRoutineBtn')?.addEventListener('click', () => {
        openRoutineModal();
    });

    // Routine modal handlers
    initRoutineModal();
}

function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Update digital time
    const digitalTime = document.getElementById('digitalTime');
    if (digitalTime) {
        digitalTime.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Update date
    const currentDate = document.getElementById('currentDate');
    if (currentDate) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDate.textContent = now.toLocaleDateString('en-US', options);
    }

    // Update clock hands (12-hour format for display)
    const hourHand = document.getElementById('hourHand');
    const minuteHand = document.getElementById('minuteHand');

    if (hourHand && minuteHand) {
        const hourDeg = ((hours % 12) + minutes / 60) * 30;
        const minuteDeg = (minutes + seconds / 60) * 6;

        hourHand.style.transform = `rotate(${hourDeg}deg)`;
        minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
    }
}

function renderClockMarkers() {
    const markersGroup = document.getElementById('clockMarkers');
    if (!markersGroup) return;

    markersGroup.innerHTML = '';

    // 24-hour markers (every 2 hours to avoid clutter)
    for (let i = 0; i < 24; i += 2) {
        const angle = (i / 24) * 360 - 90;
        const radian = (angle * Math.PI) / 180;
        const x = 200 + Math.cos(radian) * 160;
        const y = 200 + Math.sin(radian) * 160;

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + 5);
        text.setAttribute('text-anchor', 'middle');
        text.textContent = String(i).padStart(2, '0');
        markersGroup.appendChild(text);
    }
}

function renderRoutineSegments() {
    const segmentsGroup = document.getElementById('routineSegments');
    if (!segmentsGroup) return;

    segmentsGroup.innerHTML = '';

    const today = new Date().getDay();
    const todayRoutines = RoutinesState.routines.filter(r => r.days.includes(today));

    todayRoutines.forEach(routine => {
        const [hours, mins] = routine.startTime.split(':').map(Number);
        const startMinutes = hours * 60 + mins;
        const endMinutes = startMinutes + routine.duration * 60;

        // Convert to 24-hour clock angles
        const startAngle = (startMinutes / (24 * 60)) * 360 - 90;
        const endAngle = (endMinutes / (24 * 60)) * 360 - 90;

        const path = describeArc(200, 200, 140, startAngle, endAngle);

        const segment = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        segment.setAttribute('d', path);
        segment.setAttribute('fill', routine.color);
        segment.setAttribute('class', 'routine-segment');
        segment.setAttribute('data-id', routine.id);

        segment.addEventListener('click', () => openRoutineModal(routine.id));

        segmentsGroup.appendChild(segment);

        // Add label
        const midAngle = (startAngle + endAngle) / 2;
        const labelRadian = (midAngle * Math.PI) / 180;
        const labelX = 200 + Math.cos(labelRadian) * 120;
        const labelY = 200 + Math.sin(labelRadian) * 120;

        if (routine.duration >= 0.5) {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', labelX);
            label.setAttribute('y', labelY + 3);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('class', 'routine-segment-label');
            label.textContent = routine.name.substring(0, 10);
            segmentsGroup.appendChild(label);
        }
    });
}

function describeArc(x, y, radius, startAngle, endAngle) {
    const startRadian = (startAngle * Math.PI) / 180;
    const endRadian = (endAngle * Math.PI) / 180;

    const x1 = x + Math.cos(startRadian) * radius;
    const y1 = y + Math.sin(startRadian) * radius;
    const x2 = x + Math.cos(endRadian) * radius;
    const y2 = y + Math.sin(endRadian) * radius;

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x} ${y} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

// Render today's scheduled tasks on the clock
function renderTaskSegments() {
    const segmentsGroup = document.getElementById('taskSegments');
    if (!segmentsGroup) return;

    segmentsGroup.innerHTML = '';

    const today = formatDate(new Date());
    const todayTasks = AppState.data.daily[today]?.tasks || [];

    // Filter tasks that have a start time
    const scheduledTasks = todayTasks.filter(task => task.startTime && task.duration);

    scheduledTasks.forEach(task => {
        const [hours, mins] = task.startTime.split(':').map(Number);
        const startMinutes = hours * 60 + mins;
        const endMinutes = startMinutes + (task.duration || 1) * 60;

        // Convert to 24-hour clock angles
        const startAngle = (startMinutes / (24 * 60)) * 360 - 90;
        const endAngle = (endMinutes / (24 * 60)) * 360 - 90;

        // Use inner radius for tasks (routines use outer)
        const path = describeArc(200, 200, 100, startAngle, endAngle);

        const segment = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        segment.setAttribute('d', path);
        segment.setAttribute('fill', task.completed ? '#6b7280' : '#10b981');
        segment.setAttribute('class', 'task-segment');
        segment.setAttribute('data-id', task.id);

        segmentsGroup.appendChild(segment);

        // Add label for longer tasks
        if ((task.duration || 1) >= 0.5) {
            const midAngle = (startAngle + endAngle) / 2;
            const labelRadian = (midAngle * Math.PI) / 180;
            const labelX = 200 + Math.cos(labelRadian) * 75;
            const labelY = 200 + Math.sin(labelRadian) * 75;

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', labelX);
            label.setAttribute('y', labelY + 3);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('class', 'segment-label');
            label.textContent = task.text.substring(0, 8);
            segmentsGroup.appendChild(label);
        }
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
                RoutinesState.routines[idx] = { id: RoutinesState.editingId, name, startTime, duration, color, days };
            }
        } else {
            // Add new
            const newId = Date.now();
            RoutinesState.routines.push({ id: newId, name, startTime, duration, color, days });
        }

        saveRoutines();
        renderRoutines();
        renderRoutineSegments();
        closeModal();
        showToast(RoutinesState.editingId ? 'Routine updated' : 'Routine added');
    });

    // Delete
    deleteBtn?.addEventListener('click', () => {
        if (RoutinesState.editingId && confirm('Delete this routine?')) {
            RoutinesState.routines = RoutinesState.routines.filter(r => r.id !== RoutinesState.editingId);
            saveRoutines();
            renderRoutines();
            renderRoutineSegments();
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
});
