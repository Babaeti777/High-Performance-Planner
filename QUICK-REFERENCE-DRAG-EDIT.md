# Quick Reference: Drag-and-Drop & Task Editing

## User Guide

### How to Edit Tasks

**Method 1: Double-Click**
1. Double-click any task
2. Edit modal opens
3. Make changes
4. Click "Save Changes"

**Method 2: Edit Button**
1. Hover over a task
2. Click the ✏️ edit button
3. Edit modal opens
4. Make changes
5. Click "Save Changes"

**In the Edit Modal:**
- Edit task description (text area)
- Change duration (0-24 hours)
- Change priority (Do First, Schedule, Delegate, Eliminate)
- Change scheduled date
- Toggle completion status
- Delete the task

**Keyboard Shortcuts:**
- `Esc` - Close without saving
- `Ctrl+Enter` - Save changes
- `Tab` - Navigate fields

### How to Drag Tasks

**Between Days (Weekly View):**
1. Click and hold a task
2. Drag to another day
3. Drop the task
4. Task moves to new day

**Between Quadrants (Eisenhower Matrix):**
1. Click and hold a task
2. Drag to another quadrant
3. Drop the task
4. Task changes priority

**To Calendar (Monthly View):**
1. Click and hold a task
2. Drag to a calendar day
3. Drop the task
4. Task scheduled for that day

**Visual Feedback:**
- Task becomes semi-transparent while dragging
- Drop zones highlight in blue
- Line indicator shows drop position

**On Mobile:**
- Touch and hold task
- Drag to destination
- Release to drop

## Developer Quick Start

### 1. Import Services

```javascript
import DragDropService from './js/services/drag-drop-service.js';
import TaskEditService from './js/services/task-edit-service.js';
```

### 2. Initialize

```javascript
const dragDrop = new DragDropService();
const taskEdit = new TaskEditService();
taskEdit.initializeEditModal();
```

### 3. Make Task Draggable & Editable

```javascript
// When creating task element:
const taskEl = document.createElement('div');

// Add edit capability
const editBtn = taskEdit.addEditButton(taskEl, task, dateKey, onSave);
taskEdit.makeDoubleClickEditable(taskEl, task, dateKey, onSave);

// Add drag capability
dragDrop.makeDraggable(taskEl, task, dateKey, quadrant);
```

### 4. Create Drop Zone

```javascript
const dropZone = document.querySelector('.task-list');

dragDrop.makeDropZone(
    dropZone,
    targetDate,
    targetQuadrant,
    (dropData) => {
        // Handle drop
        dragDrop.moveTask(dropData, stateManager);
    }
);
```

### 5. Handle Updates

```javascript
function onSave(updatedTask, dateKey) {
    if (!updatedTask) {
        // Task deleted
        deleteTask(task.id);
    } else {
        // Task updated
        updateTask(updatedTask);
    }
    rerender();
}
```

## API Reference

### DragDropService

```javascript
// Make element draggable
makeDraggable(element, task, sourceDate, sourceQuadrant)

// Make element a drop zone
makeDropZone(element, targetDate, targetQuadrant, onDrop)

// Move task (updates state)
moveTask(dropData, stateManager)

// Clean up drop zones
cleanup()
```

### TaskEditService

```javascript
// Initialize edit modal
initializeEditModal()

// Open edit modal
openEditModal(task, dateKey, onSave)

// Close edit modal
closeEditModal()

// Add edit button to task
addEditButton(taskElement, task, dateKey, onSave)

// Enable double-click editing
makeDoubleClickEditable(taskElement, task, dateKey, onSave)
```

## CSS Classes

### Drag-and-Drop

```css
[draggable="true"]     /* Draggable element */
.dragging              /* Element being dragged */
.drop-zone             /* Drop zone */
.drag-over             /* Drop zone with drag over */
.drop-before           /* Drop indicator (top) */
.drop-after            /* Drop indicator (bottom) */
.drag-handle           /* Drag handle icon */
```

### Task Editing

```css
.task-edit-btn         /* Edit button */
.validation-error      /* Validation error text */
.invalid               /* Invalid input */
.checkbox-label        /* Checkbox with label */
```

## Data Structure

### Task Object

```javascript
{
    id: "unique-id",
    text: "Task description",
    completed: false,
    duration: 2.5,              // hours
    quadrant: "urgent-important", // or null
    scheduledDate: "2025-01-15",  // YYYY-MM-DD
    source: "eisenhower",         // or null
    createdAt: "ISO timestamp",
    updatedAt: "ISO timestamp",   // when edited
    movedAt: "ISO timestamp"      // when dragged
}
```

### Drop Data

```javascript
{
    task: {...},              // Task object
    sourceDate: "2025-01-15", // Source date
    sourceQuadrant: "urgent-important", // Source quadrant
    targetDate: "2025-01-16", // Target date
    targetQuadrant: "not-urgent-important" // Target quadrant
}
```

## Common Patterns

### Pattern 1: Render with Drag & Edit

```javascript
function renderTasks(tasks, dateKey) {
    const container = document.querySelector('.task-list');
    container.innerHTML = '';

    tasks.forEach(task => {
        const el = createTaskElement(task, dateKey);

        // Add edit
        taskEdit.makeDoubleClickEditable(el, task, dateKey, handleUpdate);
        el.appendChild(taskEdit.addEditButton(el, task, dateKey, handleUpdate));

        // Add drag
        dragDrop.makeDraggable(el, task, dateKey, task.quadrant);

        container.appendChild(el);
    });

    // Make container a drop zone
    dragDrop.makeDropZone(container, dateKey, null, handleDrop);
}
```

