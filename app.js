// ==================== High-Performance Planner App ====================
// Global state management
const AppState = {
    currentDate: new Date(),
    currentWeekStart: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedNote: null,
    eventFilter: 'all',
    data: {
        daily: {},
        weekly: {},
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
            weekly: {},
            monthly: {}
        },
        events: {
            daily: {},
            weekly: {},
            monthly: {}
        }
    }
};

// ==================== Utility Functions ====================
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

function getWeekKey(date) {
    const weekStart = getWeekStart(date);
    return formatDate(weekStart);
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
        AppState.data = JSON.parse(saved);
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
    const key = formatDate(date);
    return holidays[key];
}

function getHolidaysInRange(startDate, endDate) {
    const result = [];
    for (const [date, name] of Object.entries(holidays)) {
        const holidayDate = new Date(date);
        if (holidayDate >= startDate && holidayDate <= endDate) {
            result.push({ date: holidayDate, name });
        }
    }
    return result;
}

// ==================== Tab Navigation ====================
function initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Remove active class from all nav items and contents
            navItems.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked nav item and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Refresh the view when switching tabs
            switch(targetTab) {
                case 'daily':
                    renderNewWeeklyView();
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
                case 'insights':
                    renderInsights();
                    break;
            }
        });
    });
}

// ==================== Daily Planner ====================
function initDailyPlanner() {
    const dailyDate = document.getElementById('dailyDate');
    const prevDay = document.getElementById('prevDay');
    const nextDay = document.getElementById('nextDay');
    const todayBtn = document.getElementById('todayBtn');
    const addDailyTask = document.getElementById('addDailyTask');
    const dailyTaskInput = document.getElementById('dailyTaskInput');
    const addDailyEvent = document.getElementById('addDailyEvent');
    const dailyEventInput = document.getElementById('dailyEventInput');
    const saveDailyLessons = document.getElementById('saveDailyLessons');

    dailyDate.value = formatDate(AppState.currentDate);

    dailyDate.addEventListener('change', (e) => {
        AppState.currentDate = new Date(e.target.value + 'T00:00:00');
        renderDailyPlanner();
    });

    prevDay.addEventListener('click', () => {
        AppState.currentDate.setDate(AppState.currentDate.getDate() - 1);
        dailyDate.value = formatDate(AppState.currentDate);
        renderDailyPlanner();
    });

    nextDay.addEventListener('click', () => {
        AppState.currentDate.setDate(AppState.currentDate.getDate() + 1);
        dailyDate.value = formatDate(AppState.currentDate);
        renderDailyPlanner();
    });

    todayBtn.addEventListener('click', () => {
        AppState.currentDate = new Date();
        dailyDate.value = formatDate(AppState.currentDate);
        renderDailyPlanner();
    });

    addDailyTask.addEventListener('click', () => addTask());
    dailyTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    addDailyEvent.addEventListener('click', () => addDailyEventHandler());
    dailyEventInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addDailyEventHandler();
    });

    saveDailyLessons.addEventListener('click', saveDailyLessonsHandler);

    renderDailyPlanner();
}

function renderDailyPlanner() {
    const dateKey = formatDate(AppState.currentDate);

    // Display holiday if any
    const holiday = getHoliday(AppState.currentDate);
    const holidayDisplay = document.getElementById('dailyHoliday');
    if (holiday) {
        holidayDisplay.textContent = `🎉 ${holiday}`;
        holidayDisplay.classList.add('visible');
    } else {
        holidayDisplay.classList.remove('visible');
    }

    // Render time slots
    renderTimeSlots(dateKey);

    // Render tasks
    renderDailyTasks(dateKey);

    // Render events
    renderDailyEvents(dateKey);

    // Load lessons
    const lessonsTextarea = document.getElementById('dailyLessons');
    lessonsTextarea.value = AppState.data.lessons.daily[dateKey] || '';
}

function renderTimeSlots(dateKey) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    timeSlotsContainer.innerHTML = '';

    if (!AppState.data.daily[dateKey]) {
        AppState.data.daily[dateKey] = { timeSlots: {}, tasks: [] };
    }

    const timeSlots = AppState.data.daily[dateKey].timeSlots || {};

    for (let hour = 6; hour < 23; hour++) {
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        const slot = document.createElement('div');
        slot.className = 'time-slot';

        const timeLabel = document.createElement('span');
        timeLabel.className = 'time-slot-time';
        timeLabel.textContent = timeStr;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'time-slot-input';
        input.placeholder = 'What are you doing?';
        input.value = timeSlots[timeStr] || '';
        input.dataset.time = timeStr;

        input.addEventListener('blur', (e) => {
            if (!AppState.data.daily[dateKey].timeSlots) {
                AppState.data.daily[dateKey].timeSlots = {};
            }
            AppState.data.daily[dateKey].timeSlots[timeStr] = e.target.value;
            saveData();
        });

        slot.appendChild(timeLabel);
        slot.appendChild(input);
        timeSlotsContainer.appendChild(slot);
    }
}

