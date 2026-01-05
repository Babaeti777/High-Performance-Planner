/**
 * Utility Helper Functions
 */

/**
 * Debounce function to limit execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Get start of week (Sunday) for given date
 * @param {Date} date - Date to get week start for
 * @returns {Date} Start of week
 */
export function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

/**
 * Get month key for storage
 * @param {number} month - Month (0-11)
 * @param {number} year - Year
 * @returns {string} Month key
 */
export function getMonthKey(month, year) {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Type of toast (success, error, warning, info)
 * @param {number} duration - Duration in ms
 */
export function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 16px 24px;
        border-radius: 8px;
        border-left: 4px solid var(--accent-${type === 'error' ? 'danger' : type === 'success' ? 'secondary' : 'primary'});
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show confirmation dialog
 * @param {string} message - Message to show
 * @param {string} confirmText - Confirm button text
 * @param {string} cancelText - Cancel button text
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
export function showConfirmDialog(message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Confirm Action</h3>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-primary); line-height: 1.6;">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelBtn">${cancelText}</button>
                    <button class="btn btn-danger" id="confirmBtn">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const confirmBtn = dialog.querySelector('#confirmBtn');
        const cancelBtn = dialog.querySelector('#cancelBtn');

        const cleanup = () => {
            dialog.remove();
        };

        confirmBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                cleanup();
                resolve(false);
            }
        });

        // Focus confirm button for accessibility
        setTimeout(() => cancelBtn.focus(), 100);
    });
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
