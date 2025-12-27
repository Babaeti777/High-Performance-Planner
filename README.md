# High-Performance Planner

A comprehensive, feature-rich daily, weekly, and monthly planner application with integrated productivity tools. Built with pure HTML, CSS, and JavaScript - no frameworks required!

## Features

### 1. Daily Planner
- **Hourly Schedule**: Plan your day from 6 AM to 11 PM with hourly time slots
- **Task Management**: Add, complete, and delete daily tasks with checkbox tracking
- **Important Events**: Track significant events for each day
- **Lessons Learned**: Document what you learned each day
- **Holiday Display**: Automatic holiday notifications
- **Date Navigation**: Easy navigation between days with Previous/Next/Today buttons

### 2. Weekly Planner
- **7-Day Overview**: See your entire week at a glance
- **Per-Day Tasks**: Add tasks to specific days of the week
- **Weekly Events**: Track important events for the week
- **Week Navigation**: Navigate between weeks effortlessly
- **Weekly Lessons**: Document insights from the entire week
- **Today Highlighting**: Current day is automatically highlighted

### 3. Monthly Planner
- **Calendar View**: Full month calendar with interactive date selection
- **Monthly Goals**: Set and track goals for the entire month
- **Important Events**: Record significant monthly events
- **Visual Task Indicators**: Days with tasks are marked on the calendar
- **Month Navigation**: Easy month and year selection
- **Monthly Lessons**: Capture key learnings from the month

### 4. Eisenhower Matrix
Prioritize tasks using the proven Eisenhower Decision Matrix:
- **Urgent & Important** (Do First): Critical tasks requiring immediate attention
- **Not Urgent & Important** (Schedule): Important tasks to schedule for later
- **Urgent & Not Important** (Delegate): Tasks that can be delegated
- **Not Urgent & Not Important** (Eliminate): Tasks to minimize or eliminate

Each quadrant has its own task list with add, complete, and delete functionality.

### 5. Notes Section
- **Rich Note Taking**: Create and manage unlimited notes
- **Note Organization**: All notes displayed in a sidebar for easy access
- **Auto-Timestamps**: Automatic creation and update timestamps
- **Note Persistence**: All notes saved automatically to local storage

### 6. Insights & Important Events
- **All Lessons Learned**: Aggregated view of all daily, weekly, and monthly lessons
- **All Important Events**: Combined view of all events with filtering options
- **Event Filtering**: Filter events by Daily, Weekly, Monthly, or view All
- **Chronological Sorting**: Everything sorted by date (newest first)

### 7. Additional Features
- **Holiday Integration**: Major holidays automatically displayed
- **Data Persistence**: All data saved to browser's local storage
- **Import/Export**: Backup and restore your data with JSON export/import
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Beautiful UI**: Modern gradient design with smooth animations
- **Print Support**: Print-friendly styling for physical copies

## Getting Started

### Installation

1. Clone or download this repository
2. Open `index.html` in any modern web browser
3. Start planning!

No installation, no build process, no dependencies - just open and use!

### Usage

#### Daily Planning
1. Click on the **Daily Planner** tab
2. Select a date using the date picker or navigation buttons
3. Fill in your hourly schedule in the time slots
4. Add tasks using the task input field
5. Add important events for the day
6. Document lessons learned at the end of the day
7. Click "Save Lessons" to store your insights

#### Weekly Planning
1. Navigate to the **Weekly Planner** tab
2. Use the week navigation to select your desired week
3. Add tasks to specific days using the input fields
4. Add weekly events that span multiple days
5. Document weekly lessons and insights

#### Monthly Planning
1. Go to the **Monthly Planner** tab
2. Select the month and year from the dropdowns
3. Click on any date in the calendar to jump to that day's planner
4. Add monthly goals and track their completion
5. Record important monthly events
6. Save monthly lessons learned

#### Using the Eisenhower Matrix
1. Click on the **Eisenhower Matrix** tab
2. Add tasks to the appropriate quadrant based on urgency and importance
3. Use this to prioritize your work effectively
4. Check off tasks as you complete them
5. Delete tasks that are no longer relevant