function addTask() {
    const input = document.getElementById('dailyTaskInput');
    const quadrantSelect = document.getElementById('dailyTaskQuadrant');
    const durationInput = document.getElementById('dailyTaskDuration');
    const taskText = input.value.trim();
    if (!taskText) return;

    const dateKey = formatDate(AppState.currentDate);
    const quadrant = quadrantSelect.value;
    const duration = parseFloat(durationInput.value) || 0;
    const taskId = Date.now();

    if (!AppState.data.daily[dateKey]) {
        AppState.data.daily[dateKey] = { timeSlots: {}, tasks: [] };
    }

    const newTask = {
        id: taskId,
        text: taskText,
        completed: false,
        duration: duration
    };

    // If a quadrant is selected, link to Eisenhower Matrix
    if (quadrant) {
        newTask.source = 'eisenhower';
        newTask.quadrant = quadrant;

        // Add to Eisenhower Matrix as well
        AppState.data.eisenhower[quadrant].push({
            id: taskId,
            text: taskText,
            completed: false,
            quadrant: quadrant,
            duration: duration,
            scheduledDate: dateKey,
            createdAt: new Date().toISOString()
        });
    }

    AppState.data.daily[dateKey].tasks.push(newTask);

    input.value = '';
    quadrantSelect.value = '';
    durationInput.value = '';
    saveData();
    renderDailyTasks(dateKey);

    // Refresh Eisenhower if a quadrant was selected
    if (quadrant) {
        renderEisenhowerMatrix();
    }
}

function renderDailyTasks(dateKey) {
    const taskList = document.getElementById('dailyTaskList');
    taskList.innerHTML = '';

    const tasks = AppState.data.daily[dateKey]?.tasks || [];

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => {
            task.completed = checkbox.checked;

            // If task is from Eisenhower, update it there too
            if (task.source === 'eisenhower' && task.quadrant) {
                const eisenTask = AppState.data.eisenhower[task.quadrant]?.find(t => t.id === task.id);
                if (eisenTask) {
                    eisenTask.completed = task.completed;
                }
            }

            saveData();
            renderDailyTasks(dateKey);
        });

        const textContainer = document.createElement('div');
        textContainer.style.flex = '1';
        textContainer.style.display = 'flex';
        textContainer.style.flexDirection = 'column';
        textContainer.style.gap = '5px';

        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = task.text;

        const metaInfo = document.createElement('div');
        metaInfo.style.display = 'flex';
        metaInfo.style.gap = '8px';
        metaInfo.style.flexWrap = 'wrap';

        // Show quadrant badge if from Eisenhower
        if (task.source === 'eisenhower' && task.quadrant) {
            const quadrantBadge = document.createElement('span');
            quadrantBadge.className = `task-badge badge-${task.quadrant}`;
            const quadrantLabels = {
                'urgent-important': '🔥 U&I',
                'not-urgent-important': '📅 I',
                'urgent-not-important': '⚡ U',
                'not-urgent-not-important': '🗑️ Low'
            };
            quadrantBadge.textContent = quadrantLabels[task.quadrant] || task.quadrant;
            metaInfo.appendChild(quadrantBadge);
        }

        // Show duration if available
        if (task.duration && task.duration > 0) {
            const durationBadge = document.createElement('span');
            durationBadge.className = 'task-duration';
            durationBadge.textContent = `⏱️ ${task.duration}h`;
            metaInfo.appendChild(durationBadge);
        }

        textContainer.appendChild(text);
        if (metaInfo.children.length > 0) {
            textContainer.appendChild(metaInfo);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            const index = tasks.indexOf(task);
            tasks.splice(index, 1);

            // If task is from Eisenhower, remove scheduled date there
            if (task.source === 'eisenhower' && task.quadrant) {
                const eisenTask = AppState.data.eisenhower[task.quadrant]?.find(t => t.id === task.id);
                if (eisenTask) {
                    eisenTask.scheduledDate = null;
                }
            }

            saveData();
            renderDailyTasks(dateKey);
        });

        li.appendChild(checkbox);
        li.appendChild(textContainer);
        li.appendChild(deleteBtn);
        taskList.appendChild(li);
    });
}

function addDailyEventHandler() {
    const input = document.getElementById('dailyEventInput');
    const eventText = input.value.trim();
    if (!eventText) return;

    const dateKey = formatDate(AppState.currentDate);
    if (!AppState.data.events.daily[dateKey]) {
        AppState.data.events.daily[dateKey] = [];
    }

    AppState.data.events.daily[dateKey].push({
        id: Date.now(),
        text: eventText,
        date: AppState.currentDate.toISOString()
    });

    input.value = '';
    saveData();
    renderDailyEvents(dateKey);
}

function renderDailyEvents(dateKey) {
    const eventList = document.getElementById('dailyEventList');
    eventList.innerHTML = '';

    const events = AppState.data.events.daily[dateKey] || [];

    events.forEach(event => {
        const li = document.createElement('li');
        li.className = 'event-item';

        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = event.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            const index = events.indexOf(event);
            events.splice(index, 1);
            saveData();
            renderDailyEvents(dateKey);
        });

        li.appendChild(text);
        li.appendChild(deleteBtn);
        eventList.appendChild(li);
    });
}

function saveDailyLessonsHandler() {
    const textarea = document.getElementById('dailyLessons');
    const dateKey = formatDate(AppState.currentDate);
    AppState.data.lessons.daily[dateKey] = textarea.value;
    saveData();
    alert('Lessons saved successfully!');
}

// ==================== Weekly Planner ====================
function initWeeklyPlanner() {
    AppState.currentWeekStart = getWeekStart(new Date());

    const prevWeek = document.getElementById('prevWeek');
    const nextWeek = document.getElementById('nextWeek');
    const thisWeekBtn = document.getElementById('thisWeekBtn');
    const addWeeklyEvent = document.getElementById('addWeeklyEvent');
    const weeklyEventInput = document.getElementById('weeklyEventInput');
    const saveWeeklyLessons = document.getElementById('saveWeeklyLessons');

    prevWeek.addEventListener('click', () => {
        AppState.currentWeekStart.setDate(AppState.currentWeekStart.getDate() - 7);
        renderWeeklyPlanner();
    });

    nextWeek.addEventListener('click', () => {
        AppState.currentWeekStart.setDate(AppState.currentWeekStart.getDate() + 7);
        renderWeeklyPlanner();
    });

    thisWeekBtn.addEventListener('click', () => {
        AppState.currentWeekStart = getWeekStart(new Date());
        renderWeeklyPlanner();
    });

    addWeeklyEvent.addEventListener('click', () => addWeeklyEventHandler());
    weeklyEventInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addWeeklyEventHandler();
    });

    saveWeeklyLessons.addEventListener('click', saveWeeklyLessonsHandler);

    renderWeeklyPlanner();
}

