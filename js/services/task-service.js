/**
 * Task Service
 * Business logic for task management
 */

import { generateId } from '../utils/helpers.js';
import Validators from '../utils/validators.js';

class TaskService {
    /**
     * Create a new task
     * @param {string} text - Task text
     * @param {Object} options - Task options
     * @returns {{success: boolean, task?: Object, error?: string}}
     */
    static createTask(text, options = {}) {
        // Validate input
        const textValidation = Validators.taskText(text);
        if (!textValidation.valid) {
            return { success: false, error: textValidation.error };
        }

        const durationValidation = Validators.duration(options.duration);
        if (!durationValidation.valid) {
            return { success: false, error: durationValidation.error };
        }

        const task = {
            id: generateId(),
            text: text.trim(),
            completed: false,
            duration: parseFloat(options.duration) || 0,
            createdAt: new Date().toISOString()
        };

        if (options.quadrant) {
            task.source = 'eisenhower';
            task.quadrant = options.quadrant;
        }

        if (options.scheduledDate) {
            task.scheduledDate = options.scheduledDate;
        }

        return { success: true, task };
    }

    /**
     * Toggle task completion status
     * @param {Object} task - Task to toggle
     * @returns {Object} Updated task
     */
    static toggleComplete(task) {
        return {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? new Date().toISOString() : null
        };
    }

    /**
     * Update task
     * @param {Object} task - Current task
     * @param {Object} updates - Updates to apply
     * @returns {{success: boolean, task?: Object, error?: string}}
     */
    static updateTask(task, updates) {
        // Validate updates
        if (updates.text !== undefined) {
            const validation = Validators.taskText(updates.text);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }
        }

        if (updates.duration !== undefined) {
            const validation = Validators.duration(updates.duration);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }
        }

        const updatedTask = {
            ...task,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        return { success: true, task: updatedTask };
    }

    /**
     * Get tasks for a specific date
     * @param {Object} dailyData - Daily data object
     * @param {string} dateKey - Date key
     * @returns {Array} Tasks for the date
     */
    static getTasksForDate(dailyData, dateKey) {
        return dailyData[dateKey]?.tasks || [];
    }

    /**
     * Get tasks for a date range
     * @param {Object} dailyData - Daily data object
     * @param {string} startDate - Start date key
     * @param {string} endDate - End date key
     * @returns {Array} Tasks in range with date info
     */
    static getTasksInRange(dailyData, startDate, endDate) {
        const tasks = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (const [dateKey, dayData] of Object.entries(dailyData)) {
            const date = new Date(dateKey);
            if (date >= start && date <= end && dayData.tasks) {
                dayData.tasks.forEach(task => {
                    tasks.push({
                        ...task,
                        dateKey,
                        date
                    });
                });
            }
        }

        return tasks.sort((a, b) => a.date - b.date);
    }

    /**
     * Get task statistics
     * @param {Array} tasks - Tasks to analyze
     * @returns {Object} Statistics
     */
    static getStatistics(tasks) {
        return {
            total: tasks.length,
            completed: tasks.filter(t => t.completed).length,
            pending: tasks.filter(t => !t.completed).length,
            totalHours: tasks.reduce((sum, t) => sum + (t.duration || 0), 0),
            completedHours: tasks
                .filter(t => t.completed)
                .reduce((sum, t) => sum + (t.duration || 0), 0),
            averageDuration: tasks.length > 0
                ? tasks.reduce((sum, t) => sum + (t.duration || 0), 0) / tasks.length
                : 0
        };
    }

    /**
     * Sync task between Eisenhower matrix and daily tasks
     * @param {Object} task - Task to sync
     * @param {Object} eisenhowerData - Eisenhower data
     * @param {Object} dailyData - Daily data
     * @returns {{eisenhower: Object, daily: Object}} Updated data
     */
    static syncTask(task, eisenhowerData, dailyData) {
        const updatedEisenhower = { ...eisenhowerData };
        const updatedDaily = { ...dailyData };

        // Update in Eisenhower if applicable
        if (task.quadrant && updatedEisenhower[task.quadrant]) {
            const eisenIndex = updatedEisenhower[task.quadrant].findIndex(t => t.id === task.id);
            if (eisenIndex !== -1) {
                updatedEisenhower[task.quadrant][eisenIndex] = task;
            }
        }

        // Update in daily tasks if scheduled
        if (task.scheduledDate && updatedDaily[task.scheduledDate]) {
            const dailyIndex = updatedDaily[task.scheduledDate].tasks.findIndex(t => t.id === task.id);
            if (dailyIndex !== -1) {
                updatedDaily[task.scheduledDate].tasks[dailyIndex] = task;
            }
        }

        return { eisenhower: updatedEisenhower, daily: updatedDaily };
    }

    /**
     * Delete task from both Eisenhower and daily tasks
     * @param {string} taskId - Task ID
     * @param {Object} eisenhowerData - Eisenhower data
     * @param {Object} dailyData - Daily data
     * @returns {{eisenhower: Object, daily: Object}} Updated data
     */
    static deleteTask(taskId, eisenhowerData, dailyData) {
        const updatedEisenhower = { ...eisenhowerData };
        const updatedDaily = { ...dailyData };

        // Remove from Eisenhower
        for (const quadrant in updatedEisenhower) {
            updatedEisenhower[quadrant] = updatedEisenhower[quadrant].filter(
                t => t.id !== taskId
            );
        }

        // Remove from daily tasks
        for (const dateKey in updatedDaily) {
            if (updatedDaily[dateKey].tasks) {
                updatedDaily[dateKey].tasks = updatedDaily[dateKey].tasks.filter(
                    t => t.id !== taskId
                );
            }
        }

        return { eisenhower: updatedEisenhower, daily: updatedDaily };
    }
}

export default TaskService;
