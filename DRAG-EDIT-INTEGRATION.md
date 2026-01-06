# Drag-and-Drop and Task Edit Integration Guide

This guide shows how to integrate the new drag-and-drop and task editing features into the High-Performance Planner.

## Features Added

### 1. Drag-and-Drop
- **Drag tasks between days** in the weekly view
- **Drag tasks between quadrants** in the Eisenhower Matrix
- **Drag tasks onto calendar days** in the monthly view
- **Visual feedback** during drag operations
- **Mobile and touch device support**

### 2. Task Editing
- **Double-click to edit** any task
- **Edit button** on hover for each task
- **Full edit modal** with validation
- **Edit task properties**:
  - Task description
  - Duration
  - Priority/quadrant
  - Scheduled date
  - Completion status
- **Delete tasks** from edit modal

## Files Created

1. **`js/services/drag-drop-service.js`** (290 lines)
   - Drag-and-drop functionality
   - Visual feedback management
   - Task moving logic
   - State synchronization

2. **`js/services/task-edit-service.js`** (380 lines)
   - Task editing modal
   - Form validation
   - Edit/delete operations
   - Double-click editing

3. **`styles-drag-edit.css`** (450+ lines)
   - Drag visual feedback
   - Drop zone styling
   - Edit button styles
   - Mobile/touch support
   - Accessibility styles

## Integration Steps

### Step 1: Import Stylesheets

Add to your HTML `<head>`:

```html
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="styles-additions.css">
<link rel="stylesheet" href="styles-drag-edit.css">
```

### Step 2: Import Services

In your main app JavaScript file:

```javascript
import DragDropService from './js/services/drag-drop-service.js';
import TaskEditService from './js/services/task-edit-service.js';
import StateManager from './js/core/state-manager.js';
```

### Step 3: Initialize Services

```javascript
// Initialize services
const stateManager = new StateManager(initialState);
const dragDropService = new DragDropService();
const taskEditService = new TaskEditService();

// Initialize edit modal
taskEditService.initializeEditModal();
```

### Step 4: Make Tasks Draggable and Editable

When rendering tasks, add drag and edit functionality:

```javascript
function createTaskElement(task, dateKey) {
    const taskItem = document.createElement('div');
    taskItem.className = 'day-task-item';

    // Add drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.setAttribute('aria-label', 'Drag to move task');
    taskItem.appendChild(dragHandle);

    // Task content
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;

    const taskText = document.createElement('span');
    taskText.className = 'task-text';
    taskText.textContent = task.text;

    taskItem.appendChild(checkbox);
    taskItem.appendChild(taskText);

    // Add edit button
    const editBtn = taskEditService.addEditButton(
        taskItem,
        task,
        dateKey,
        (updatedTask) => handleTaskUpdate(updatedTask, dateKey)
    );
    taskItem.appendChild(editBtn);

    // Make draggable
    dragDropService.makeDraggable(
        taskItem,
        task,
        dateKey,
        task.quadrant
    );

    // Make double-click editable
    taskEditService.makeDoubleClickEditable(
        taskItem,
        task,
        dateKey,
        (updatedTask) => handleTaskUpdate(updatedTask, dateKey)
    );

    return taskItem;
}
```

### Step 5: Make Containers Drop Zones

```javascript
function setupDropZones() {
    // Weekly view - each day is a drop zone
    document.querySelectorAll('.day-card').forEach(dayCard => {
        const dateKey = dayCard.getAttribute('data-date');
        const tasksList = dayCard.querySelector('.day-tasks-list');

        dragDropService.makeDropZone(
            tasksList,
            dateKey,
            null, // No quadrant for daily tasks
            (dropData) => handleTaskDrop(dropData)
        );
    });

    // Eisenhower Matrix - each quadrant is a drop zone
    document.querySelectorAll('.matrix-task-list').forEach(list => {
        const quadrant = list.getAttribute('data-quadrant');

        dragDropService.makeDropZone(
            list,
            null, // No specific date for matrix
            quadrant,
            (dropData) => handleTaskDrop(dropData)
        );
    });

    // Monthly view - each calendar day is a drop zone
    document.querySelectorAll('.calendar-day').forEach(day => {
        const dateKey = day.getAttribute('data-date');

        dragDropService.makeDropZone(
            day,
            dateKey,
            null,
            (dropData) => handleTaskDrop(dropData)
        );
    });
}
```

### Step 6: Handle Task Updates

