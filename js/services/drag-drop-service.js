/**
 * Drag and Drop Service
 * Handles drag-and-drop functionality for tasks across different views
 */

class DragDropService {
    constructor() {
        this.draggedTask = null;
        this.draggedElement = null;
        this.sourceDate = null;
        this.sourceQuadrant = null;
        this.dropZones = [];
    }

    /**
     * Initialize drag-and-drop for an element
     * @param {HTMLElement} element - Element to make draggable
     * @param {Object} task - Task data
     * @param {string} sourceDate - Source date key
     * @param {string} sourceQuadrant - Source quadrant (optional)
     */
    makeDraggable(element, task, sourceDate, sourceQuadrant = null) {
        element.draggable = true;
        element.setAttribute('data-task-id', task.id);

        element.addEventListener('dragstart', (e) => {
            this.handleDragStart(e, task, sourceDate, sourceQuadrant);
        });

        element.addEventListener('dragend', (e) => {
            this.handleDragEnd(e);
        });
    }

    /**
     * Initialize drop zone
     * @param {HTMLElement} element - Drop zone element
     * @param {string} targetDate - Target date key
     * @param {string} targetQuadrant - Target quadrant (optional)
     * @param {Function} onDrop - Callback when task is dropped
     */
    makeDropZone(element, targetDate, targetQuadrant, onDrop) {
        element.classList.add('drop-zone');
        element.setAttribute('data-drop-date', targetDate);
        if (targetQuadrant) {
            element.setAttribute('data-drop-quadrant', targetQuadrant);
        }

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.handleDragOver(e, element);
        });

        element.addEventListener('dragleave', (e) => {
            this.handleDragLeave(e, element);
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(e, targetDate, targetQuadrant, onDrop);
        });

        this.dropZones.push(element);
    }

    /**
     * Handle drag start
     */
    handleDragStart(e, task, sourceDate, sourceQuadrant) {
        this.draggedTask = task;
        this.draggedElement = e.target;
        this.sourceDate = sourceDate;
        this.sourceQuadrant = sourceQuadrant;

        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);

        // Add visual feedback
        e.target.classList.add('dragging');
        e.target.style.opacity = '0.5';

        // Create drag image
        const dragImage = e.target.cloneNode(true);
        dragImage.style.opacity = '0.8';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        setTimeout(() => dragImage.remove(), 0);
    }

    /**
     * Handle drag over drop zone
     */
    handleDragOver(e, dropZone) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Add visual feedback
        dropZone.classList.add('drag-over');

        // Show drop indicator
        const rect = dropZone.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        if (e.clientY < midpoint) {
            dropZone.classList.add('drop-before');
            dropZone.classList.remove('drop-after');
        } else {
            dropZone.classList.add('drop-after');
            dropZone.classList.remove('drop-before');
        }
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(e, dropZone) {
        // Only remove if actually leaving (not entering child)
        if (!dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drag-over', 'drop-before', 'drop-after');
        }
    }

    /**
     * Handle drop
     */
    handleDrop(e, targetDate, targetQuadrant, onDrop) {
        e.preventDefault();
        e.stopPropagation();

        // Remove visual feedback from all drop zones
        this.dropZones.forEach(zone => {
            zone.classList.remove('drag-over', 'drop-before', 'drop-after');
        });

        // Check if dropping in same location
        const sameLocation =
            targetDate === this.sourceDate &&
            targetQuadrant === this.sourceQuadrant;

        if (sameLocation) {
            // Just reorder within same container
            this.handleDragEnd(e);
            return;
        }

        // Call the drop handler
        if (onDrop && this.draggedTask) {
            const dropData = {
                task: this.draggedTask,
                sourceDate: this.sourceDate,
                sourceQuadrant: this.sourceQuadrant,
                targetDate: targetDate,
                targetQuadrant: targetQuadrant
            };

            onDrop(dropData);
        }

        this.handleDragEnd(e);
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
            this.draggedElement.style.opacity = '1';
        }

        // Remove visual feedback from all drop zones
        this.dropZones.forEach(zone => {
            zone.classList.remove('drag-over', 'drop-before', 'drop-after');
        });

        // Reset state
        this.draggedTask = null;
        this.draggedElement = null;
        this.sourceDate = null;
        this.sourceQuadrant = null;
    }

    /**
     * Clean up all drop zones
     */
    cleanup() {
        this.dropZones.forEach(zone => {
            zone.classList.remove('drop-zone', 'drag-over', 'drop-before', 'drop-after');
        });
        this.dropZones = [];
    }

    /**
     * Move task between dates/quadrants
     * @param {Object} dropData - Drop event data
     * @param {Object} stateManager - State manager instance
     */
    moveTask(dropData, stateManager) {
        const { task, sourceDate, sourceQuadrant, targetDate, targetQuadrant } = dropData;
        const state = stateManager.getState();

        // Clone task with updated info
        const movedTask = {
            ...task,
            movedAt: new Date().toISOString()
        };

        // Update quadrant if changed
        if (targetQuadrant && targetQuadrant !== sourceQuadrant) {
            movedTask.quadrant = targetQuadrant;
        }

        // Update scheduled date if changed
        if (targetDate !== sourceDate) {
            movedTask.scheduledDate = targetDate;
        }

        // Remove from source
        const updates = {};

        // Remove from source date
        if (sourceDate && state.daily[sourceDate]) {
            updates[`daily.${sourceDate}.tasks`] = state.daily[sourceDate].tasks.filter(
                t => t.id !== task.id
            );
        }

        // Remove from source quadrant
        if (sourceQuadrant && state.eisenhower[sourceQuadrant]) {
            updates[`eisenhower.${sourceQuadrant}`] = state.eisenhower[sourceQuadrant].filter(
                t => t.id !== task.id
            );
        }

        // Add to target date
        if (targetDate) {
            if (!state.daily[targetDate]) {
                state.daily[targetDate] = { tasks: [] };
            }
            const targetTasks = [...(state.daily[targetDate].tasks || []), movedTask];
            updates[`daily.${targetDate}.tasks`] = targetTasks;
        }

        // Add to target quadrant
        if (targetQuadrant) {
            const targetQuadrantTasks = [...(state.eisenhower[targetQuadrant] || []), movedTask];
            updates[`eisenhower.${targetQuadrant}`] = targetQuadrantTasks;
        }

        // Apply updates through state manager
        const newState = this.applyNestedUpdates(state, updates);
        stateManager.setState(newState, true);

        return movedTask;
    }

    /**
     * Apply nested updates to state
     * @param {Object} state - Current state
     * @param {Object} updates - Nested updates
     * @returns {Object} Updated state
     */
    applyNestedUpdates(state, updates) {
        const newState = JSON.parse(JSON.stringify(state));

        for (const [path, value] of Object.entries(updates)) {
            const keys = path.split('.');
            let current = newState;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }

            current[keys[keys.length - 1]] = value;
        }

        return newState;
    }
}

export default DragDropService;
