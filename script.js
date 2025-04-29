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
    // Store shifts placed on the calendar: { "YYYY-MM-DD": { label, color, startTime, endTime }, ... }
    let scheduledShifts = {};
    // Store available shift types (templates)
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

        // Load data before rendering
        loadShiftTypes(); // Load custom/saved shift types first
        loadShiftsForMonth(currentYear, currentMonth); // Load shifts for the initial month view

        renderShiftTemplates(); // Now render templates based on loaded/default shiftTypes
        renderCalendar(currentYear, currentMonth); // Render calendar (will use loaded scheduledShifts)
        addEventListeners();
    }

    // --- Calendar Rendering ---
    function renderCalendar(year, month) {
        calendarDaysContainer.innerHTML = ''; // Clear previous calendar grid
        // Note: scheduledShifts for the *current view* should be loaded before calling renderCalendar
        // or loaded within if switching months (as done in the monthPicker listener)

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // Adjust getDay() to make Monday the first day (0 = Monday, 6 = Sunday)
        const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

        // Add empty cells for days before the 1st of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'outside-month');
            calendarDaysContainer.appendChild(emptyCell);
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day');
            // Store the full date string (YYYY-MM-DD) for easy reference
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayCell.dataset.date = dateStr;

            // Display the day number
            const dayNumber = document.createElement('div');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);

            // Add drag & drop listeners to allow dropping shifts onto the day
            dayCell.addEventListener('dragover', handleDragOver);
            dayCell.addEventListener('dragleave', handleDragLeave);
            dayCell.addEventListener('drop', handleDrop);

            // If a shift is already scheduled for this date, display it
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

    // --- Shift Template Rendering (with Delete Button) ---
    function renderShiftTemplates() {
        // Clear existing templates using the wrapper class
        shiftTemplatesContainer.querySelectorAll('.shift-template-wrapper').forEach(el => el.remove());

        // Handle case where no shift types are defined
        if (shiftTypes.length === 0) {
             const noShiftsMsg = document.createElement('p');
             noShiftsMsg.textContent = "No shift types defined.";
             noShiftsMsg.style.textAlign = 'center';
             noShiftsMsg.style.fontSize = '0.9em';
             noShiftsMsg.style.color = '#666';
             const wrapper = document.createElement('div'); // Keep structure consistent
             wrapper.classList.add('shift-template-wrapper');
             wrapper.appendChild(noShiftsMsg);
             shiftTemplatesContainer.appendChild(wrapper);
             return; // Stop rendering if no shifts
        }

        // Create and append each shift type template
        shiftTypes.forEach(shift => {
            const wrapper = document.createElement('div'); // Wrapper for template + button
            wrapper.classList.add('shift-template-wrapper');

            // The draggable shift template element
            const shiftDiv = document.createElement('div');
            shiftDiv.classList.add('shift-template');
            if (shift.cssClass) { // Apply predefined class if available
                 shiftDiv.classList.add(shift.cssClass);
            }
            shiftDiv.style.backgroundColor = shift.color; // Apply specific color
            shiftDiv.style.color = isColorLight(shift.color) ? '#333' : '#fff'; // Adjust text color

            shiftDiv.setAttribute('draggable', true);

            // Wrap text content in a span for styling/layout control
            const labelSpan = document.createElement('span');
            labelSpan.classList.add('label-text');
            labelSpan.textContent = `${shift.label} (${shift.startTime}-${shift.endTime})`;
            shiftDiv.appendChild(labelSpan);

            // Store shift data directly on the draggable element
            shiftDiv.dataset.label = shift.label;
            shiftDiv.dataset.color = shift.color;
            shiftDiv.dataset.startTime = shift.startTime;
            shiftDiv.dataset.endTime = shift.endTime;

            // Add drag start listener to the template
            shiftDiv.addEventListener('dragstart', handleDragStart);

            // --- Add Delete Button ---
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-shift-type-btn');
            deleteBtn.innerHTML = '&times;'; // Use HTML entity for 'x' symbol
            deleteBtn.setAttribute('aria-label', `Delete shift type ${shift.label}`);
            deleteBtn.title = `Delete shift type "${shift.label}"`; // Tooltip
            deleteBtn.dataset.label = shift.label; // Store label for easy access in handler
            // Add click listener to handle deletion
            deleteBtn.addEventListener('click', handleDeleteShiftType);

            shiftDiv.appendChild(deleteBtn); // Append button to the shift template div
            wrapper.appendChild(shiftDiv); // Append the template div to the wrapper
            shiftTemplatesContainer.appendChild(wrapper); // Append the wrapper to the main container
        });
    }

    // --- Handler for Deleting a Shift Type ---
    function handleDeleteShiftType(event) {
        // Prevent the click from triggering other events (like drag start)
        event.stopPropagation();

        const labelToDelete = event.target.dataset.label; // Get label from button's data attribute

        // Confirm with the user before deleting
        if (confirm(`Are you sure you want to delete the shift type "${labelToDelete}"?\nThis cannot be undone and will remove it from the list of available shifts.\n(Note: Shifts already placed on the calendar using this type will NOT be removed automatically).`)) {

            // Find the index of the shift type to delete in the array
            const indexToDelete = shiftTypes.findIndex(shift => shift.label === labelToDelete);

            if (indexToDelete > -1) { // Check if the shift type was found
                shiftTypes.splice(indexToDelete, 1); // Remove the item from the array
                saveShiftTypes(); // Persist the updated list to localStorage
                renderShiftTemplates(); // Re-render the templates list to reflect the deletion
            } else {
                // Log error if the shift type wasn't found (shouldn't normally happen)
                console.error("Error: Could not find shift type to delete:", labelToDelete);
                alert("An error occurred. Could not find the shift type to delete.");
            }
        }
    }


    // --- Drag and Drop Handlers ---
    function handleDragStart(event) {
        // Ensure the drag doesn't start if the click was on the delete button
        if (event.target.classList.contains('delete-shift-type-btn')) {
            event.preventDefault();
            return;
        }
        // Get the main shift template element, even if the drag started on the inner span
        const shiftElement = event.target.closest('.shift-template');
        if (!shiftElement) return; // Exit if we couldn't find the parent template

        // Prepare the data to be transferred
        const shiftData = {
            label: shiftElement.dataset.label,
            color: shiftElement.dataset.color,
            startTime: shiftElement.dataset.startTime,
            endTime: shiftElement.dataset.endTime
        };
        // Set the data payload and allowed effect
        event.dataTransfer.setData('application/json', JSON.stringify(shiftData));
        event.dataTransfer.effectAllowed = 'copy';
    }

    function handleDragOver(event) {
        event.preventDefault(); // Necessary to allow dropping
        event.dataTransfer.dropEffect = 'copy';
        // Add visual feedback to the drop target (the calendar day)
        event.currentTarget.classList.add('drag-over');
    }

    function handleDragLeave(event) {
        // Remove visual feedback when dragging leaves the drop target
        event.currentTarget.classList.remove('drag-over');
    }

     function handleDrop(event) {
        event.preventDefault(); // Prevent default browser handling (like opening link)
        event.currentTarget.classList.remove('drag-over'); // Remove highlight

        const targetCell = event.currentTarget; // The calendar day cell being dropped onto
        const dateStr = targetCell.dataset.date; // Get the date (YYYY-MM-DD)

        try {
            // Retrieve the shift data transferred during drag start
            const shiftData = JSON.parse(event.dataTransfer.getData('application/json'));

            // Store the shift in our state object
            scheduledShifts[dateStr] = shiftData;
            // Persist the change using localStorage
            saveShift(dateStr, shiftData);

            // Update the UI to show the dropped shift on the calendar
            displayShiftOnCalendar(targetCell, shiftData);

        } catch (e) {
            console.error("Error parsing dropped data or applying shift:", e);
            alert("An error occurred while adding the shift.");
        }
    }

    // --- Displaying Shifts on Calendar ---
    function displayShiftOnCalendar(dayCell, shiftData) {
        // Remove any previously displayed shift in this cell first
        const existingShift = dayCell.querySelector('.shift-on-calendar');
        if (existingShift) {
            existingShift.remove();
        }

        // If shiftData is null/undefined (e.g., after deleting), do nothing further
        if (!shiftData) return;

        // Create the div to represent the shift on the calendar
        const shiftDiv = document.createElement('div');
        shiftDiv.classList.add('shift-on-calendar');
        shiftDiv.textContent = `${shiftData.label} (${shiftData.startTime}-${shiftData.endTime})`;
        shiftDiv.style.backgroundColor = shiftData.color;
        shiftDiv.style.color = isColorLight(shiftData.color) ? '#333' : '#fff'; // Adjust text color
        shiftDiv.title = `Click to remove this shift`; // Tooltip

        // Add click listener to allow removing the shift from the calendar day
        shiftDiv.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering other listeners on the day cell
            if (confirm(`Remove ${shiftData.label} shift on ${dayCell.dataset.date}?`)) {
                 delete scheduledShifts[dayCell.dataset.date]; // Remove from state
                 deleteShift(dayCell.dataset.date); // Remove from persistence (localStorage)
                 shiftDiv.remove(); // Remove the element from the DOM
            }
        });

        dayCell.appendChild(shiftDiv); // Add the shift element to the day cell
    }


    // --- Modal Handling ---
    function openModal() {
        addShiftForm.reset(); // Clear any previous input
        modal.style.display = 'block'; // Show the modal
        shiftLabelInput.focus(); // Focus the first input field
    }

    function closeModal() {
        modal.style.display = 'none'; // Hide the modal
    }

    // Handle the submission of the "Add New Shift Type" form
    function handleAddShiftType(event) {
        event.preventDefault(); // Prevent default form submission (page reload)

        // Create a new shift type object from form values
        const newShift = {
            label: shiftLabelInput.value.trim(),
            startTime: shiftStartTimeInput.value,
            endTime: shiftEndTimeInput.value,
            color: shiftColorInput.value,
            cssClass: '' // Custom shifts don't get a predefined CSS class
        };

        // Basic validation
        if (!newShift.label || !newShift.startTime || !newShift.endTime) {
            alert("Please fill in Label, Start Time, and End Time.");
            return;
        }

        // Check if a shift type with the same label already exists (case-insensitive)
        if (shiftTypes.some(st => st.label.toLowerCase() === newShift.label.toLowerCase())) {
            alert(`A shift type with the label "${newShift.label}" already exists.`);
            return;
        }

        // Add the new shift type to the array
        shiftTypes.push(newShift);
        saveShiftTypes(); // Persist the updated list
        renderShiftTemplates(); // Re-render the list to include the new one
        closeModal(); // Close the modal pop-up
    }

    // --- Data Persistence (using LocalStorage) ---
    const SHIFTS_STORAGE_KEY_PREFIX = 'scheduledShifts_'; // Prefix for monthly shift data
    const SHIFT_TYPES_STORAGE_KEY = 'shiftTypes'; // Key for the list of available shift types

    // Helper to get the specific localStorage key for a given month's shifts
    function getStorageKeyForMonth(year, month) {
        // Use YYYY-MM format for the key
        return `${SHIFTS_STORAGE_KEY_PREFIX}${year}-${String(month + 1).padStart(2, '0')}`;
    }

    // Save a single shift placed on the calendar for a specific date
    function saveShift(dateStr, shiftData) {
        const [year, monthStr] = dateStr.split('-'); // Extract year and month from YYYY-MM-DD
        const month = parseInt(monthStr, 10) - 1; // Convert month back to 0-indexed
        const storageKey = getStorageKeyForMonth(year, month);
        // Load existing shifts for the month, or start with an empty object
        let monthShifts = JSON.parse(localStorage.getItem(storageKey) || '{}');
        // Add or update the shift for the specific date
        monthShifts[dateStr] = shiftData;
        // Save the updated month's shifts back to localStorage
        localStorage.setItem(storageKey, JSON.stringify(monthShifts));
    }

     // Remove a shift from the calendar for a specific date
     function deleteShift(dateStr) {
        const [year, monthStr] = dateStr.split('-');
        const month = parseInt(monthStr, 10) - 1;
        const storageKey = getStorageKeyForMonth(year, month);
        let monthShifts = JSON.parse(localStorage.getItem(storageKey) || '{}');
        // Delete the property corresponding to the date
        delete monthShifts[dateStr];
        // Save the modified object back
        localStorage.setItem(storageKey, JSON.stringify(monthShifts));
    }

    // Load all scheduled shifts for a given month from localStorage
    function loadShiftsForMonth(year, month) {
        const storageKey = getStorageKeyForMonth(year, month);
        // Update the global scheduledShifts state for the current view
        scheduledShifts = JSON.parse(localStorage.getItem(storageKey) || '{}');
        // Note: This function now directly updates the global `scheduledShifts`
        // It's called when the app initializes and when the month changes.
    }

    // Save the entire list of available shift types (templates) to localStorage
    function saveShiftTypes() {
         localStorage.setItem(SHIFT_TYPES_STORAGE_KEY, JSON.stringify(shiftTypes));
    }

    // Load the list of available shift types from localStorage
    function loadShiftTypes() {
        const storedTypes = localStorage.getItem(SHIFT_TYPES_STORAGE_KEY);
        if (storedTypes) {
            try {
                const parsedTypes = JSON.parse(storedTypes);
                // Basic validation: check if it's an array
                if (Array.isArray(parsedTypes)) {
                     shiftTypes = parsedTypes;
                } else {
                    console.warn("Stored shift types data is not an array. Using defaults.");
                    // Keep default shiftTypes if stored data is invalid
                }
            } catch (e) {
                console.error("Error parsing stored shift types. Using defaults.", e);
                // Keep default shiftTypes if parsing fails
            }
        }
        // If nothing was stored, the initial default `shiftTypes` array will be used.
    }


    // --- CSV Export ---
    function exportCSV() {
        // Define CSV header according to Google Calendar format
        const header = "Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description,Location,Private\n";
        let csvContent = header;

        // Use the currently loaded `scheduledShifts` which correspond to the displayed month
        const shiftsToExport = Object.entries(scheduledShifts);

        if (shiftsToExport.length === 0) {
            alert(`No shifts scheduled for ${monthPicker.value} to export.`);
            return;
        }

        shiftsToExport.forEach(([dateStr, shiftData]) => {
            // Format date as MM/DD/YYYY for Google Calendar
            const [year, month, day] = dateStr.split('-');
            const startDate = `${month}/${day}/${year}`;
            let endDate = startDate; // Assume shift ends on the same day by default

            // Check for overnight shifts (where end time is earlier than start time)
             if (shiftData.endTime < shiftData.startTime) {
                 // Create a date object, add one day, and format the end date
                 const nextDay = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                 nextDay.setDate(nextDay.getDate() + 1);
                 endDate = `${String(nextDay.getMonth() + 1).padStart(2, '0')}/${String(nextDay.getDate()).padStart(2, '0')}/${nextDay.getFullYear()}`;
            }

            // Use HH:MM format (assuming the time inputs provide this)
             const startTime = shiftData.startTime;
             const endTime = shiftData.endTime;

            const subject = shiftData.label; // Shift label as the event title
            const allDayEvent = "FALSE"; // Shifts have specific times
            const description = ""; // Optional: Add more details if needed
            const location = ""; // Optional: Add location if relevant
            const private = "TRUE"; // Mark events as private by default

            // Append row to CSV content, ensuring fields are quoted if they contain commas (though unlikely here)
             csvContent += `"${subject}",${startDate},${startTime},${endDate},${endTime},${allDayEvent},"${description}","${location}",${private}\n`;
        });

        // Create a Blob object containing the CSV data
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        // Create a temporary link element to trigger the download
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        // Set the filename for the downloaded file
        const filename = `shifts-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.csv`;
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden'; // Hide the link
        document.body.appendChild(link); // Add link to the DOM
        link.click(); // Programmatically click the link to start download
        document.body.removeChild(link); // Remove the link from the DOM
        URL.revokeObjectURL(url); // Release the object URL resource
    }


    // --- Utility Functions ---
    // Basic heuristic to determine if a hex color is light or dark
    // Used to set contrasting text color (white/black) on shifts
    function isColorLight(hexColor) {
        try {
             // Remove '#' if present
             const hex = hexColor.replace('#', '');
             // Convert hex components to RGB integers
             const r = parseInt(hex.substring(0, 2), 16);
             const g = parseInt(hex.substring(2, 4), 16);
             const b = parseInt(hex.substring(4, 6), 16);
             // Calculate perceived luminance using a standard formula
             const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
             // Return true if luminance is above the threshold (considered light)
             return luminance > 0.6; // Threshold can be adjusted (0.5-0.7 are common)
        } catch (e) {
            console.warn("Could not determine color brightness for:", hexColor, e);
            return true; // Default to assuming light background if parsing fails
        }
    }


    // --- Event Listeners Setup ---
    function addEventListeners() {
        // Listener for the month picker input
        monthPicker.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            currentYear = year;
            currentMonth = month - 1; // Convert month back to 0-indexed for Date objects
            loadShiftsForMonth(currentYear, currentMonth); // Load shifts for the newly selected month
            renderCalendar(currentYear, currentMonth); // Re-render the calendar grid
        });

        // Listener for the "Add New Shift Type" button
        addShiftTypeBtn.addEventListener('click', openModal);
        // Listener for the close button (X) inside the modal
        closeModalBtn.addEventListener('click', closeModal);
        // Listener to close the modal if the user clicks outside the modal content area
        modal.addEventListener('click', (event) => {
            if (event.target === modal) { // Check if the click was directly on the modal background
                closeModal();
            }
        });
        // Listener for the form submission within the modal
        addShiftForm.addEventListener('submit', handleAddShiftType);

        // Listener for the "Export to CSV" button
        exportCsvBtn.addEventListener('click', exportCSV);
    }

    // --- Load initial data and run ---
    initialize(); // Start the application

}); // End DOMContentLoaded wrapper
