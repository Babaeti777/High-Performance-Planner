/**
 * State Management System with Undo/Redo Support
 * Handles application state, persistence, and history management
 */

import { debounce, deepClone, showToast } from '../utils/helpers.js';

class StateManager {
    constructor(initialState) {
        this.state = initialState;
        this.listeners = [];
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;

        // Debounced save to prevent excessive localStorage writes
        this.debouncedSave = debounce(() => this.persistState(), 500);

        // Auto-save indicator
        this.saveIndicator = null;
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return this.state;
    }

    /**
     * Update state with new values
     * @param {Object} updates - State updates
     * @param {boolean} recordHistory - Whether to record in history
     */
    setState(updates, recordHistory = true) {
        if (recordHistory) {
            this.recordHistory();
        }

        // Merge updates with current state
        this.state = this.deepMerge(this.state, updates);

        // Notify all listeners
        this.notifyListeners();

        // Save to localStorage (debounced)
        this.debouncedSave();
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of state change
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    /**
     * Record current state in history
     */
    recordHistory() {
        // Remove any history after current index (when undoing then making new changes)
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add current state to history
        this.history.push(deepClone(this.state));

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    /**
     * Undo last action
     * @returns {boolean} True if undo was performed
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.state = deepClone(this.history[this.historyIndex]);
            this.notifyListeners();
            this.persistState();
            showToast('Undo successful', 'info', 2000);
            return true;
        }
        showToast('Nothing to undo', 'warning', 2000);
        return false;
    }

    /**
     * Redo last undone action
     * @returns {boolean} True if redo was performed
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.state = deepClone(this.history[this.historyIndex]);
            this.notifyListeners();
            this.persistState();
            showToast('Redo successful', 'info', 2000);
            return true;
        }
        showToast('Nothing to redo', 'warning', 2000);
        return false;
    }

    /**
     * Check if undo is available
     * @returns {boolean}
     */
    canUndo() {
        return this.historyIndex > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean}
     */
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Persist state to localStorage with error handling
     */
    persistState() {
        try {
            localStorage.setItem('plannerData', JSON.stringify(this.state));
            this.showSaveIndicator();
            return true;
        } catch (error) {
            this.handleStorageError(error);
            return false;
        }
    }

    /**
     * Load state from localStorage with error handling
     * @returns {boolean} True if load was successful
     */
    loadState() {
        try {
            const saved = localStorage.getItem('plannerData');
            if (saved) {
                const parsed = JSON.parse(saved);

                // Validate data structure
                if (this.validateDataStructure(parsed)) {
                    this.state = this.deepMerge(this.getDefaultState(), parsed);
                    this.recordHistory(); // Record initial state
                    return true;
                } else {
                    console.error('Invalid data structure in localStorage');
                    this.attemptRecovery();
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.error('Error loading data:', error);
            this.attemptRecovery();
            return false;
        }
    }

    /**
     * Validate data structure
     * @param {Object} data - Data to validate
     * @returns {boolean} True if valid
     */
    validateDataStructure(data) {
        return data &&
               typeof data === 'object' &&
               data.daily &&
               data.eisenhower &&
               data.notes &&
               Array.isArray(data.notes);
    }

    /**
     * Handle storage errors
     * @param {Error} error - Error object
     */
    handleStorageError(error) {
        console.error('Storage error:', error);

        if (error.name === 'QuotaExceededError') {
            showToast('Storage quota exceeded! Please export your data and clear old entries.', 'error', 5000);

            // Offer to export data
            if (confirm('Storage is full. Would you like to export your data now?')) {
                this.exportData();
            }
        } else {
            showToast('Failed to save data. Please check your browser settings.', 'error', 4000);
        }
    }

    /**
     * Attempt to recover from backup
     */
    attemptRecovery() {
        try {
            const backup = localStorage.getItem('plannerData_backup');
            if (backup) {
                const parsed = JSON.parse(backup);
                if (this.validateDataStructure(parsed)) {
                    showToast('Recovered from backup', 'success', 3000);
                    this.state = parsed;
                    this.persistState();
                    return true;
                }
            }
        } catch (error) {
            console.error('Recovery failed:', error);
        }

        // Fall back to default state
        showToast('Using default state', 'warning', 3000);
        this.state = this.getDefaultState();
        return false;
    }

    /**
     * Create backup before destructive operations
     */
    createBackup() {
        try {
            localStorage.setItem('plannerData_backup', JSON.stringify(this.state));
            return true;
        } catch (error) {
            console.error('Backup failed:', error);
            return false;
        }
    }

    /**
     * Export data as JSON file
     */
    exportData() {
        try {
            const dataStr = JSON.stringify(this.state, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `planner-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showToast('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showToast('Export failed', 'error');
        }
    }

    /**
     * Import data from JSON
     * @param {Object} data - Data to import
     * @returns {boolean} True if import was successful
     */
    async importData(data) {
        try {
            if (!this.validateDataStructure(data)) {
                showToast('Invalid data format', 'error');
                return false;
            }

            // Create backup before import
            this.createBackup();

            // Update state
            this.state = this.deepMerge(this.getDefaultState(), data);
            this.recordHistory();
            this.persistState();

            showToast('Data imported successfully', 'success');
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            showToast('Import failed', 'error');
            return false;
        }
    }

    /**
     * Show save indicator
     */
    showSaveIndicator() {
        if (!this.saveIndicator) {
            this.saveIndicator = document.createElement('div');
            this.saveIndicator.id = 'saveIndicator';
            this.saveIndicator.style.cssText = `
                position: fixed;
                top: 24px;
                right: 24px;
                background: var(--accent-secondary);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 9999;
                pointer-events: none;
            `;
            document.body.appendChild(this.saveIndicator);
        }

        this.saveIndicator.textContent = '✓ Saved';
        this.saveIndicator.style.opacity = '1';

        setTimeout(() => {
            if (this.saveIndicator) {
                this.saveIndicator.style.opacity = '0';
            }
        }, 2000);
    }

    /**
     * Deep merge objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    deepMerge(target, source) {
        const output = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                output[key] = source[key];
            }
        }

        return output;
    }

    /**
     * Get default state structure
     * @returns {Object} Default state
     */
    getDefaultState() {
        return {
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
        };
    }

    /**
     * Clear all data
     */
    clearAll() {
        this.createBackup();
        this.state = this.getDefaultState();
        this.history = [];
        this.historyIndex = -1;
        this.recordHistory();
        this.persistState();
        this.notifyListeners();
        showToast('All data cleared', 'info');
    }
}

export default StateManager;