function renderWeeklyPlanner() {
    const weekKey = getWeekKey(AppState.currentWeekStart);
    const weekEnd = new Date(AppState.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Update week display
    const weekDisplay = document.getElementById('weekDisplay');
    weekDisplay.textContent = `${AppState.currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Display holidays
    const holidaysInWeek = getHolidaysInRange(AppState.currentWeekStart, weekEnd);
    const holidayDisplay = document.getElementById('weeklyHoliday');
    if (holidaysInWeek.length > 0) {
        holidayDisplay.textContent = `🎉 ${holidaysInWeek.map(h => h.name).join(', ')}`;
        holidayDisplay.classList.add('visible');
    } else {
        holidayDisplay.classList.remove('visible');
    }

    // Render week grid
    renderWeekGrid();

    // Render weekly events
    renderWeeklyEvents(weekKey);

    // Render scheduled Eisenhower tasks for this week
    renderWeeklyEisenhowerTasks();

    // Load lessons
    const lessonsTextarea = document.getElementById('weeklyLessons');
    lessonsTextarea.value = AppState.data.lessons.weekly[weekKey] || '';
}

function renderWeeklyEisenhowerTasks() {
    const container = document.getElementById('weeklyEisenhowerTasks');
    container.innerHTML = '';

    const weekEnd = new Date(AppState.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const scheduledTasks = [];

    // Collect all scheduled Eisenhower tasks for this week
    const quadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
    quadrants.forEach(quadrant => {
        const tasks = AppState.data.eisenhower[quadrant] || [];
        tasks.forEach(task => {
            if (task.scheduledDate) {
                const taskDate = new Date(task.scheduledDate + 'T00:00:00');
                if (taskDate >= AppState.currentWeekStart && taskDate <= weekEnd) {
                    scheduledTasks.push({ ...task, quadrant });
                }
            }
        });
    });

    if (scheduledTasks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No scheduled tasks from Eisenhower Matrix for this week.</p>';
        return;
    }

    // Sort by date
    scheduledTasks.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    scheduledTasks.forEach(task => {
        const card = createScheduledTaskCard(task);
        container.appendChild(card);
    });
}

function renderWeekGrid() {
    const weeklyGrid = document.getElementById('weeklyGrid');
    weeklyGrid.innerHTML = '';

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = formatDate(new Date());

    for (let i = 0; i < 7; i++) {
        const date = new Date(AppState.currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateKey = formatDate(date);

        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        if (dateKey === today) {
            dayDiv.classList.add('today');
        }

        const header = document.createElement('div');
        header.className = 'week-day-header';

        const dayName = document.createElement('div');
        dayName.className = 'week-day-name';
        dayName.textContent = days[i];

        const dayDate = document.createElement('div');
        dayDate.className = 'week-day-date';
        dayDate.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        header.appendChild(dayName);
        header.appendChild(dayDate);

        const taskInput = document.createElement('div');
        taskInput.className = 'task-input-group';
        taskInput.style.flexWrap = 'wrap';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-input';
        input.placeholder = 'Add task...';
        input.style.flex = '1 1 100%';
        input.style.marginBottom = '4px';

        const quadrantSelect = document.createElement('select');
        quadrantSelect.className = 'task-quadrant-select';
        quadrantSelect.style.flex = '1';
        quadrantSelect.style.fontSize = '0.75rem';
        quadrantSelect.style.padding = '6px 8px';
        quadrantSelect.style.minWidth = '100px';
        quadrantSelect.innerHTML = `
            <option value="">No Priority</option>
            <option value="urgent-important">🔥 U&I</option>
            <option value="not-urgent-important">📅 NUI</option>
            <option value="urgent-not-important">⚡ UNI</option>
            <option value="not-urgent-not-important">🗑️ Low</option>
        `;

        const durationInput = document.createElement('input');
        durationInput.type = 'number';
        durationInput.className = 'task-duration-input';
        durationInput.placeholder = 'Hrs';
        durationInput.min = '0';
        durationInput.step = '0.5';
        durationInput.style.fontSize = '0.75rem';
        durationInput.style.padding = '6px 8px';
        durationInput.style.width = '60px';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-add';
        addBtn.textContent = '+';
        addBtn.style.padding = '6px 12px';
        addBtn.style.fontSize = '0.9rem';

        const addTaskToDay = () => {
            const taskText = input.value.trim();
            if (!taskText) return;

            const quadrant = quadrantSelect.value;
            const duration = parseFloat(durationInput.value) || 0;
            const taskId = Date.now();

            if (!AppState.data.daily[dateKey]) {
                AppState.data.daily[dateKey] = { timeSlots: {}, tasks: [] };
            }

            const newTask = {
                id: taskId,
                text: taskText,
                completed: false,
                duration: duration
            };

            // If a quadrant is selected, link to Eisenhower Matrix
            if (quadrant) {
                newTask.source = 'eisenhower';
                newTask.quadrant = quadrant;

                // Add to Eisenhower Matrix as well
                AppState.data.eisenhower[quadrant].push({
                    id: taskId,
                    text: taskText,
                    completed: false,
                    quadrant: quadrant,
                    duration: duration,
                    scheduledDate: dateKey,
                    createdAt: new Date().toISOString()
                });
            }

            AppState.data.daily[dateKey].tasks.push(newTask);

            input.value = '';
            quadrantSelect.value = '';
            durationInput.value = '';
            saveData();
            renderWeekGrid();

            // Refresh Eisenhower if a quadrant was selected
            if (quadrant) {
                renderEisenhowerMatrix();
            }
        };

        addBtn.addEventListener('click', addTaskToDay);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTaskToDay();
        });

        taskInput.appendChild(input);
        taskInput.appendChild(quadrantSelect);
        taskInput.appendChild(durationInput);
        taskInput.appendChild(addBtn);

        const taskList = document.createElement('ul');
        taskList.className = 'task-list';

        const tasks = AppState.data.daily[dateKey]?.tasks || [];
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.style.fontSize = '0.85rem';
            li.style.padding = '8px';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.gap = '8px';

            // Checkbox for completion
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed;
            checkbox.style.cursor = 'pointer';
            checkbox.addEventListener('change', () => {
                task.completed = checkbox.checked;

                // Sync to Eisenhower if applicable
                if (task.source === 'eisenhower' && task.quadrant) {
                    const eisenTask = AppState.data.eisenhower[task.quadrant]?.find(t => t.id === task.id);
                    if (eisenTask) {
                        eisenTask.completed = task.completed;
                    }
                }

                saveData();
                renderWeekGrid();
            });

            const contentContainer = document.createElement('div');
            contentContainer.style.flex = '1';
            contentContainer.style.display = 'flex';
            contentContainer.style.flexDirection = 'column';
            contentContainer.style.gap = '3px';

            const taskText = document.createElement('span');
            taskText.textContent = task.text;
            if (task.completed) {
                taskText.style.textDecoration = 'line-through';
                taskText.style.opacity = '0.6';
            }
            contentContainer.appendChild(taskText);

            // Show badges if from Eisenhower
            if (task.source === 'eisenhower' && task.quadrant) {
                const badgeContainer = document.createElement('div');
                badgeContainer.style.display = 'flex';
                badgeContainer.style.gap = '5px';

                const quadrantBadge = document.createElement('span');
                quadrantBadge.className = `task-badge badge-${task.quadrant}`;
                quadrantBadge.style.fontSize = '0.7rem';
                quadrantBadge.style.padding = '2px 6px';
                const quadrantLabels = {
                    'urgent-important': '🔥',
                    'not-urgent-important': '📅',
                    'urgent-not-important': '⚡',
                    'not-urgent-not-important': '🗑️'
                };
                quadrantBadge.textContent = quadrantLabels[task.quadrant];
                badgeContainer.appendChild(quadrantBadge);

                if (task.duration && task.duration > 0) {
                    const durationBadge = document.createElement('span');
                    durationBadge.className = 'task-duration';
                    durationBadge.style.fontSize = '0.7rem';
                    durationBadge.style.padding = '2px 6px';
                    durationBadge.textContent = `${task.duration}h`;
                    badgeContainer.appendChild(durationBadge);
                }

                contentContainer.appendChild(badgeContainer);
            }

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.style.fontSize = '1.2rem';
            deleteBtn.style.padding = '2px 8px';
            deleteBtn.style.minWidth = 'auto';
            deleteBtn.addEventListener('click', () => {
                tasks.splice(index, 1);

                // Sync to Eisenhower if applicable
                if (task.source === 'eisenhower' && task.quadrant) {
                    const eisenTask = AppState.data.eisenhower[task.quadrant]?.find(t => t.id === task.id);
                    if (eisenTask) {
                        eisenTask.scheduledDate = null;
                    }
                }

                saveData();
                renderWeekGrid();
            });

            li.appendChild(checkbox);
            li.appendChild(contentContainer);
            li.appendChild(deleteBtn);
            taskList.appendChild(li);
        });

        dayDiv.appendChild(header);
        dayDiv.appendChild(taskInput);
        dayDiv.appendChild(taskList);
        weeklyGrid.appendChild(dayDiv);
    }
}

function addWeeklyEventHandler() {
    const input = document.getElementById('weeklyEventInput');
    const eventText = input.value.trim();
    if (!eventText) return;

    const weekKey = getWeekKey(AppState.currentWeekStart);
    if (!AppState.data.events.weekly[weekKey]) {
        AppState.data.events.weekly[weekKey] = [];
    }

    AppState.data.events.weekly[weekKey].push({
        id: Date.now(),
        text: eventText,
        date: AppState.currentWeekStart.toISOString()
    });

    input.value = '';
    saveData();
    renderWeeklyEvents(weekKey);
}

function renderWeeklyEvents(weekKey) {
    const eventList = document.getElementById('weeklyEventList');
    eventList.innerHTML = '';

    const events = AppState.data.events.weekly[weekKey] || [];

    events.forEach(event => {
        const li = document.createElement('li');
        li.className = 'event-item';

        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = event.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            const index = events.indexOf(event);
            events.splice(index, 1);
            saveData();
            renderWeeklyEvents(weekKey);
        });

        li.appendChild(text);
        li.appendChild(deleteBtn);
        eventList.appendChild(li);
    });
}

function saveWeeklyLessonsHandler() {
    const textarea = document.getElementById('weeklyLessons');
    const weekKey = getWeekKey(AppState.currentWeekStart);
    AppState.data.lessons.weekly[weekKey] = textarea.value;
    saveData();
    alert('Lessons saved successfully!');
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
    const addMonthlyEvent = document.getElementById('addMonthlyEvent');
    const monthlyEventInput = document.getElementById('monthlyEventInput');
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
    for (let year = currentYear - 5; year <= currentYear + 5; year++) {
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

    addMonthlyEvent.addEventListener('click', () => addMonthlyEventHandler());
    monthlyEventInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addMonthlyEventHandler();
    });

    saveMonthlyLessons.addEventListener('click', saveMonthlyLessonsHandler);

    renderMonthlyPlanner();
}

function renderMonthlyPlanner() {
    const monthKey = getMonthKey(AppState.currentMonth, AppState.currentYear);

    // Display holidays
    const firstDay = new Date(AppState.currentYear, AppState.currentMonth, 1);
    const lastDay = new Date(AppState.currentYear, AppState.currentMonth + 1, 0);
    const holidaysInMonth = getHolidaysInRange(firstDay, lastDay);
    const holidayDisplay = document.getElementById('monthlyHoliday');
    if (holidaysInMonth.length > 0) {
        holidayDisplay.textContent = `🎉 ${holidaysInMonth.map(h => h.name).join(', ')}`;
        holidayDisplay.classList.add('visible');
    } else {
        holidayDisplay.classList.remove('visible');
    }

    // Render calendar
    renderCalendar();

    // Render scheduled Eisenhower tasks for this month
    renderMonthlyEisenhowerTasks();

    // Render monthly goals
    renderMonthlyGoals(monthKey);

    // Render monthly events
    renderMonthlyEvents(monthKey);

    // Load lessons
    const lessonsTextarea = document.getElementById('monthlyLessons');
    lessonsTextarea.value = AppState.data.lessons.monthly[monthKey] || '';
}

function renderMonthlyEisenhowerTasks() {
    const container = document.getElementById('monthlyEisenhowerTasks');
    container.innerHTML = '';

    const firstDay = new Date(AppState.currentYear, AppState.currentMonth, 1);
    const lastDay = new Date(AppState.currentYear, AppState.currentMonth + 1, 0);

    const scheduledTasks = [];

    // Collect all scheduled Eisenhower tasks for this month
    const quadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
    quadrants.forEach(quadrant => {
        const tasks = AppState.data.eisenhower[quadrant] || [];
        tasks.forEach(task => {
            if (task.scheduledDate) {
                const taskDate = new Date(task.scheduledDate + 'T00:00:00');
                if (taskDate >= firstDay && taskDate <= lastDay) {
                    scheduledTasks.push({ ...task, quadrant });
                }
            }
        });
    });

    if (scheduledTasks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No scheduled tasks from Eisenhower Matrix for this month.</p>';
        return;
    }

    // Sort by date
    scheduledTasks.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    scheduledTasks.forEach(task => {
        const card = createScheduledTaskCard(task);
        container.appendChild(card);
    });
}

function createScheduledTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'scheduled-task-card';

    const colors = {
        'urgent-important': '#ff6b6b',
        'not-urgent-important': '#4ecdc4',
        'urgent-not-important': '#ffe66d',
        'not-urgent-not-important': '#95e1d3'
    };
    card.style.borderLeftColor = colors[task.quadrant];

    const header = document.createElement('div');
    header.className = 'scheduled-task-header';

    const title = document.createElement('div');
    title.className = 'scheduled-task-title';
    title.textContent = task.text;
    if (task.completed) {
        title.style.textDecoration = 'line-through';
        title.style.opacity = '0.6';
    }

    const quadrantBadge = document.createElement('span');
    quadrantBadge.className = `task-badge badge-${task.quadrant}`;
    const quadrantLabels = {
        'urgent-important': '🔥 U&I',
        'not-urgent-important': '📅 Important',
        'urgent-not-important': '⚡ Urgent',
        'not-urgent-not-important': '🗑️ Low Priority'
    };
    quadrantBadge.textContent = quadrantLabels[task.quadrant];

    header.appendChild(title);
    header.appendChild(quadrantBadge);

    const meta = document.createElement('div');
    meta.className = 'scheduled-task-meta';

    const dateBadge = document.createElement('span');
    dateBadge.className = 'task-scheduled';
    const taskDate = new Date(task.scheduledDate + 'T00:00:00');
    dateBadge.textContent = `📅 ${taskDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    meta.appendChild(dateBadge);

    if (task.duration && task.duration > 0) {
        const durationBadge = document.createElement('span');
        durationBadge.className = 'task-duration';
        durationBadge.textContent = `⏱️ ${task.duration}h`;
        meta.appendChild(durationBadge);
    }

    card.appendChild(header);
    card.appendChild(meta);

    return card;
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

            tasks.slice(0, 3).forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'calendar-task';
                if (task.completed) {
                    taskDiv.classList.add('completed');
                }

                // Add quadrant indicator if present
                if (task.quadrant) {
                    const quadrantIcons = {
                        'urgent-important': '🔥',
                        'not-urgent-important': '📅',
                        'urgent-not-important': '⚡',
                        'not-urgent-not-important': '🗑️'
                    };
                    taskDiv.textContent = `${quadrantIcons[task.quadrant]} ${task.text}`;
                } else {
                    taskDiv.textContent = task.text;
                }

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

        day.addEventListener('click', () => {
            AppState.currentDate = date;
            document.getElementById('dailyDate').value = dateKey;
            document.querySelector('[data-tab="daily"]').click();
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

    goals.forEach(goal => {
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
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            const index = goals.indexOf(goal);
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

function addMonthlyEventHandler() {
    const input = document.getElementById('monthlyEventInput');
    const eventText = input.value.trim();
    if (!eventText) return;

    const monthKey = getMonthKey(AppState.currentMonth, AppState.currentYear);
    if (!AppState.data.events.monthly[monthKey]) {
        AppState.data.events.monthly[monthKey] = [];
    }

    AppState.data.events.monthly[monthKey].push({
        id: Date.now(),
        text: eventText,
        date: new Date(AppState.currentYear, AppState.currentMonth, 1).toISOString()
    });

    input.value = '';
    saveData();
    renderMonthlyEvents(monthKey);
}

function renderMonthlyEvents(monthKey) {
    const eventList = document.getElementById('monthlyEventList');
    eventList.innerHTML = '';

    const events = AppState.data.events.monthly[monthKey] || [];

    events.forEach(event => {
        const li = document.createElement('li');
        li.className = 'event-item';

        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = event.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            const index = events.indexOf(event);
            events.splice(index, 1);
            saveData();
            renderMonthlyEvents(monthKey);
        });

        li.appendChild(text);
        li.appendChild(deleteBtn);
        eventList.appendChild(li);
    });
}

function saveMonthlyLessonsHandler() {
    const textarea = document.getElementById('monthlyLessons');
    const monthKey = getMonthKey(AppState.currentMonth, AppState.currentYear);
    AppState.data.lessons.monthly[monthKey] = textarea.value;
    saveData();
    alert('Lessons saved successfully!');
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
                    AppState.data.daily[scheduledDate] = { timeSlots: {}, tasks: [] };
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

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'matrix-task-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => {
                task.completed = checkbox.checked;
                li.style.opacity = task.completed ? '0.6' : '1';
                li.style.textDecoration = task.completed ? 'line-through' : 'none';

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
            textContainer.style.flex = '1';
            textContainer.style.display = 'flex';
            textContainer.style.flexDirection = 'column';
            textContainer.style.gap = '5px';

            const text = document.createElement('span');
            text.className = 'task-text';
            text.textContent = task.text;

            const metaInfo = document.createElement('div');
            metaInfo.style.display = 'flex';
            metaInfo.style.gap = '8px';
            metaInfo.style.flexWrap = 'wrap';

            if (task.duration && task.duration > 0) {
                const durationBadge = document.createElement('span');
                durationBadge.className = 'task-duration';
                durationBadge.textContent = `⏱️ ${task.duration}h`;
                metaInfo.appendChild(durationBadge);
            }

            if (task.scheduledDate) {
                const scheduleBadge = document.createElement('span');
                scheduleBadge.className = 'task-scheduled';
                const schedDate = new Date(task.scheduledDate + 'T00:00:00');
                scheduleBadge.textContent = `📅 ${schedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                metaInfo.appendChild(scheduleBadge);
            }

            textContainer.appendChild(text);
            if (metaInfo.children.length > 0) {
                textContainer.appendChild(metaInfo);
            }

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-task-btn';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => {
                editEisenhowerTask(task, quadrant);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => {
                // Remove from eisenhower
                const index = tasks.indexOf(task);
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
                li.style.opacity = '0.6';
                li.style.textDecoration = 'line-through';
            }

            li.appendChild(checkbox);
            li.appendChild(textContainer);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
            taskList.appendChild(li);
        });
    });

    renderMatrixStats();
}

function editEisenhowerTask(task, quadrant) {
    const newText = prompt('Edit task name:', task.text);
    if (newText && newText.trim()) {
        task.text = newText.trim();
    }

    const newDuration = prompt('Edit duration (hours):', task.duration || 0);
    if (newDuration !== null) {
        const duration = parseFloat(newDuration) || 0;
        task.duration = duration;

        // Update in daily tasks
        if (task.scheduledDate && AppState.data.daily[task.scheduledDate]) {
            const dailyTask = AppState.data.daily[task.scheduledDate].tasks.find(t => t.id === task.id);
            if (dailyTask) {
                dailyTask.text = task.text;
                dailyTask.duration = duration;
            }
        }
    }

    const newDate = prompt('Edit scheduled date (YYYY-MM-DD):', task.scheduledDate || '');
    if (newDate !== null) {
        // Remove from old date
        if (task.scheduledDate && AppState.data.daily[task.scheduledDate]) {
            const dailyTasks = AppState.data.daily[task.scheduledDate].tasks;
            const index = dailyTasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
                dailyTasks.splice(index, 1);
            }
        }

        // Add to new date
        if (newDate.trim()) {
            task.scheduledDate = newDate.trim();
            if (!AppState.data.daily[task.scheduledDate]) {
                AppState.data.daily[task.scheduledDate] = { timeSlots: {}, tasks: [] };
            }

            AppState.data.daily[task.scheduledDate].tasks.push({
                id: task.id,
                text: task.text,
                completed: task.completed,
                source: 'eisenhower',
                quadrant: quadrant,
                duration: task.duration
            });
        } else {
            task.scheduledDate = null;
        }
    }

    saveData();
    renderEisenhowerMatrix();
}

function renderMatrixStats() {
    const statsContainer = document.getElementById('matrixStats');
    statsContainer.innerHTML = '';

    const quadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
    const quadrantNames = {
        'urgent-important': 'Urgent & Important',
        'not-urgent-important': 'Not Urgent & Important',
        'urgent-not-important': 'Urgent & Not Important',
        'not-urgent-not-important': 'Not Urgent & Not Important'
    };

    let totalHours = 0;
    const stats = {};

    quadrants.forEach(quadrant => {
        const tasks = AppState.data.eisenhower[quadrant] || [];
        const hours = tasks.reduce((sum, task) => sum + (task.duration || 0), 0);
        const count = tasks.length;
        const completed = tasks.filter(t => t.completed).length;

        stats[quadrant] = { hours, count, completed };
        totalHours += hours;
    });

    // Total hours card
    const totalCard = document.createElement('div');
    totalCard.className = 'stat-card';
    totalCard.innerHTML = `
        <div class="stat-label">Total Hours Planned</div>
        <div class="stat-value">${totalHours.toFixed(1)}h</div>
    `;
    statsContainer.appendChild(totalCard);

    // Quadrant cards
    quadrants.forEach(quadrant => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        const { hours, count, completed } = stats[quadrant];

        card.innerHTML = `
            <div class="stat-label">${quadrantNames[quadrant]}</div>
            <div class="stat-value">${hours.toFixed(1)}h</div>
            <div class="stat-label" style="margin-top: 10px;">${completed}/${count} tasks completed</div>
        `;

        // Set border color based on quadrant
        const colors = {
            'urgent-important': '#ff6b6b',
            'not-urgent-important': '#4ecdc4',
            'urgent-not-important': '#ffe66d',
            'not-urgent-not-important': '#95e1d3'
        };
        card.style.borderLeftColor = colors[quadrant];

        statsContainer.appendChild(card);
    });
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
    AppState.data.notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = `note-item ${note.id === AppState.selectedNote ? 'active' : ''}`;

        const noteItemTitle = document.createElement('div');
        noteItemTitle.className = 'note-item-title';
        noteItemTitle.textContent = note.title;

        const noteItemDate = document.createElement('div');
        noteItemDate.className = 'note-item-date';
        noteItemDate.textContent = new Date(note.createdAt).toLocaleDateString();

        noteItem.appendChild(noteItemTitle);
        noteItem.appendChild(noteItemDate);

        noteItem.addEventListener('click', () => {
            AppState.selectedNote = note.id;
            renderNotes();
        });

        notesList.appendChild(noteItem);
    });

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
                    <button class="btn btn-secondary delete-note-btn">Delete Note</button>
                </div>
            `;

            const textarea = noteEditor.querySelector('.note-editor-content');
            const saveBtn = noteEditor.querySelector('.save-note-btn');
            const deleteBtn = noteEditor.querySelector('.delete-note-btn');

            saveBtn.addEventListener('click', () => {
                note.content = textarea.value;
                note.updatedAt = new Date().toISOString();
                saveData();
                alert('Note saved successfully!');
                renderNotes();
            });

            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this note?')) {
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

// ==================== Insights & Events ====================
function initInsights() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            AppState.eventFilter = button.dataset.filter;
            renderInsights();
        });
    });

    renderInsights();
}

function renderInsights() {
    renderAllLessons();
    renderAllEvents();
}

function renderAllLessons() {
    const lessonsDisplay = document.getElementById('allLessons');
    lessonsDisplay.innerHTML = '';

    const allLessons = [];

    // Collect all lessons
    Object.entries(AppState.data.lessons.daily).forEach(([date, content]) => {
        if (content.trim()) {
            allLessons.push({ date: new Date(date), content, type: 'Daily' });
        }
    });

    Object.entries(AppState.data.lessons.weekly).forEach(([date, content]) => {
        if (content.trim()) {
            allLessons.push({ date: new Date(date), content, type: 'Weekly' });
        }
    });

    Object.entries(AppState.data.lessons.monthly).forEach(([date, content]) => {
        if (content.trim()) {
            allLessons.push({ date: new Date(date + '-01'), content, type: 'Monthly' });
        }
    });

    // Sort by date (newest first)
    allLessons.sort((a, b) => b.date - a.date);

    if (allLessons.length === 0) {
        lessonsDisplay.innerHTML = '<p class="empty-state">No lessons learned yet. Start documenting your insights!</p>';
        return;
    }

    allLessons.forEach(lesson => {
        const entry = document.createElement('div');
        entry.className = 'lesson-entry';

        const date = document.createElement('div');
        date.className = 'lesson-date';
        date.textContent = `${lesson.type} - ${lesson.date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`;

        const content = document.createElement('div');
        content.className = 'lesson-content';
        content.textContent = lesson.content;

        entry.appendChild(date);
        entry.appendChild(content);
        lessonsDisplay.appendChild(entry);
    });
}

function renderAllEvents() {
    const eventsDisplay = document.getElementById('allEvents');
    eventsDisplay.innerHTML = '';

    const allEvents = [];

    // Collect all events based on filter
    if (AppState.eventFilter === 'all' || AppState.eventFilter === 'daily') {
        Object.entries(AppState.data.events.daily).forEach(([date, events]) => {
            events.forEach(event => {
                allEvents.push({ ...event, type: 'Daily', date: new Date(event.date) });
            });
        });
    }

    if (AppState.eventFilter === 'all' || AppState.eventFilter === 'weekly') {
        Object.entries(AppState.data.events.weekly).forEach(([date, events]) => {
            events.forEach(event => {
                allEvents.push({ ...event, type: 'Weekly', date: new Date(event.date) });
            });
        });
    }

    if (AppState.eventFilter === 'all' || AppState.eventFilter === 'monthly') {
        Object.entries(AppState.data.events.monthly).forEach(([date, events]) => {
            events.forEach(event => {
                allEvents.push({ ...event, type: 'Monthly', date: new Date(event.date) });
            });
        });
    }

    // Sort by date (newest first)
    allEvents.sort((a, b) => b.date - a.date);

    if (allEvents.length === 0) {
        eventsDisplay.innerHTML = '<p class="empty-state">No important events recorded yet.</p>';
        return;
    }

    allEvents.forEach(event => {
        const entry = document.createElement('div');
        entry.className = 'event-entry';

        const date = document.createElement('div');
        date.className = 'event-date';
        date.textContent = `${event.type} - ${event.date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`;

        const content = document.createElement('div');
        content.className = 'event-content';
        content.textContent = event.text;

        entry.appendChild(date);
        entry.appendChild(content);
        eventsDisplay.appendChild(entry);
    });
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
        link.download = `planner-data-${formatDate(new Date())}.json`;
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
                if (confirm('This will replace all current data. Are you sure?')) {
                    AppState.data = importedData;
                    saveData();
                    location.reload();
                }
            } catch (error) {
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    });
}

