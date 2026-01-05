/**
 * Input Validation Utilities
 * Provides validation functions for all user inputs
 */

const Validators = {
    /**
     * Validates task text input
     * @param {string} text - Task text to validate
     * @returns {{valid: boolean, error?: string}}
     */
    taskText(text) {
        if (!text || text.trim().length === 0) {
            return { valid: false, error: 'Task cannot be empty' };
        }
        if (text.length > 500) {
            return { valid: false, error: 'Task must be less than 500 characters' };
        }
        // Basic XSS prevention check
        if (/<script|javascript:|onerror=/i.test(text)) {
            return { valid: false, error: 'Invalid characters detected' };
        }
        return { valid: true };
    },

    /**
     * Validates duration input
     * @param {number|string} duration - Duration to validate
     * @returns {{valid: boolean, error?: string}}
     */
    duration(duration) {
        if (duration === '' || duration === null || duration === undefined) {
            return { valid: true }; // Optional field
        }
        const num = parseFloat(duration);
        if (isNaN(num)) {
            return { valid: false, error: 'Duration must be a number' };
        }
        if (num < 0 || num > 24) {
            return { valid: false, error: 'Duration must be between 0 and 24 hours' };
        }
        return { valid: true };
    },

    /**
     * Validates date input
     * @param {string} dateString - Date string to validate
     * @returns {{valid: boolean, error?: string}}
     */
    date(dateString) {
        if (!dateString) {
            return { valid: true }; // Optional field
        }
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return { valid: false, error: 'Invalid date' };
        }
        // Check if date is too far in the past or future
        const year = date.getFullYear();
        if (year < 2020 || year > 2100) {
            return { valid: false, error: 'Date must be between 2020 and 2100' };
        }
        return { valid: true };
    },

    /**
     * Validates note title
     * @param {string} title - Note title to validate
     * @returns {{valid: boolean, error?: string}}
     */
    noteTitle(title) {
        if (!title || title.trim().length === 0) {
            return { valid: true }; // Will use default
        }
        if (title.length > 100) {
            return { valid: false, error: 'Title must be less than 100 characters' };
        }
        return { valid: true };
    },

    /**
     * Validates goal text
     * @param {string} text - Goal text to validate
     * @returns {{valid: boolean, error?: string}}
     */
    goalText(text) {
        if (!text || text.trim().length === 0) {
            return { valid: false, error: 'Goal cannot be empty' };
        }
        if (text.length > 200) {
            return { valid: false, error: 'Goal must be less than 200 characters' };
        }
        return { valid: true };
    }
};

export default Validators;
