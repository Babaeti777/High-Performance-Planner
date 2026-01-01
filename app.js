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

// Timer state for task timing
const TimerState = {
    taskName: '',
    startTime: null,
    elapsed: 0,
    running: false,
    interval: null,
    taskDuration: 0
};

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
            startTaskTimer(task);
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
                <button class="task-start-btn" title="Start timer">▶</button>
                <button class="task-delete-btn" title="Delete">×</button>
            </div>
        `;

        const checkbox = taskItem.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => {
            toggleTaskComplete(task, dateKey);
            renderDayView(date);
        });

        const startBtn = taskItem.querySelector('.task-start-btn');
        startBtn.addEventListener('click', () => {
            startTaskTimer(task);
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
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
}

// ==================== Google Calendar Integration ====================
const GoogleCalendarState = {
    isConnected: false,
    accessToken: null,
    tokenClient: null,
    clientId: localStorage.getItem('googleClientId') || '',
    syncToGoogle: localStorage.getItem('syncToGoogle') !== 'false',
    syncFromGoogle: localStorage.getItem('syncFromGoogle') === 'true'
};

const GOOGLE_API_SCOPES = 'https://www.googleapis.com/auth/calendar.events';
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
                    showToast('Authentication failed');
                    return;
                }
                GoogleCalendarState.accessToken = response.access_token;
                updateGoogleStatus(true);
                showToast('Connected to Google Calendar!');
            },
        });

        // Check if we have a stored token
        const storedToken = sessionStorage.getItem('googleAccessToken');
        if (storedToken) {
            gapi.client.setToken({ access_token: storedToken });
            GoogleCalendarState.accessToken = storedToken;
            updateGoogleStatus(true);
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
        sessionStorage.removeItem('googleAccessToken');
        updateGoogleStatus(false);
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

// Sync events from Google Calendar
async function syncFromGoogleCalendar() {
    if (!GoogleCalendarState.isConnected || !GoogleCalendarState.syncFromGoogle) {
        return;
    }

    showToast('Importing from Google Calendar...');

    try {
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const response = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin: today.toISOString(),
            timeMax: nextMonth.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 100
        });

        const events = response.result.items || [];
        let importedCount = 0;

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
                    createdAt: new Date().toISOString()
                });

                importedCount++;
            }
        }

        if (importedCount > 0) {
            saveData();
            renderCalendar();
        }

        showToast(`Imported ${importedCount} event${importedCount !== 1 ? 's' : ''} from Google Calendar`);
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

// ==================== Initialize App ====================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTabs();
    initCalendar();
    initDayWeekPopup();
    initTaskModal();
    initTimer();
    initEisenhowerMatrix();
    initNotes();
    initImportExport();
    initSidebarToggle();
    initGoogleCalendar();
});