// ==================== Initialize App ====================
// ==================== Sidebar Toggle ====================
function initSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTabs();
    initNewWeeklyPlanner();
    initMonthlyPlanner();
    initEisenhowerMatrix();
    initNotes();
    initInsights();
    initImportExport();
    initSidebarToggle();
});
// New Weekly Planner Code to Replace Old Implementation
// Insert this after line 147 in app.js, replacing initDailyPlanner and initWeeklyPlanner

const TimerState = {
    taskName: '',
    startTime: null,
    elapsed: 0,
    running: false,
    interval: null,
    taskDuration: 0
};

function initNewWeeklyPlanner() {
    if (!AppState.currentWeekStart) {
        AppState.currentWeekStart = getWeekStart(new Date());
    }

    const prevWeek = document.getElementById('prevWeek');
    const nextWeek = document.getElementById('nextWeek');
    const thisWeekBtn = document.getElementById('thisWeekBtn');

    if (prevWeek) {
        prevWeek.addEventListener('click', () => {
            AppState.currentWeekStart.setDate(AppState.currentWeekStart.getDate() - 7);
            renderNewWeeklyView();
        });
    }

    if (nextWeek) {
        nextWeek.addEventListener('click', () => {
            AppState.currentWeekStart.setDate(AppState.currentWeekStart.getDate() + 7);
            renderNewWeeklyView();
        });
    }

    if (thisWeekBtn) {
        thisWeekBtn.addEventListener('click', () => {
            AppState.currentWeekStart = getWeekStart(new Date());
            renderNewWeeklyView();
        });
    }

    initTaskModal();
    initTimer();
    renderNewWeeklyView();
}

