/**
 * Search and Filter Service
 * Provides search and filtering capabilities for tasks
 */

class SearchService {
    constructor() {
        this.searchCache = new Map();
    }

    /**
     * Search tasks across all dates
     * @param {Object} dailyData - Daily data object
     * @param {string} query - Search query
     * @param {Object} filters - Additional filters
     * @returns {Array} Matching tasks with metadata
     */
    searchTasks(dailyData, query, filters = {}) {
        const cacheKey = JSON.stringify({ query, filters });

        // Check cache
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        let results = [];

        // Extract all tasks from all dates
        for (const [dateKey, dayData] of Object.entries(dailyData)) {
            if (dayData.tasks) {
                dayData.tasks.forEach(task => {
                    results.push({
                        ...task,
                        dateKey,
                        date: new Date(dateKey)
                    });
                });
            }
        }

        // Apply text search
        if (query && query.trim()) {
            const lowerQuery = query.toLowerCase().trim();
            results = results.filter(task =>
                task.text.toLowerCase().includes(lowerQuery)
            );
        }

        // Apply filters
        results = this.applyFilters(results, filters);

        // Sort results by date (most recent first)
        results.sort((a, b) => b.date - a.date);

        // Cache results
        this.searchCache.set(cacheKey, results);

        return results;
    }

    /**
     * Search notes
     * @param {Array} notes - Notes array
     * @param {string} query - Search query
     * @returns {Array} Matching notes
     */
    searchNotes(notes, query) {
        if (!query || !query.trim()) {
            return notes;
        }

        const lowerQuery = query.toLowerCase().trim();
        return notes.filter(note =>
            note.title.toLowerCase().includes(lowerQuery) ||
            note.content.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Apply filters to results
     * @param {Array} results - Results to filter
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered results
     */
    applyFilters(results, filters) {
        let filtered = results;

        // Filter by priority/quadrant
        if (filters.priority) {
            filtered = filtered.filter(task => task.quadrant === filters.priority);
        }

        // Filter by completion status
        if (filters.completed !== undefined) {
            filtered = filtered.filter(task => task.completed === filters.completed);
        }

        // Filter by date range
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            filtered = filtered.filter(task => task.date >= start);
        }

        if (filters.endDate) {
            const end = new Date(filters.endDate);
            filtered = filtered.filter(task => task.date <= end);
        }

        // Filter by duration
        if (filters.minDuration !== undefined) {
            filtered = filtered.filter(task =>
                task.duration && task.duration >= filters.minDuration
            );
        }

        if (filters.maxDuration !== undefined) {
            filtered = filtered.filter(task =>
                task.duration && task.duration <= filters.maxDuration
            );
        }

        // Filter by source
        if (filters.source) {
            filtered = filtered.filter(task => task.source === filters.source);
        }

        return filtered;
    }

    /**
     * Get filter suggestions based on current data
     * @param {Object} dailyData - Daily data object
     * @returns {Object} Filter suggestions
     */
    getFilterSuggestions(dailyData) {
        const suggestions = {
            priorities: new Set(),
            sources: new Set(),
            dateRange: { min: null, max: null }
        };

        for (const [dateKey, dayData] of Object.entries(dailyData)) {
            if (dayData.tasks) {
                const date = new Date(dateKey);

                if (!suggestions.dateRange.min || date < suggestions.dateRange.min) {
                    suggestions.dateRange.min = date;
                }
                if (!suggestions.dateRange.max || date > suggestions.dateRange.max) {
                    suggestions.dateRange.max = date;
                }

                dayData.tasks.forEach(task => {
                    if (task.quadrant) suggestions.priorities.add(task.quadrant);
                    if (task.source) suggestions.sources.add(task.source);
                });
            }
        }

        return {
            priorities: Array.from(suggestions.priorities),
            sources: Array.from(suggestions.sources),
            dateRange: suggestions.dateRange
        };
    }

    /**
     * Highlight search query in text
     * @param {string} text - Text to highlight in
     * @param {string} query - Query to highlight
     * @returns {string} HTML with highlighted text
     */
    highlightText(text, query) {
        if (!query || !query.trim()) {
            return text;
        }

        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    /**
     * Escape special regex characters
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Clear search cache
     */
    clearCache() {
        this.searchCache.clear();
    }

    /**
     * Get statistics for search results
     * @param {Array} results - Search results
     * @returns {Object} Statistics
     */
    getStats(results) {
        return {
            total: results.length,
            completed: results.filter(t => t.completed).length,
            pending: results.filter(t => !t.completed).length,
            totalDuration: results.reduce((sum, t) => sum + (t.duration || 0), 0),
            byPriority: this.groupByPriority(results)
        };
    }

    /**
     * Group results by priority
     * @param {Array} results - Results to group
     * @returns {Object} Grouped results
     */
    groupByPriority(results) {
        const groups = {
            'urgent-important': 0,
            'not-urgent-important': 0,
            'urgent-not-important': 0,
            'not-urgent-not-important': 0,
            'none': 0
        };

        results.forEach(task => {
            const priority = task.quadrant || 'none';
            groups[priority] = (groups[priority] || 0) + 1;
        });

        return groups;
    }
}

export default SearchService;
