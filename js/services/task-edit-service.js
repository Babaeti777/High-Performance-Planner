/**
 * Task Edit Service
 * Handles task editing functionality with modal dialog
 */

import Validators from '../utils/validators.js';
import { showToast } from '../utils/helpers.js';

class TaskEditService {
    constructor() {
        this.currentTask = null;
        this.currentDateKey = null;
        this.onSaveCallback = null;
        this.editModal = null;
    }

    /**
     * Initialize edit modal
     */
    initializeEditModal() {
        // Create modal if it doesn't exist
        if (document.getElementById('taskEditModal')) {
            this.editModal = document.getElementById('taskEditModal');
            return;
        }

        this.editModal = document.createElement('div');
        this.editModal.id = 'taskEditModal';
        this.editModal.className = 'modal hidden';
        this.editModal.setAttribute('role', 'dialog');
        this.editModal.setAttribute('aria-labelledby', 'editTaskTitle');
        this.editModal.setAttribute('aria-modal', 'true');

        this.editModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="editTaskTitle">Edit Task</h3>
                    <button class="modal-close" id="closeEditModal" aria-label="Close edit modal">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="editTaskText">Task Description</label>
                        <textarea id="editTaskText" class="form-input" rows="3" required></textarea>
                        <span class="validation-error" id="editTaskTextError"></span>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editTaskDuration">Duration (hours)</label>
                            <input type="number" id="editTaskDuration" class="form-input"
                                   min="0" max="24" step="0.5" placeholder="2.5">
                            <span class="validation-error" id="editTaskDurationError"></span>
                        </div>
                        <div class="form-group">
                            <label for="editTaskPriority">Priority</label>
                            <select id="editTaskPriority" class="form-select">
                                <option value="">None</option>
                                <option value="urgent-important">🔥 Urgent & Important</option>
                                <option value="not-urgent-important">📅 Important, Not Urgent</option>
                                <option value="urgent-not-important">⚡ Urgent, Not Important</option>
                                <option value="not-urgent-not-important">🗑️ Low Priority</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editTaskDate">Scheduled Date</label>
                        <input type="date" id="editTaskDate" class="form-input">
                        <span class="validation-error" id="editTaskDateError"></span>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="editTaskCompleted" class="task-checkbox">
                            <span>Mark as completed</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelEditModal">Cancel</button>
                    <button class="btn btn-danger" id="deleteTaskBtn">Delete</button>
                    <button class="btn btn-primary" id="saveEditTask">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.editModal);
        this.attachEditModalListeners();
    }

    /**
     * Attach event listeners to edit modal
     */
    attachEditModalListeners() {
        const closeBtn = this.editModal.querySelector('#closeEditModal');
        const cancelBtn = this.editModal.querySelector('#cancelEditModal');
        const saveBtn = this.editModal.querySelector('#saveEditTask');
        const deleteBtn = this.editModal.querySelector('#deleteTaskBtn');

        closeBtn.addEventListener('click', () => this.closeEditModal());
        cancelBtn.addEventListener('click', () => this.closeEditModal());
        saveBtn.addEventListener('click', () => this.saveTaskEdits());
        deleteBtn.addEventListener('click', () => this.deleteTask());

        // Close on backdrop click
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) {
                this.closeEditModal();
            }
        });

        // Real-time validation
        const textInput = this.editModal.querySelector('#editTaskText');
        const durationInput = this.editModal.querySelector('#editTaskDuration');

        textInput.addEventListener('input', () => this.validateField('text', textInput.value));
        durationInput.addEventListener('input', () => this.validateField('duration', durationInput.value));

        // Keyboard shortcuts
        this.editModal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEditModal();
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                this.saveTaskEdits();
            }
        });
    }

    /**
     * Open edit modal for a task
     * @param {Object} task - Task to edit
     * @param {string} dateKey - Date key of the task
     * @param {Function} onSave - Callback when task is saved
     */
    openEditModal(task, dateKey, onSave) {
        if (!this.editModal) {
            this.initializeEditModal();
        }

        this.currentTask = { ...task };
        this.currentDateKey = dateKey;
        this.onSaveCallback = onSave;

        // Populate form
        this.populateEditForm(task);

        // Show modal
        this.editModal.classList.remove('hidden');
        this.editModal.setAttribute('aria-hidden', 'false');

        // Focus first input
        setTimeout(() => {
            this.editModal.querySelector('#editTaskText').focus();
        }, 100);
    }

    /**
     * Populate edit form with task data
     * @param {Object} task - Task data
     */
    populateEditForm(task) {
        const textInput = this.editModal.querySelector('#editTaskText');
        const durationInput = this.editModal.querySelector('#editTaskDuration');
        const prioritySelect = this.editModal.querySelector('#editTaskPriority');
        const dateInput = this.editModal.querySelector('#editTaskDate');
        const completedCheckbox = this.editModal.querySelector('#editTaskCompleted');

        textInput.value = task.text || '';
        durationInput.value = task.duration || '';
        prioritySelect.value = task.quadrant || '';
        dateInput.value = task.scheduledDate || this.currentDateKey || '';
        completedCheckbox.checked = task.completed || false;

        // Clear validation errors
        this.clearValidationErrors();
    }

    /**
     * Validate a field
     * @param {string} field - Field name
     * @param {*} value - Field value
     * @returns {boolean} Is valid
     */
    validateField(field, value) {
        let validation;
        let errorElement;

        switch (field) {
            case 'text':
                validation = Validators.taskText(value);
                errorElement = this.editModal.querySelector('#editTaskTextError');
                break;
            case 'duration':
                validation = Validators.duration(value);
                errorElement = this.editModal.querySelector('#editTaskDurationError');
                break;
            case 'date':
                validation = Validators.date(value);
                errorElement = this.editModal.querySelector('#editTaskDateError');
                break;
            default:
                return true;
        }

        if (validation.valid) {
            errorElement.textContent = '';
            errorElement.previousElementSibling?.classList.remove('invalid');
            return true;
        } else {
            errorElement.textContent = validation.error;
            errorElement.previousElementSibling?.classList.add('invalid');
            return false;
        }
    }

    /**
     * Clear all validation errors
     */
    clearValidationErrors() {
        const errors = this.editModal.querySelectorAll('.validation-error');
        errors.forEach(error => {
            error.textContent = '';
        });

        const inputs = this.editModal.querySelectorAll('.form-input, .form-select');
        inputs.forEach(input => {
            input.classList.remove('invalid');
        });
    }

    /**
     * Save task edits
     */
    async saveTaskEdits() {
        const textInput = this.editModal.querySelector('#editTaskText');
        const durationInput = this.editModal.querySelector('#editTaskDuration');
        const prioritySelect = this.editModal.querySelector('#editTaskPriority');
        const dateInput = this.editModal.querySelector('#editTaskDate');
        const completedCheckbox = this.editModal.querySelector('#editTaskCompleted');

        // Validate all fields
        const isTextValid = this.validateField('text', textInput.value);
        const isDurationValid = this.validateField('duration', durationInput.value);
        const isDateValid = this.validateField('date', dateInput.value);

        if (!isTextValid || !isDurationValid || !isDateValid) {
            showToast('Please fix validation errors', 'error');
            return;
        }

        // Create updated task
        const updatedTask = {
            ...this.currentTask,
            text: textInput.value.trim(),
            duration: parseFloat(durationInput.value) || 0,
            quadrant: prioritySelect.value || null,
            scheduledDate: dateInput.value || this.currentDateKey,
            completed: completedCheckbox.checked,
            updatedAt: new Date().toISOString()
        };

        // Call save callback
        if (this.onSaveCallback) {
            await this.onSaveCallback(updatedTask, this.currentDateKey);
        }

        showToast('Task updated successfully', 'success');
        this.closeEditModal();
    }

    /**
     * Delete task
     */
    async deleteTask() {
        const confirmed = confirm(`Delete task: "${this.currentTask.text}"?`);

        if (!confirmed) {
            return;
        }

        // Call save callback with null to indicate deletion
        if (this.onSaveCallback) {
            await this.onSaveCallback(null, this.currentDateKey);
        }

        showToast('Task deleted', 'info');
        this.closeEditModal();
    }

    /**
     * Close edit modal
     */
    closeEditModal() {
        if (this.editModal) {
            this.editModal.classList.add('hidden');
            this.editModal.setAttribute('aria-hidden', 'true');
        }

        this.currentTask = null;
        this.currentDateKey = null;
        this.onSaveCallback = null;
        this.clearValidationErrors();
    }

    /**
     * Add edit button to task element
     * @param {HTMLElement} taskElement - Task element
     * @param {Object} task - Task data
     * @param {string} dateKey - Date key
     * @param {Function} onSave - Save callback
     * @returns {HTMLElement} Edit button
     */
    addEditButton(taskElement, task, dateKey, onSave) {
        const editBtn = document.createElement('button');
        editBtn.className = 'task-edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Edit task';
        editBtn.setAttribute('aria-label', 'Edit task');

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openEditModal(task, dateKey, onSave);
        });

        return editBtn;
    }

    /**
     * Make task element editable on double-click
     * @param {HTMLElement} taskElement - Task element
     * @param {Object} task - Task data
     * @param {string} dateKey - Date key
     * @param {Function} onSave - Save callback
     */
    makeDoubleClickEditable(taskElement, task, dateKey, onSave) {
        taskElement.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.openEditModal(task, dateKey, onSave);
        });

        taskElement.title = 'Double-click to edit';
    }
}

export default TaskEditService;