function renderNewWeeklyView() {
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

        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        if (dateKey === today) {
            dayCard.classList.add('today');
        }

        const header = document.createElement('div');
        header.className = 'day-card-header';

        const dayInfo = document.createElement('div');
        dayInfo.style.display = 'flex';
        dayInfo.style.alignItems = 'center';

        const dayNameEl = document.createElement('span');
        dayNameEl.className = 'day-name';
        dayNameEl.textContent = dayNames[i];

        const dayDateEl = document.createElement('span');
        dayDateEl.className = 'day-date';
        dayDateEl.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        dayInfo.appendChild(dayNameEl);
        dayInfo.appendChild(dayDateEl);

        const tasks = AppState.data.daily[dateKey]?.tasks || [];
        const taskCount = document.createElement('span');
        taskCount.className = 'day-task-count';
        taskCount.textContent = tasks.length === 0 ? 'No tasks' : tasks.length + ' task' + (tasks.length > 1 ? 's' : '');

        header.appendChild(dayInfo);
        header.appendChild(taskCount);

        const tasksList = document.createElement('div');
        tasksList.className = 'day-tasks-list';

        if (tasks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'day-empty';
            empty.textContent = 'No tasks planned';
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
        task.completed = checkbox.checked;
        if (task.source === 'eisenhower' && task.quadrant) {
            const eisenTask = AppState.data.eisenhower[task.quadrant]?.find(t => t.id === task.id);
            if (eisenTask) {
                eisenTask.completed = task.completed;
            }
        }
        saveData();
        renderNewWeeklyView();
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
        startBtn.textContent = '▶ Start';
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startTaskTimer(task);
        });
        taskItem.appendChild(startBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete-btn';
    deleteBtn.innerHTML = '🗑';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tasks.splice(index, 1);
        if (task.source === 'eisenhower' && task.quadrant) {
            const eisenTasks = AppState.data.eisenhower[task.quadrant];
            const eisenIndex = eisenTasks.findIndex(t => t.id === task.id);
            if (eisenIndex !== -1) {
                eisenTasks.splice(eisenIndex, 1);
            }
        }
        saveData();
        renderNewWeeklyView();
    });

    taskItem.appendChild(deleteBtn);
    return taskItem;
}

