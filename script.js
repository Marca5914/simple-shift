document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const monthPicker = document.getElementById('month-picker');
    const calendarDaysContainer = document.getElementById('calendar-days');
    const shiftTemplatesContainer = document.getElementById('shift-templates');
    const addShiftTypeBtn = document.getElementById('add-shift-type-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const modal = document.getElementById('add-shift-modal');
    const closeModalBtn = modal.querySelector('.close-btn');
    const addShiftForm = document.getElementById('add-shift-form');
    const shiftLabelInput = document.getElementById('shift-label');
    const shiftStartTimeInput = document.getElementById('shift-start-time');
    const shiftEndTimeInput = document.getElementById('shift-end-time');
    const shiftColorInput = document.getElementById('shift-color');

    // --- State ---
    let currentYear, currentMonth;
    let scheduledShifts = {}; // Store shifts: { "YYYY-MM-DD": { label, color, startTime, endTime }, ... }
    let shiftTypes = [ // Default shift types
        { label: "Day", color: "#add8e6", startTime: "08:00", endTime: "16:00", cssClass: "shift-day" },
        { label: "Night", color: "#4682b4", startTime: "20:00", endTime: "04:00", cssClass: "shift-night" }, // Example night shift crossing midnight
        { label: "Back", color: "#90ee90", startTime: "12:00", endTime: "20:00", cssClass: "shift-back" }
    ];

    // --- Initialization ---
    function initialize() {
        const today = new Date();
        currentYear = today.getFullYear();
        currentMonth = today.getMonth(); // 0-indexed (0 = January)

        // Set month picker to current month
        monthPicker.value = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        renderShiftTemplates();
        renderCalendar(currentYear, currentMonth);
        addEventListeners();
    }

    // --- Calendar Rendering ---
    function renderCalendar(year, month) {
        calendarDaysContainer.innerHTML = ''; // Clear previous calendar
        scheduledShifts = loadShiftsForMonth(year, month); // Load shifts for the current view

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0=Monday, 6=Sunday

        // Add empty cells for days before the 1st
        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'outside-month');
            calendarDaysContainer.appendChild(emptyCell);
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day');
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayCell.dataset.date = dateStr; // Store date in YYYY-MM-DD format

            const dayNumber = document.createElement('div');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);

            // Add drag & drop listeners
            dayCell.addEventListener('dragover', handleDragOver);
            dayCell.addEventListener('dragleave', handleDragLeave);
            dayCell.addEventListener('drop', handleDrop);

            // Display existing shift for this day
            if (scheduledShifts[dateStr]) {
                displayShiftOnCalendar(dayCell, scheduledShifts[dateStr]);
            }

            calendarDaysContainer.appendChild(dayCell);
        }

         // Add empty cells to fill the last row if needed (optional, for grid neatness)
        const totalCells = startDayOfWeek + daysInMonth;
        const remainingCells = (7 - (totalCells % 7)) % 7;
         for (let i = 0; i < remainingCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'outside-month');
            calendarDaysContainer.appendChild(emptyCell);
         }
    }

    // --- Shift Template Rendering ---
    function renderShiftTemplates() {
        shiftTemplatesContainer.querySelectorAll('.shift-template').forEach(el => el.remove()); // Clear existing

        shiftTypes.forEach(shift => {
            const shiftDiv = document.createElement('div');
            shiftDiv.classList.add('shift-template');
            if (shift.cssClass) { // Use predefined class if available
                 shiftDiv.classList.add(shift.cssClass);
            }
            shiftDiv.style.backgroundColor = shift.color; // Apply specific color
            // Set text color based on background brightness (simple example)
            shiftDiv.style.color = isColorLight(shift.color) ? '#333' : '#fff';

            shiftDiv.setAttribute('draggable', true);
            shiftDiv.textContent = `${shift.label} (${shift.startTime}-${shift.endTime})`;
            // Store shift data
            shiftDiv.dataset.label = shift.label;
            shiftDiv.dataset.color = shift.color;
            shiftDiv.dataset.startTime = shift.startTime;
            shiftDiv.dataset.endTime = shift.endTime;

            shiftDiv.addEventListener('dragstart', handleDragStart);
            shiftTemplatesContainer.appendChild(shiftDiv);
        });
    }

    // --- Drag and Drop Handlers ---
    function handleDragStart(event) {
        const shiftData = {
            label: event.target.dataset.label,
            color: event.target.dataset.color,
            startTime: event.target.dataset.startTime,
            endTime: event.target.dataset.endTime
        };
        event.dataTransfer.setData('application/json', JSON.stringify(shiftData));
        event.dataTransfer.effectAllowed = 'copy';
         // Optional: slightly fade the dragged element
        // event.target.style.opacity = '0.7';
    }

    function handleDragOver(event) {
        event.preventDefault(); // Necessary to allow dropping
        event.dataTransfer.dropEffect = 'copy';
        event.currentTarget.classList.add('drag-over'); // Highlight drop target
    }

    function handleDragLeave(event) {
        event.currentTarget.classList.remove('drag-over'); // Remove highlight
    }

     function handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        const targetCell = event.currentTarget;
        const dateStr = targetCell.dataset.date;

        try {
            const shiftData = JSON.parse(event.dataTransfer.getData('application/json'));

            // Store the shift
            scheduledShifts[dateStr] = shiftData;
            saveShift(dateStr, shiftData); // Persist shift (e.g., to localStorage)

            // Update the UI
            displayShiftOnCalendar(targetCell, shiftData);

        } catch (e) {
            console.error("Error parsing dropped data:", e);
        }
    }

    // --- Displaying Shifts on Calendar ---
    function displayShiftOnCalendar(dayCell, shiftData) {
        // Remove any existing shift display first
        const existingShift = dayCell.querySelector('.shift-on-calendar');
        if (existingShift) {
            existingShift.remove();
        }

        if (!shiftData) return; // If shiftData is null/undefined (e.g., clearing a shift)

        const shiftDiv = document.createElement('div');
        shiftDiv.classList.add('shift-on-calendar');
        shiftDiv.textContent = `${shiftData.label} (${shiftData.startTime}-${shiftData.endTime})`;
        shiftDiv.style.backgroundColor = shiftData.color;
        shiftDiv.style.color = isColorLight(shiftData.color) ? '#333' : '#fff'; // Adjust text color

        // Option: Add button/logic here to remove the shift if clicked
        shiftDiv.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering day cell events if any
            if (confirm(`Remove ${shiftData.label} shift on ${dayCell.dataset.date}?`)) {
                 delete scheduledShifts[dayCell.dataset.date];
                 deleteShift(dayCell.dataset.date); // Remove from persistence
                 shiftDiv.remove();
            }
        });


        dayCell.appendChild(shiftDiv);
    }


    // --- Modal Handling ---
    function openModal() {
        addShiftForm.reset(); // Clear form
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    function handleAddShiftType(event) {
        event.preventDefault(); // Prevent form submission reload

        const newShift = {
            label: shiftLabelInput.value.trim(),
            startTime: shiftStartTimeInput.value,
            endTime: shiftEndTimeInput.value,
            color: shiftColorInput.value,
            cssClass: '' // Custom shifts don't get a predefined CSS class unless you generate one
        };

        if (!newShift.label || !newShift.startTime || !newShift.endTime) {
            alert("Please fill in all fields.");
            return;
        }

        // Optional: Check if label already exists
        if (shiftTypes.some(st => st.label.toLowerCase() === newShift.label.toLowerCase())) {
            alert("A shift type with this label already exists.");
            return;
        }


        shiftTypes.push(newShift);
        saveShiftTypes(); // Persist new shift type list
        renderShiftTemplates(); // Re-render the list including the new one
        closeModal();
    }

    // --- Data Persistence (using LocalStorage - very basic) ---
    // You might want a more robust solution for a real application
    const SHIFTS_STORAGE_KEY_PREFIX = 'scheduledShifts_';
    const SHIFT_TYPES_STORAGE_KEY = 'shiftTypes';

    function getStorageKeyForMonth(year, month) {
        return `${SHIFTS_STORAGE_KEY_PREFIX}${year}-${String(month + 1).padStart(2, '0')}`;
    }

    function saveShift(dateStr, shiftData) {
        const [year, monthStr, day] = dateStr.split('-');
        const month = parseInt(monthStr, 10) - 1; // Back to 0-indexed
        const storageKey = getStorageKeyForMonth(year, month);
        let monthShifts = JSON.parse(localStorage.getItem(storageKey) || '{}');
        monthShifts[dateStr] = shiftData;
        localStorage.setItem(storageKey, JSON.stringify(monthShifts));
    }

     function deleteShift(dateStr) {
        const [year, monthStr, day] = dateStr.split('-');
        const month = parseInt(monthStr, 10) - 1;
        const storageKey = getStorageKeyForMonth(year, month);
        let monthShifts = JSON.parse(localStorage.getItem(storageKey) || '{}');
        delete monthShifts[dateStr];
        localStorage.setItem(storageKey, JSON.stringify(monthShifts));
    }

    function loadShiftsForMonth(year, month) {
        const storageKey = getStorageKeyForMonth(year, month);
        return JSON.parse(localStorage.getItem(storageKey) || '{}');
    }

    function saveShiftTypes() {
         localStorage.setItem(SHIFT_TYPES_STORAGE_KEY, JSON.stringify(shiftTypes));
    }

    function loadShiftTypes() {
        const storedTypes = localStorage.getItem(SHIFT_TYPES_STORAGE_KEY);
        if (storedTypes) {
            shiftTypes = JSON.parse(storedTypes);
        }
        // Ensure default types are present if storage is empty/invalid (optional)
        // Or merge defaults with stored ones carefully
    }


    // --- CSV Export ---
    function exportCSV() {
        const header = "Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description,Location,Private\n";
        let csvContent = header;

        // Get shifts ONLY for the currently displayed month
        const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        console.log("Exporting shifts for month key:", currentMonthKey);
        console.log("Current scheduledShifts state:", scheduledShifts);


        // Filter shifts for the *current* month being viewed
        const shiftsToExport = Object.entries(scheduledShifts)
            .filter(([dateStr, shiftData]) => dateStr.startsWith(currentMonthKey));


        if (shiftsToExport.length === 0) {
            alert("No shifts scheduled for the current month to export.");
            return;
        }

        shiftsToExport.forEach(([dateStr, shiftData]) => {
            // Google Calendar often prefers MM/DD/YYYY
            const [year, month, day] = dateStr.split('-');
            const startDate = `${month}/${day}/${year}`;
            let endDate = startDate; // Assume same day unless end time is earlier than start time

            // Basic check for overnight shifts (adjust logic if needed for more complex scenarios)
             if (shiftData.endTime < shiftData.startTime) {
                 const nextDay = new Date(year, parseInt(month) - 1, parseInt(day));
                 nextDay.setDate(nextDay.getDate() + 1);
                 endDate = `${String(nextDay.getMonth() + 1).padStart(2, '0')}/${String(nextDay.getDate()).padStart(2, '0')}/${nextDay.getFullYear()}`;
            }

            // Format times - Google Calendar can often handle HH:MM (24hr)
             const startTime = shiftData.startTime; // Assuming HH:MM format from input
             const endTime = shiftData.endTime;   // Assuming HH:MM format from input

            const subject = shiftData.label; // Use shift label as event subject
            const allDayEvent = "FALSE";
            const description = ""; // Optional description
            const location = ""; // Optional location
            const private = "TRUE"; // Or FALSE depending on preference

            // Ensure commas within fields are handled if necessary (though unlikely for these fields)
            // Basic CSV escaping isn't implemented here, assumes simple data.
             csvContent += `"${subject}",${startDate},${startTime},${endDate},${endTime},${allDayEvent},"${description}","${location}",${private}\n`;
        });

        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const filename = `shifts-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.csv`;
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up
    }


    // --- Utility Functions ---
    function isColorLight(hexColor) {
        // Basic heuristic to determine if a color is light or dark
        // Converts hex to RGB and calculates luminance
        try {
             const hex = hexColor.replace('#', '');
             const r = parseInt(hex.substring(0, 2), 16);
             const g = parseInt(hex.substring(2, 4), 16);
             const b = parseInt(hex.substring(4, 6), 16);
             // Formula for perceived luminance (adjust coefficients if needed)
             const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
             return luminance > 0.6; // Threshold can be adjusted (0.5 - 0.7 common)
        } catch (e) {
            return true; // Default to light if color parsing fails
        }
    }


    // --- Event Listeners Setup ---
    function addEventListeners() {
        monthPicker.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            currentYear = year;
            currentMonth = month - 1; // Back to 0-indexed
            renderCalendar(currentYear, currentMonth);
        });

        addShiftTypeBtn.addEventListener('click', openModal);
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => { // Close if clicking outside content
            if (event.target === modal) {
                closeModal();
            }
        });
        addShiftForm.addEventListener('submit', handleAddShiftType);

        exportCsvBtn.addEventListener('click', exportCSV);
    }

    // --- Load initial data and run ---
    loadShiftTypes(); // Load custom shift types before initial render
    initialize();

}); // End DOMContentLoaded