#### Taking Notes
1. Open the **Notes** tab
2. Enter a note title and click "New Note"
3. Select the note from the sidebar
4. Write your content in the editor
5. Click "Save" to store your notes

#### Viewing Insights
1. Navigate to the **Insights & Important Events** tab
2. Review all your lessons learned across different time periods
3. Use the filter buttons to view specific types of events
4. Reflect on your progress and important moments

### Data Management

#### Export Your Data
- Click the **Export Data** button in the header
- A JSON file will be downloaded with all your planner data
- Store this file safely as a backup

#### Import Your Data
- Click the **Import Data** button in the header
- Select a previously exported JSON file
- Confirm the import (this will replace current data)
- Your data will be restored

#### Clear All Data
To start fresh, open your browser's developer console and run:
```javascript
localStorage.removeItem('plannerData');
location.reload();
```

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Requires JavaScript enabled and local storage support.

## Data Storage

All data is stored locally in your browser's local storage. This means:
- ✅ Your data stays private and secure on your device
- ✅ No internet connection required
- ✅ Fast and responsive
- ⚠️ Data is browser-specific (different browsers = different data)
- ⚠️ Clearing browser data will erase your planner
- ⚠️ Use Export feature regularly to backup your data

## Customization

The planner can be easily customized by modifying:
- **styles.css**: Change colors, fonts, layouts, and design
- **app.js**: Modify functionality, add new features, or adjust behavior
- **index.html**: Add new sections or modify existing structure

### Color Scheme
The default color scheme uses:
- Primary: Blue (#4a90e2)
- Success: Green (#50c878)
- Danger: Red (#e74c3c)
- Warning: Orange (#f39c12)

Modify these in the `:root` section of `styles.css`.

## Tips for Maximum Productivity

1. **Start with Weekly Planning**: Plan your week on Sunday or Monday
2. **Review Daily**: Check your daily planner each morning
3. **Use the Eisenhower Matrix**: Prioritize tasks weekly
4. **Document Lessons**: End each day by writing lessons learned
5. **Track Important Events**: Record significant moments
6. **Set Monthly Goals**: Define clear objectives at the start of each month
7. **Export Regularly**: Backup your data weekly
8. **Review Insights**: Check the Insights tab monthly for reflection

## Project Structure

```
High-Performance-Planner/
│
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── app.js             # Application logic and functionality
└── README.md          # This file
```

## Features Breakdown

### Time Management
- Hourly scheduling (6 AM - 11 PM)
- Daily, weekly, and monthly views
- Easy navigation between time periods

### Task Management
- Create, complete, and delete tasks
- Task indicators on calendar
- Checkbox completion tracking
- Eisenhower Matrix prioritization

### Event Tracking
- Daily, weekly, and monthly events
- Centralized event viewing
- Filtering capabilities

### Reflection & Growth
- Lessons learned tracking
- Insights aggregation
- Historical view of learnings

### Organization
- Note-taking system
- Holiday tracking
- Data import/export

## Future Enhancement Ideas

- Add recurring tasks and events
- Implement task categories/tags
- Add time tracking functionality
- Create charts and statistics
- Add goal progress tracking
- Implement search functionality
- Add dark mode toggle
- Create mobile app version

## Contributing

Feel free to fork this project and make your own enhancements! Some ideas:
- Add new productivity frameworks
- Implement additional views (quarterly, yearly)
- Add calendar integrations
- Create themed color schemes

## License

This project is open source and available for personal and commercial use.

## Support

If you encounter any issues or have questions:
1. Check that JavaScript is enabled in your browser
2. Ensure you're using a modern browser
3. Try clearing your cache and reloading
4. Check the browser console for error messages

## Credits

Built with pure HTML, CSS, and JavaScript - no frameworks, no dependencies, just clean code.

---

**Happy Planning! 🎯**

Stay organized, stay productive, and achieve your goals with the High-Performance Planner.