```javascript
function handleTaskUpdate(updatedTask, originalDateKey) {
    if (!updatedTask) {
        // Task was deleted
        deleteTaskFromState(originalDateKey, updatedTask);
    } else {
        // Task was updated
        updateTaskInState(originalDateKey, updatedTask);
    }

    // Re-render affected views
    renderWeeklyView();
    renderEisenhowerMatrix();
    renderMonthlyView();
}

function handleTaskDrop(dropData) {
    // Move task using drag-drop service
    const movedTask = dragDropService.moveTask(dropData, stateManager);

    // Show toast notification
    showToast(`Task moved to ${formatDate(dropData.targetDate)}`, 'success');

    // Re-render affected views
    renderWeeklyView();
    renderEisenhowerMatrix();
    renderMonthlyView();
}
```

## Usage Examples

### Example 1: Weekly View with Drag and Edit

```javascript
function renderWeeklyView() {
    const container = document.getElementById('weekDaysContainer');
    container.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateKey = formatDate(date);

        const dayCard = document.createElement('div');
        dayCard.className = 'day-card drop-zone';
        dayCard.setAttribute('data-date', dateKey);

        // ... add day header ...

        const tasksList = document.createElement('div');
        tasksList.className = 'day-tasks-list';

        const tasks = getTasks ForDate(dateKey);
        tasks.forEach(task => {
            const taskElement = createTaskElement(task, dateKey);
            tasksList.appendChild(taskElement);
        });

        dayCard.appendChild(tasksList);
        container.appendChild(dayCard);

        // Make drop zone
        dragDropService.makeDropZone(
            tasksList,
            dateKey,
            null,
            handleTaskDrop
        );
    }
}
```

### Example 2: Eisenhower Matrix with Drag and Edit

```javascript
function renderEisenhowerMatrix() {
    const quadrants = [
        'urgent-important',
        'not-urgent-important',
        'urgent-not-important',
        'not-urgent-not-important'
    ];

    quadrants.forEach(quadrant => {
        const taskList = document.querySelector(`[data-quadrant="${quadrant}"]`);
        taskList.innerHTML = '';

        const tasks = getTasksForQuadrant(quadrant);
        tasks.forEach(task => {
            const taskElement = createTaskElement(task, task.scheduledDate);
            taskList.appendChild(taskElement);
        });

        // Make drop zone
        dragDropService.makeDropZone(
            taskList,
            null,
            quadrant,
            handleTaskDrop
        );
    });
}
```

### Example 3: Programmatic Task Edit

```javascript
// Open edit modal programmatically
function editTask(taskId, dateKey) {
    const task = findTaskById(taskId);

    taskEditService.openEditModal(
        task,
        dateKey,
        async (updatedTask) => {
            if (!updatedTask) {
                // Task deleted
                await deleteTask(taskId);
            } else {
                // Task updated
                await updateTask(taskId, updatedTask);
            }
        }
    );
}

// Example: Edit task on button click
document.getElementById('editTaskBtn').addEventListener('click', () => {
    editTask('task-123', '2025-01-15');
});
```

## Keyboard Shortcuts

The edit modal supports these keyboard shortcuts:

- **Esc** - Close modal without saving
- **Ctrl+Enter** (or Cmd+Enter) - Save changes
- **Tab** - Navigate between fields
- **Space** - Toggle completion checkbox

## Mobile Support

Both features work on mobile devices:

### Drag-and-Drop on Mobile
- Touch and hold to start dragging
- Drag to desired location
- Drop to place task
- Visual feedback during drag

### Task Editing on Mobile
- Tap edit button (always visible on mobile)
- Or double-tap task to edit
- Larger touch targets (44x44px minimum)

## Accessibility Features

### Drag-and-Drop Accessibility
- `aria-grabbed` attribute when dragging
- `aria-dropeffect` on drop zones
- Keyboard alternative (use edit modal to change date)
- Screen reader announcements

### Edit Modal Accessibility
- Proper ARIA labels
- Focus management
- Keyboard navigation
- Error announcements
- Form validation

## Best Practices

### 1. Always Validate
```javascript
// Validate before saving
const validation = Validators.taskText(taskText);
if (!validation.valid) {
    showToast(validation.error, 'error');
    return;
}
```

### 2. Provide Feedback
```javascript
// Show toast after drag
handleTaskDrop(dropData) {
    dragDropService.moveTask(dropData, stateManager);
    showToast('Task moved successfully', 'success');
}
```