function initTaskModal() {
    const modal = document.getElementById('taskModal');
    const floatingBtn = document.getElementById('floatingAddBtn');
    const closeModal = document.getElementById('closeModal');
    const cancelModal = document.getElementById('cancelModal');
    const saveTask = document.getElementById('saveTask');
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

    saveTask.addEventListener('click', () => {
        const taskName = document.getElementById('modalTaskName').value.trim();
        const dateKey = modalTaskDay.value;
        const priority = document.getElementById('modalTaskPriority').value;
        const duration = parseFloat(document.getElementById('modalTaskDuration').value) || 0;

        if (!taskName) {
            alert('Please enter a task name');
            return;
        }

        const taskId = Date.now();

        if (!AppState.data.daily[dateKey]) {
            AppState.data.daily[dateKey] = { timeSlots: {}, tasks: [] };
        }

        const newTask = {
            id: taskId,
            text: taskName,
            completed: false,
            duration: duration
        };

        if (priority) {
            newTask.source = 'eisenhower';
            newTask.quadrant = priority;

            AppState.data.eisenhower[priority].push({
                id: taskId,
                text: taskName,
                completed: false,
                quadrant: priority,
                duration: duration,
                scheduledDate: dateKey,
                createdAt: new Date().toISOString()
            });
        }

        AppState.data.daily[dateKey].tasks.push(newTask);
        saveData();
        renderNewWeeklyView();
        closeModalFn();
    });

    document.getElementById('modalTaskName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveTask.click();
        }
    });
}

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
