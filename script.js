document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const monthPicker = document.getElementById('month-picker');
    const calendarDaysContainer = document.getElementById('calendar-days');
    const shiftTemplatesContainer = document.getElementById('shift-templates');
    const addShiftTypeBtn = document.getElementById('add-shift-type-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportIcalBtn = document.getElementById('export-ical-btn'); // Get the new iCal button
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

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0=Monday

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
            dayCell.dataset.date = dateStr;

            const dayNumber = document.createElement('div');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);

            dayCell.addEventListener('dragover', handleDragOver);
            dayCell.addEventListener('dragleave', handleDragLeave);
            dayCell.addEventListener('drop', handleDrop);

            if (scheduledShifts[dateStr]) {
                displayShiftOnCalendar(dayCell, scheduledShifts[dateStr]);
            }

            calendarDaysContainer.appendChild(dayCell);
        }

         // Add empty cells to fill the last row
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
        shiftTemplatesContainer.querySelectorAll('.shift-template-wrapper').forEach(el => el.remove());

        if (shiftTypes.length === 0) {
             const noShiftsMsg = document.createElement('p');
             noShiftsMsg.textContent = "No shift types defined.";
             noShiftsMsg.style.textAlign = 'center';
             noShiftsMsg.style.fontSize = '0.9em';
             noShiftsMsg.style.color = '#666';
             const wrapper = document.createElement('div');
             wrapper.classList.add('shift-template-wrapper');
             wrapper.appendChild(noShiftsMsg);
             shiftTemplatesContainer.appendChild(wrapper);
             return;
        }

        shiftTypes.forEach(shift => {
            const wrapper = document.createElement('div');
            wrapper.classList.add('shift-template-wrapper');

            const shiftDiv = document.createElement('div');
            shiftDiv.classList.add('shift-template');
            if (shift.cssClass) {
                 shiftDiv.classList.add(shift.cssClass);
            }
            shiftDiv.style.backgroundColor = shift.color;
            shiftDiv.style.color = isColorLight(shift.color) ? '#333' : '#fff';

            shiftDiv.setAttribute('draggable', true);

            const labelSpan = document.createElement('span');
            labelSpan.classList.add('label-text');
            labelSpan.textContent = `${shift.label} (${shift.startTime}-${shift.endTime})`;
            shiftDiv.appendChild(labelSpan);

            shiftDiv.dataset.label = shift.label;
            shiftDiv.dataset.color = shift.color;
            shiftDiv.dataset.startTime = shift.startTime;
            shiftDiv.dataset.endTime = shift.endTime;

            shiftDiv.addEventListener('dragstart', handleDragStart);

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-shift-type-btn');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.setAttribute('aria-label', `Delete shift type ${shift.label}`);
            deleteBtn.title = `Delete shift type "${shift.label}"`;
            deleteBtn.dataset.label = shift.label;
            deleteBtn.addEventListener('click', handleDeleteShiftType);

            shiftDiv.appendChild(deleteBtn);
            wrapper.appendChild(shiftDiv);
            shiftTemplatesContainer.appendChild(wrapper);
        });
    }

    // --- Handler for Deleting a Shift Type ---
    function handleDeleteShiftType(event) {
        event.stopPropagation();
        const labelToDelete = event.target.dataset.label;

        if (confirm(`Are you sure you want to delete the shift type "${labelToDelete}"?\nThis cannot be undone and will remove it from the list of available shifts.\n(Note: Shifts already placed on the calendar using this type will NOT be removed automatically).`)) {
            const indexToDelete = shiftTypes.findIndex(shift => shift.label === labelToDelete);
            if (indexToDelete > -1) {
                shiftTypes.splice(indexToDelete, 1);
                saveShiftTypes();
                renderShiftTemplates();
            } else {
                console.error("Error: Could not find shift type to delete:", labelToDelete);
                alert("An error occurred. Could not find the shift type to delete.");
            }
        }
    }

    // --- Drag and Drop Handlers ---
    function handleDragStart(event) {
        if (event.target.classList.contains('delete-shift-type-btn')) {
            event.preventDefault();
            return;
        }
        const shiftElement = event.target.closest('.shift-template');
        if (!shiftElement) return;

        const shiftData = {
            label: shiftElement.dataset.label,
            color: shiftElement.dataset.color,
            startTime: shiftElement.dataset.startTime,
            endTime: shiftElement.dataset.endTime
        };
        event.dataTransfer.setData('application/json', JSON.stringify(shiftData));
        event.dataTransfer.effectAllowed = 'copy';
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        event.currentTarget.classList.add('drag-over');
    }

    function handleDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    }

     function handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        const targetCell = event.currentTarget;
        const dateStr = targetCell.dataset.date;

        try {
            const shiftData = JSON.parse(event.dataTransfer.getData('application/json'));
            scheduledShifts[dateStr] = shiftData;
            saveShift(dateStr, shiftData);
            displayShiftOnCalendar(targetCell, shiftData);
        } catch (e) {
            console.error("Error parsing dropped data or applying shift:", e);
            alert("An error occurred while adding the shift.");
        }
    }

    // --- Displaying Shifts on Calendar ---
    function displayShiftOnCalendar(dayCell, shiftData) {
        const existingShift = dayCell.querySelector('.shift-on-calendar');
        if (existingShift) {
            existingShift.remove();
        }
        if (!shiftData) return;

        const shiftDiv = document.createElement('div');
        shiftDiv.classList.add('shift-on-calendar');
        shiftDiv.textContent = `${shiftData.label} (${shiftData.startTime}-${shiftData.endTime})`;
        shiftDiv.style.backgroundColor = shiftData.color;
        shiftDiv.style.color = isColorLight(shiftData.color) ? '#333' : '#fff';
        shiftDiv.title = `Click to remove this shift`;

        shiftDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Remove ${shiftData.label} shift on ${dayCell.dataset.date}?`)) {
                 delete scheduledShifts[dayCell.dataset.date];
                 deleteShift(dayCell.dataset.date);
                 shiftDiv.remove();
            }
        });
        dayCell.appendChild(shiftDiv);
    }

    // --- Modal Handling ---
    function openModal() {
        addShiftForm.reset();
        modal.style.display = 'block';
        shiftLabelInput.focus();
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    function handleAddShiftType(event) {
        event.preventDefault();
        const newShift = {
            label: shiftLabelInput.value.trim(),
            startTime: shiftStartTimeInput.value,
            endTime: shiftEndTimeInput.value,
            color: shiftColorInput.value,
            cssClass: ''
        };

        if (!newShift.label || !newShift.startTime || !newShift.endTime) {
            alert("Please fill in Label, Start Time, and End Time.");
            return;
        }
        if (shiftTypes.some(st => st.label.toLowerCase() === newShift.label.toLowerCase())) {
            alert(`A shift type with the label "${newShift.label}" already exists.`);
            return;
        }

        shiftTypes.push(newShift);
        saveShiftTypes();
        renderShiftTemplates();
        closeModal();
    }

    // --- Data Persistence (using LocalStorage) ---
    const SHIFTS_STORAGE_KEY_PREFIX = 'scheduledShifts_';
    const SHIFT_TYPES_STORAGE_KEY = 'shiftTypes';

    function getStorageKeyForMonth(year, month) {
        return `${SHIFTS_STORAGE_KEY_PREFIX}${year}-${String(month + 1).padStart(2, '0')}`;
    }

    function saveShift(dateStr, shiftData) {
        const [year, monthStr] = dateStr.split('-');
        const month = parseInt(monthStr, 10) - 1;
        const storageKey = getStorageKeyForMonth(year, month);
        let monthShifts = JSON.parse(localStorage.getItem(storageKey) || '{}');
        monthShifts[dateStr] = shiftData;
        localStorage.setItem(storageKey, JSON.stringify(monthShifts));
    }

     function deleteShift(dateStr) {
        const [year, monthStr] = dateStr.split('-');
        const month = parseInt(monthStr, 10) - 1;
        const storageKey = getStorageKeyForMonth(year, month);
        let monthShifts = JSON.parse(localStorage.getItem(storageKey) || '{}');
        delete monthShifts[dateStr];
        localStorage.setItem(storageKey, JSON.stringify(monthShifts));
    }

    function loadShiftsForMonth(year, month) {
        const storageKey = getStorageKeyForMonth(year, month);
        scheduledShifts = JSON.parse(localStorage.getItem(storageKey) || '{}');
    }

    function saveShiftTypes() {
         localStorage.setItem(SHIFT_TYPES_STORAGE_KEY, JSON.stringify(shiftTypes));
    }

    function loadShiftTypes() {
        const storedTypes = localStorage.getItem(SHIFT_TYPES_STORAGE_KEY);
        if (storedTypes) {
            try {
                const parsedTypes = JSON.parse(storedTypes);
                if (Array.isArray(parsedTypes)) {
                     shiftTypes = parsedTypes;
                } else {
                    console.warn("Stored shift types data is not an array. Using defaults.");
                }
            } catch (e) {
                console.error("Error parsing stored shift types. Using defaults.", e);
            }
        }
    }

    // --- CSV Export ---
    function exportCSV() {
        const header = "Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description,Location,Private\n";
        let csvContent = header;
        const shiftsToExport = Object.entries(scheduledShifts);

        if (shiftsToExport.length === 0) {
            alert(`No shifts scheduled for ${monthPicker.value} to export.`);
            return;
        }

        shiftsToExport.forEach(([dateStr, shiftData]) => {
            const [year, month, day] = dateStr.split('-');
            const startDate = `${month}/${day}/${year}`;
            let endDate = startDate;

             if (shiftData.endTime < shiftData.startTime) {
                 const nextDay = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                 nextDay.setDate(nextDay.getDate() + 1);
                 endDate = `${String(nextDay.getMonth() + 1).padStart(2, '0')}/${String(nextDay.getDate()).padStart(2, '0')}/${nextDay.getFullYear()}`;
            }

             const startTime = shiftData.startTime;
             const endTime = shiftData.endTime;
             const subject = shiftData.label;
             const allDayEvent = "FALSE";
             const description = "";
             const location = "";
             const private = "TRUE";

             csvContent += `"${subject}",${startDate},${startTime},${endDate},${endTime},${allDayEvent},"${description}","${location}",${private}\n`;
        });

        downloadFile(csvContent, `shifts-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.csv`, 'text/csv;charset=utf-8;');
    }

    // --- NEW: iCal Export ---
    function exportICal() {
        const shiftsToExport = Object.entries(scheduledShifts);

        if (shiftsToExport.length === 0) {
            alert(`No shifts scheduled for ${monthPicker.value} to export.`);
            return;
        }

        // iCal header
        let icalContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Your Company//Your Product//EN', // Replace with your details
            'CALSCALE:GREGORIAN'
        ];

        // Function to format date/time for iCal (YYYYMMDDTHHMMSSZ - UTC)
        // Note: This assumes times are local and converts them to UTC for simplicity.
        // Proper timezone handling (TZID) is more complex.
        function formatICalDateTime(dateStr, timeStr) {
            const [year, month, day] = dateStr.split('-');
            const [hour, minute] = timeStr.split(':');
            // Create date object assuming local time, then get UTC components
            const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
            const yyyy = date.getUTCFullYear();
            const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(date.getUTCDate()).padStart(2, '0');
            const hh = String(date.getUTCHours()).padStart(2, '0');
            const mi = String(date.getUTCMinutes()).padStart(2, '0');
            const ss = String(date.getUTCSeconds()).padStart(2, '0');
            return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
        }

        // Function to format just date for iCal (YYYYMMDD) - not used here as shifts have times
        // function formatICalDate(dateStr) {
        //     return dateStr.replace(/-/g, '');
        // }

        const now = new Date();
        const dtStamp = formatICalDateTime(
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
            `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        ); // Timestamp for when the file was created

        shiftsToExport.forEach(([dateStr, shiftData], index) => {
            const [year, month, day] = dateStr.split('-').map(Number);
            const startTime = shiftData.startTime;
            const endTime = shiftData.endTime;
            let endDateStr = dateStr;

            // Handle overnight shifts for end date
            if (endTime < startTime) {
                const nextDay = new Date(year, month - 1, day);
                nextDay.setDate(nextDay.getDate() + 1);
                endDateStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
            }

            const dtStart = formatICalDateTime(dateStr, startTime);
            const dtEnd = formatICalDateTime(endDateStr, endTime);
            const uid = `shift-${dateStr}-${startTime.replace(':', '')}-${index}@yourdomain.com`; // Generate a unique ID

            // Add VEVENT block for each shift
            icalContent.push(
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${dtStamp}`,
                `DTSTART:${dtStart}`,
                `DTEND:${dtEnd}`,
                `SUMMARY:${shiftData.label}`, // Use shift label as summary/title
                // Optional: Add description, location etc.
                // `DESCRIPTION:Details about the ${shiftData.label} shift.`,
                // `LOCATION:Workplace`,
                'END:VEVENT'
            );
        });

        // iCal footer
        icalContent.push('END:VCALENDAR');

        // Join lines and trigger download
        downloadFile(icalContent.join('\r\n'), `shifts-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.ics`, 'text/calendar;charset=utf-8;');
    }


    // --- Utility Functions ---
    function isColorLight(hexColor) {
        try {
             const hex = hexColor.replace('#', '');
             const r = parseInt(hex.substring(0, 2), 16);
             const g = parseInt(hex.substring(2, 4), 16);
             const b = parseInt(hex.substring(4, 6), 16);
             const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
             return luminance > 0.6;
        } catch (e) {
            console.warn("Could not determine color brightness for:", hexColor, e);
            return true;
        }
    }

    // --- NEW: Generic File Download Function ---
    function downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up
    }


    // --- Event Listeners Setup ---
    function addEventListeners() {
        monthPicker.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            currentYear = year;
            currentMonth = month - 1;
            loadShiftsForMonth(currentYear, currentMonth);
            renderCalendar(currentYear, currentMonth);
        });

        addShiftTypeBtn.addEventListener('click', openModal);
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
        addShiftForm.addEventListener('submit', handleAddShiftType);

        exportCsvBtn.addEventListener('click', exportCSV);
        exportIcalBtn.addEventListener('click', exportICal); // Add listener for the iCal button
    }

    // --- Load initial data and run ---
    initialize(); // Start the application

}); // End DOMContentLoaded wrapper