### 3. Clean Up Drop Zones
```javascript
// Clean up when changing views
function switchTab(newTab) {
    dragDropService.cleanup();
    // ... render new view ...
    setupDropZones();
}
```

### 4. Handle Errors Gracefully
```javascript
async function handleTaskUpdate(updatedTask, dateKey) {
    try {
        await updateTaskInState(updatedTask, dateKey);
        showToast('Task updated', 'success');
    } catch (error) {
        console.error('Update failed:', error);
        showToast('Failed to update task', 'error');
        // Revert changes or reload
    }
}
```

## Troubleshooting

### Issue: Drag not working
**Solution**: Ensure elements have `draggable="true"` attribute

### Issue: Drop zones not responding
**Solution**: Call `dragDropService.makeDropZone()` after rendering

### Issue: Edit modal not showing
**Solution**: Call `taskEditService.initializeEditModal()` on app init

### Issue: Tasks not updating
**Solution**: Check that `onSave` callback is properly updating state

### Issue: Validation errors not showing
**Solution**: Ensure error elements exist in form

## Performance Tips

1. **Limit Re-renders**: Only re-render affected views
2. **Debounce Saves**: Use debounced save from StateManager
3. **Cache Elements**: Store references to frequently accessed elements
4. **Cleanup**: Always cleanup drop zones when unmounting

## Example: Complete Integration

```javascript
// app-with-drag-edit.js
import StateManager from './js/core/state-manager.js';
import DragDropService from './js/services/drag-drop-service.js';
import TaskEditService from './js/services/task-edit-service.js';
import { showToast } from './js/utils/helpers.js';

class PlannerApp {
    constructor() {
        this.stateManager = new StateManager(this.getInitialState());
        this.dragDropService = new DragDropService();
        this.taskEditService = new TaskEditService();

        this.init();
    }

    init() {
        // Initialize edit modal
        this.taskEditService.initializeEditModal();

        // Subscribe to state changes
        this.stateManager.subscribe(() => this.render());

        // Load data
        this.stateManager.loadState();

        // Initial render
        this.render();
    }

    render() {
        this.renderWeeklyView();
        this.renderEisenhowerMatrix();
        this.renderMonthlyView();
        this.setupDropZones();
    }

    renderWeeklyView() {
        // Implementation from Example 1
    }

    renderEisenhowerMatrix() {
        // Implementation from Example 2
    }

    setupDropZones() {
        // Implementation from Step 5
    }

    handleTaskUpdate(updatedTask, dateKey) {
        // Implementation from Step 6
    }

    handleTaskDrop(dropData) {
        // Implementation from Step 6
    }

    createTaskElement(task, dateKey) {
        // Implementation from Step 4
    }

    getInitialState() {
        return {
            daily: {},
            eisenhower: {
                'urgent-important': [],
                'not-urgent-important': [],
                'urgent-not-important': [],
                'not-urgent-not-important': []
            },
            notes: []
        };
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new PlannerApp();
});
```

## Testing

### Manual Testing Checklist

- [ ] Drag task between days in weekly view
- [ ] Drag task between quadrants in Eisenhower Matrix
- [ ] Drag task onto calendar day in monthly view
- [ ] Double-click task to edit
- [ ] Click edit button to edit
- [ ] Edit task description
- [ ] Edit task duration
- [ ] Edit task priority
- [ ] Edit task date
- [ ] Toggle task completion
- [ ] Delete task from edit modal
- [ ] Cancel edit without saving
- [ ] Validate required fields
- [ ] Test on mobile device
- [ ] Test keyboard navigation
- [ ] Test with screen reader

### Automated Testing

```javascript
// Example Jest test
import DragDropService from './drag-drop-service.js';

describe('DragDropService', () => {
    let service;

    beforeEach(() => {
        service = new DragDropService();
    });

    test('should initialize with null state', () => {
        expect(service.draggedTask).toBeNull();
        expect(service.sourceDate).toBeNull();
    });

    test('should move task between dates', () => {
        const task = { id: '1', text: 'Test' };
        const dropData = {
            task,
            sourceDate: '2025-01-01',
            targetDate: '2025-01-02'
        };

        // Test implementation
    });
});
```

## Browser Compatibility

- ✅ Chrome 90+ (Full support)
- ✅ Firefox 88+ (Full support)
- ✅ Safari 14+ (Full support)
- ✅ Edge 90+ (Full support)
- ✅ Mobile browsers (Touch support)

## License

MIT License - Same as main project