### Pattern 2: Handle All Updates

```javascript
function handleUpdate(updatedTask, originalDate) {
    if (!updatedTask) {
        // Delete
        stateManager.setState({
            [`daily.${originalDate}.tasks`]:
                state.daily[originalDate].tasks.filter(t => t.id !== task.id)
        });
    } else {
        // Update
        const tasks = state.daily[originalDate].tasks;
        const index = tasks.findIndex(t => t.id === updatedTask.id);
        tasks[index] = updatedTask;

        stateManager.setState({
            [`daily.${originalDate}.tasks`]: tasks
        });
    }
}
```

### Pattern 3: Drag with Validation

```javascript
function handleDrop(dropData) {
    // Validate drop
    if (!canDropHere(dropData)) {
        showToast('Cannot drop task here', 'error');
        return;
    }

    // Move task
    const moved = dragDrop.moveTask(dropData, stateManager);

    // Show feedback
    showToast(`Moved to ${formatDate(dropData.targetDate)}`, 'success');

    // Re-render
    renderAll();
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Drag not working | Add `draggable="true"` attribute |
| Drop zones not working | Call `makeDropZone()` after render |
| Edit modal not showing | Call `initializeEditModal()` first |
| Changes not saving | Check `onSave` callback |
| Validation not working | Import `Validators` module |
| Mobile drag issues | Ensure touch events enabled |

## Performance Tips

1. **Batch Updates**: Update state once, not per task
2. **Debounce**: Use `stateManager`'s debounced save
3. **Cleanup**: Call `cleanup()` before re-render
4. **Cache**: Store frequently used elements
5. **Lazy Load**: Don't render hidden views

## Examples

### Example 1: Simple Integration

```javascript
// Minimal working example
import DragDropService from './drag-drop-service.js';
import TaskEditService from './task-edit-service.js';

const dragDrop = new DragDropService();
const taskEdit = new TaskEditService();
taskEdit.initializeEditModal();

function renderTask(task, date) {
    const div = document.createElement('div');
    div.textContent = task.text;

    taskEdit.makeDoubleClickEditable(div, task, date, save);
    dragDrop.makeDraggable(div, task, date);

    return div;
}

function save(updated) {
    console.log('Saved:', updated);
}
```

### Example 2: With State Manager

```javascript
import StateManager from './state-manager.js';
import DragDropService from './drag-drop-service.js';

const state = new StateManager({daily: {}});
const dragDrop = new DragDropService();

function handleDrop(dropData) {
    dragDrop.moveTask(dropData, state);
    render();
}

state.subscribe(() => render());
```

### Example 3: Full Featured

```javascript
class TaskManager {
    constructor() {
        this.state = new StateManager({daily: {}});
        this.dragDrop = new DragDropService();
        this.taskEdit = new TaskEditService();
        this.taskEdit.initializeEditModal();
    }

    render() {
        const tasks = this.state.getState().daily;
        Object.entries(tasks).forEach(([date, data]) => {
            this.renderDay(date, data.tasks);
        });
    }

    renderDay(date, tasks) {
        const container = document.querySelector(`[data-date="${date}"]`);
        container.innerHTML = '';

        tasks.forEach(task => {
            const el = this.createTaskElement(task, date);
            container.appendChild(el);
        });

        this.dragDrop.makeDropZone(
            container,
            date,
            null,
            (d) => this.handleDrop(d)
        );
    }

    createTaskElement(task, date) {
        const el = document.createElement('div');
        el.textContent = task.text;

        this.taskEdit.makeDoubleClickEditable(
            el, task, date,
            (u) => this.handleUpdate(u, date)
        );

        this.dragDrop.makeDraggable(el, task, date);

        return el;
    }

    handleUpdate(updated, date) {
        // Handle update logic
    }

    handleDrop(dropData) {
        this.dragDrop.moveTask(dropData, this.state);
    }
}

const app = new TaskManager();
app.render();
```

## Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| Double-click task | Open edit modal |
| `Esc` in modal | Close without saving |
| `Ctrl+Enter` in modal | Save changes |
| `Tab` in modal | Navigate fields |
| `Space` on checkbox | Toggle completion |

## Mobile Gestures

| Gesture | Action |
|---------|--------|
| Tap edit button | Open edit modal |
| Double-tap task | Open edit modal |
| Touch and hold | Start dragging |
| Drag | Move task |
| Release | Drop task |

## Browser Support

| Browser | Drag & Drop | Task Edit | Notes |
|---------|------------|-----------|-------|
| Chrome 90+ | ✅ | ✅ | Full support |
| Firefox 88+ | ✅ | ✅ | Full support |
| Safari 14+ | ✅ | ✅ | Full support |
| Edge 90+ | ✅ | ✅ | Full support |
| Mobile Chrome | ✅ | ✅ | Touch support |
| Mobile Safari | ✅ | ✅ | Touch support |

## Additional Resources

- Full integration guide: `DRAG-EDIT-INTEGRATION.md`
- Service documentation: See JSDoc in source files
- CSS reference: `styles-drag-edit.css`
- Main improvements: `README-IMPROVEMENTS.md`

## Support

For issues:
1. Check browser console
2. Verify all CSS files loaded
3. Ensure services initialized
4. Check state manager integration
5. Review integration guide

## Version

- Drag & Drop Service: v1.0.0
- Task Edit Service: v1.0.0
- Compatible with: High-Performance Planner v2.0+
