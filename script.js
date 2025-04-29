document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const monthPicker = document.getElementById('month-picker');
    const calendarDaysContainer = document.getElementById('calendar-days');
    const shiftTemplatesContainer = document.getElementById('shift-templates');
    const addShiftTypeBtn = document.getElementById('add-shift-type-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportIcalBtn = document.getElementById('export-ical-btn');
    const modal = document.getElementById('add-shift-modal');
    const modalTitle = document.getElementById('modal-title'); // Get modal title element
    const closeModalBtn = modal.querySelector('.close-btn');
    const addShiftForm = document.getElementById('add-shift-form');
    const shiftLabelInput = document.getElementById('shift-label');
    const shiftStartTimeInput = document.getElementById('shift-start-time');
    const shiftEndTimeInput = document.getElementById('shift-end-time');
    const shiftColorInput = document.getElementById('shift-color');
    const modalSubmitButton = addShiftForm.querySelector('button[type="submit"]'); // Get submit button

    // --- State ---
    let currentYear, currentMonth;
    let scheduledShifts = {};
    let shiftTypes = [
        { label: "Day", color: "#add8e6", startTime: "08:00", endTime: "16:00", cssClass: "shift-day" },
        { label: "Night", color: "#4682b4", startTime: "20:00", endTime: "04:00", cssClass: "shift-night" },
        { label: "Back", color: "#90ee90", startTime: "12:00", endTime: "20:00", cssClass: "shift-back" }
    ];
    let selectedShiftData = null;
    // --- NEW: State for tracking edit mode ---
    let editingShiftLabel = null; // Stores the label of the shift being edited, or null if adding

    // --- Initialization ---
    function initialize() {
        const today = new Date();
        currentYear = today.getFullYear();
        currentMonth = today.getMonth();
        monthPicker.value = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        loadShiftTypes();
        loadShiftsForMonth(currentYear, currentMonth);
        renderShiftTemplates();
        renderCalendar(currentYear, currentMonth);
        addEventListeners();
    }

    // --- Calendar Rendering (Unchanged) ---
    function renderCalendar(year, month) {
        calendarDaysContainer.innerHTML = '';
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

        for (let i = 0; i < startDayOfWeek; i++) { /* ... add empty cells ... */
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'outside-month');
            calendarDaysContainer.appendChild(emptyCell);
        }
        for (let day = 1; day <= daysInMonth; day++) { /* ... add day cells ... */
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
            dayCell.addEventListener('click', handleDayClick); // For click-to-add
            if (scheduledShifts[dateStr]) {
                displayShiftOnCalendar(dayCell, scheduledShifts[dateStr]);
            }
            calendarDaysContainer.appendChild(dayCell);
        }
        const totalCells = startDayOfWeek + daysInMonth; /* ... add trailing empty cells ... */
        const remainingCells = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < remainingCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'outside-month');
            calendarDaysContainer.appendChild(emptyCell);
        }
    }

    // --- Shift Template Rendering (with Edit Button) ---
    function renderShiftTemplates() {
        shiftTemplatesContainer.querySelectorAll('.shift-template-wrapper').forEach(el => el.remove());

        if (shiftTypes.length === 0) { /* ... display 'no shifts' message ... */
             const noShiftsMsg = document.createElement('p'); noShiftsMsg.textContent = "No shift types defined.";
             noShiftsMsg.style.textAlign = 'center'; noShiftsMsg.style.fontSize = '0.9em'; noShiftsMsg.style.color = '#666';
             const wrapper = document.createElement('div'); wrapper.classList.add('shift-template-wrapper');
             wrapper.appendChild(noShiftsMsg); shiftTemplatesContainer.appendChild(wrapper); return;
        }

        shiftTypes.forEach(shift => {
            const wrapper = document.createElement('div');
            wrapper.classList.add('shift-template-wrapper');
            const shiftDiv = document.createElement('div');
            shiftDiv.classList.add('shift-template');
            if (shift.cssClass) { shiftDiv.classList.add(shift.cssClass); }
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
            shiftDiv.addEventListener('click', handleTemplateClick); // For selection

            // --- Add Edit Button ---
            const editBtn = document.createElement('button');
            editBtn.classList.add('edit-shift-type-btn');
            editBtn.innerHTML = 'E'; // Simple 'E', use icon font/SVG for better UI
            editBtn.setAttribute('aria-label', `Edit shift type ${shift.label}`);
            editBtn.title = `Edit shift type "${shift.label}"`;
            editBtn.dataset.label = shift.label; // Store label for easy access
            editBtn.addEventListener('click', handleEditShiftType); // Add listener

            // --- Add Delete Button ---
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-shift-type-btn');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.setAttribute('aria-label', `Delete shift type ${shift.label}`);
            deleteBtn.title = `Delete shift type "${shift.label}"`;
            deleteBtn.dataset.label = shift.label;
            deleteBtn.addEventListener('click', handleDeleteShiftType);

            // Append buttons (Edit first, then Delete)
            shiftDiv.appendChild(editBtn);
            shiftDiv.appendChild(deleteBtn);

            wrapper.appendChild(shiftDiv);
            shiftTemplatesContainer.appendChild(wrapper);

            // Apply selected style if necessary
            if (selectedShiftData && selectedShiftData.label === shift.label) {
                shiftDiv.classList.add('selected-shift-template');
            }
        });
    }

    // --- Handler for Clicking a Shift Template (Selection - Unchanged) ---
    function handleTemplateClick(event) {
        // Don't select if edit or delete button was clicked
        if (event.target.classList.contains('delete-shift-type-btn') || event.target.classList.contains('edit-shift-type-btn')) {
            return;
        }
        const clickedTemplateDiv = event.currentTarget;
        const clickedShift = { /* ... get data ... */
            label: clickedTemplateDiv.dataset.label, color: clickedTemplateDiv.dataset.color,
            startTime: clickedTemplateDiv.dataset.startTime, endTime: clickedTemplateDiv.dataset.endTime
        };
        if (selectedShiftData && selectedShiftData.label === clickedShift.label) { /* ... deselect ... */
            selectedShiftData = null; clickedTemplateDiv.classList.remove('selected-shift-template');
        } else { /* ... select ... */
            const currentlySelected = shiftTemplatesContainer.querySelector('.selected-shift-template');
            if (currentlySelected) { currentlySelected.classList.remove('selected-shift-template'); }
            selectedShiftData = clickedShift; clickedTemplateDiv.classList.add('selected-shift-template');
        }
        console.log("Selected Shift Data:", selectedShiftData);
    }

    // --- Handler for Clicking a Calendar Day (Placement - Unchanged) ---
    function handleDayClick(event) {
        if (selectedShiftData && !event.target.closest('.shift-on-calendar')) {
            const targetCell = event.currentTarget;
            const dateStr = targetCell.dataset.date;
            console.log(`Placing shift ${selectedShiftData.label} on ${dateStr}`);
            scheduledShifts[dateStr] = { ...selectedShiftData };
            saveShift(dateStr, scheduledShifts[dateStr]);
            displayShiftOnCalendar(targetCell, scheduledShifts[dateStr]);
            // Optional deselect after placement logic remains commented out
        }
    }

    // --- NEW: Handler for Clicking the Edit Shift Type Button ---
    function handleEditShiftType(event) {
        event.stopPropagation(); // Prevent template selection click
        const labelToEdit = event.target.dataset.label;
        const shiftToEdit = shiftTypes.find(shift => shift.label === labelToEdit);

        if (shiftToEdit) {
            editingShiftLabel = labelToEdit; // Set edit mode state

            // Populate the modal form
            shiftLabelInput.value = shiftToEdit.label;
            shiftStartTimeInput.value = shiftToEdit.startTime;
            shiftEndTimeInput.value = shiftToEdit.endTime;
            shiftColorInput.value = shiftToEdit.color;

            // Update modal appearance for editing
            modalTitle.textContent = "Edit Shift Type";
            modalSubmitButton.textContent = "Update Shift Type";
            shiftLabelInput.disabled = true; // Disable label editing (optional, prevents changing the key easily)

            openModal(); // Open the pre-filled modal
        } else {
            console.error("Could not find shift type to edit:", labelToEdit);
            alert("Error: Could not find the shift type to edit.");
        }
    }


    // --- Handler for Deleting a Shift Type (Unchanged logic, added stopPropagation) ---
    function handleDeleteShiftType(event) {
        event.stopPropagation(); // Prevent template selection click
        const labelToDelete = event.target.dataset.label;
        if (confirm(`Are you sure you want to delete the shift type "${labelToDelete}"? ...`)) {
            const indexToDelete = shiftTypes.findIndex(shift => shift.label === labelToDelete);
            if (indexToDelete > -1) {
                if (selectedShiftData && selectedShiftData.label === labelToDelete) { selectedShiftData = null; }
                shiftTypes.splice(indexToDelete, 1);
                saveShiftTypes();
                renderShiftTemplates();
            } else { /* ... error handling ... */
                console.error("Error: Could not find shift type to delete:", labelToDelete);
                alert("An error occurred. Could not find the shift type to delete.");
            }
        }
    }

    // --- Drag and Drop Handlers (Deselect on drag start - Unchanged) ---
    function handleDragStart(event) { /* ... */
        if (event.target.classList.contains('delete-shift-type-btn') || event.target.classList.contains('edit-shift-type-btn')) {
             event.preventDefault(); return;
        }
        const shiftElement = event.target.closest('.shift-template');
        if (!shiftElement) return;
        if (selectedShiftData) { /* ... deselect ... */
             const currentlySelected = shiftTemplatesContainer.querySelector('.selected-shift-template');
             if (currentlySelected) { currentlySelected.classList.remove('selected-shift-template'); }
             selectedShiftData = null;
        }
        const shiftData = { /* ... get data ... */
            label: shiftElement.dataset.label, color: shiftElement.dataset.color,
            startTime: shiftElement.dataset.startTime, endTime: shiftElement.dataset.endTime
        };
        event.dataTransfer.setData('application/json', JSON.stringify(shiftData));
        event.dataTransfer.effectAllowed = 'copy';
    }
    function handleDragOver(event) { /* ... */
        event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; event.currentTarget.classList.add('drag-over');
    }
    function handleDragLeave(event) { /* ... */
        event.currentTarget.classList.remove('drag-over');
    }
    function handleDrop(event) { /* ... */
        event.preventDefault(); event.currentTarget.classList.remove('drag-over');
        const targetCell = event.currentTarget; const dateStr = targetCell.dataset.date;
        try { /* ... place shift ... */
            const shiftData = JSON.parse(event.dataTransfer.getData('application/json'));
            scheduledShifts[dateStr] = shiftData; saveShift(dateStr, shiftData);
            displayShiftOnCalendar(targetCell, shiftData);
        } catch (e) { console.error("Error parsing dropped data or applying shift:", e); alert("An error occurred while adding the shift."); }
    }

    // --- Displaying Shifts on Calendar (Unchanged) ---
    function displayShiftOnCalendar(dayCell, shiftData) { /* ... */
        const existingShift = dayCell.querySelector('.shift-on-calendar');
        if (existingShift) { existingShift.remove(); } if (!shiftData) return;
        const shiftDiv = document.createElement('div'); shiftDiv.classList.add('shift-on-calendar');
        shiftDiv.textContent = `${shiftData.label} (${shiftData.startTime}-${shiftData.endTime})`;
        shiftDiv.style.backgroundColor = shiftData.color; shiftDiv.style.color = isColorLight(shiftData.color) ? '#333' : '#fff';
        shiftDiv.title = `Click to remove this shift`;
        shiftDiv.addEventListener('click', (e) => { /* ... remove logic ... */
            e.stopPropagation();
            if (confirm(`Remove ${shiftData.label} shift on ${dayCell.dataset.date}?`)) {
                 delete scheduledShifts[dayCell.dataset.date]; deleteShift(dayCell.dataset.date); shiftDiv.remove();
            }
        });
        dayCell.appendChild(shiftDiv);
    }

    // --- Modal Handling (Updated open/close/save) ---
    function openModal() {
        // Reset to 'Add' mode defaults IF NOT triggered by edit button
        if (!editingShiftLabel) {
            addShiftForm.reset(); // Clear form only when adding
            modalTitle.textContent = "Add New Shift Type";
            modalSubmitButton.textContent = "Save Shift Type";
            shiftLabelInput.disabled = false; // Ensure label input is enabled for adding
        }
        modal.style.display = 'block';
        // Focus the first editable field (start time if editing label is disabled)
        if (editingShiftLabel) {
            shiftStartTimeInput.focus();
        } else {
            shiftLabelInput.focus();
        }
    }

    function closeModal() {
        modal.style.display = 'none';
        // Reset edit state when closing modal
        editingShiftLabel = null;
        modalTitle.textContent = "Add New Shift Type"; // Reset title
        modalSubmitButton.textContent = "Save Shift Type"; // Reset button text
        shiftLabelInput.disabled = false; // Re-enable label input
        addShiftForm.reset(); // Clear form fields on close
    }

    // Renamed function to handle both Add and Update
    function handleSaveShiftType(event) {
        event.preventDefault();

        // Get values from form
        const label = shiftLabelInput.value.trim(); // Label is read even if disabled for finding item
        const startTime = shiftStartTimeInput.value;
        const endTime = shiftEndTimeInput.value;
        const color = shiftColorInput.value;

        // Basic validation
        if (!label || !startTime || !endTime) {
            alert("Please fill in Label, Start Time, and End Time.");
            return;
        }

        if (editingShiftLabel) {
            // --- UPDATE existing shift ---
            const indexToUpdate = shiftTypes.findIndex(shift => shift.label === editingShiftLabel); // Find by original label
            if (indexToUpdate > -1) {
                // Update the properties of the existing shift object
                shiftTypes[indexToUpdate].startTime = startTime;
                shiftTypes[indexToUpdate].endTime = endTime;
                shiftTypes[indexToUpdate].color = color;
                // Note: Label is not updated as input was disabled. If label editing is allowed,
                // you'd need more complex logic to check for duplicate labels again.
                // shiftTypes[indexToUpdate].label = label; // If label editing was enabled
            } else {
                alert("Error: Could not find the shift to update.");
                closeModal(); // Close modal on error
                return;
            }
            console.log("Updated shift:", editingShiftLabel);

        } else {
            // --- ADD new shift ---
            // Check for duplicate label before adding
            if (shiftTypes.some(st => st.label.toLowerCase() === label.toLowerCase())) {
                alert(`A shift type with the label "${label}" already exists.`);
                return;
            }
            // Create new shift object
            const newShift = { label, startTime, endTime, color, cssClass: '' };
            shiftTypes.push(newShift);
            console.log("Added new shift:", label);
        }

        // Common actions after add or update
        saveShiftTypes();       // Persist changes
        renderShiftTemplates(); // Refresh the list
        closeModal();           // Close and reset the modal
    }

    // --- Data Persistence (localStorage - Unchanged) ---
    const SHIFTS_STORAGE_KEY_PREFIX = 'scheduledShifts_';
    const SHIFT_TYPES_STORAGE_KEY = 'shiftTypes';
    function getStorageKeyForMonth(year, month) { /* ... */ return `${SHIFTS_STORAGE_KEY_PREFIX}${year}-${String(month + 1).padStart(2, '0')}`; }
    function saveShift(dateStr, shiftData) { /* ... */ const [year, monthStr] = dateStr.split('-'); const month = parseInt(monthStr, 10) - 1; const storageKey = getStorageKeyForMonth(year, month); let monthShifts = JSON.parse(localStorage.getItem(storageKey) || '{}'); monthShifts[dateStr] = shiftData; localStorage.setItem(storageKey, JSON.stringify(monthShifts)); }
    function deleteShift(dateStr) { /* ... */ const [year, monthStr] = dateStr.split('-'); const month = parseInt(monthStr, 10) - 1; const storageKey = getStorageKeyForMonth(year, month); let monthShifts = JSON.parse(localStorage.getItem(storageKey) || '{}'); delete monthShifts[dateStr]; localStorage.setItem(storageKey, JSON.stringify(monthShifts)); }
    function loadShiftsForMonth(year, month) { /* ... */ const storageKey = getStorageKeyForMonth(year, month); scheduledShifts = JSON.parse(localStorage.getItem(storageKey) || '{}'); }
    function saveShiftTypes() { /* ... */ localStorage.setItem(SHIFT_TYPES_STORAGE_KEY, JSON.stringify(shiftTypes)); }
    function loadShiftTypes() { /* ... */ const storedTypes = localStorage.getItem(SHIFT_TYPES_STORAGE_KEY); if (storedTypes) { try { const parsedTypes = JSON.parse(storedTypes); if (Array.isArray(parsedTypes)) { shiftTypes = parsedTypes; } else { console.warn("Stored shift types data is not an array. Using defaults."); } } catch (e) { console.error("Error parsing stored shift types. Using defaults.", e); } } }

    // --- Export Functions (CSV, iCal - Unchanged) ---
    function exportCSV() { /* ... */ const header = "Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description,Location,Private\n"; let csvContent = header; const shiftsToExport = Object.entries(scheduledShifts); if (shiftsToExport.length === 0) { alert(`No shifts scheduled for ${monthPicker.value} to export.`); return; } shiftsToExport.forEach(([dateStr, shiftData]) => { const [year, month, day] = dateStr.split('-'); const startDate = `${month}/${day}/${year}`; let endDate = startDate; if (shiftData.endTime < shiftData.startTime) { const nextDay = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); nextDay.setDate(nextDay.getDate() + 1); endDate = `${String(nextDay.getMonth() + 1).padStart(2, '0')}/${String(nextDay.getDate()).padStart(2, '0')}/${nextDay.getFullYear()}`; } const startTime = shiftData.startTime; const endTime = shiftData.endTime; const subject = shiftData.label; const allDayEvent = "FALSE"; const description = ""; const location = ""; const private = "TRUE"; csvContent += `"${subject}",${startDate},${startTime},${endDate},${endTime},${allDayEvent},"${description}","${location}",${private}\n`; }); downloadFile(csvContent, `shifts-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.csv`, 'text/csv;charset=utf-8;'); }
    function exportICal() { /* ... */ const shiftsToExport = Object.entries(scheduledShifts); if (shiftsToExport.length === 0) { alert(`No shifts scheduled for ${monthPicker.value} to export.`); return; } let icalContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Your Company//Your Product//EN', 'CALSCALE:GREGORIAN']; function formatICalDateTime(dateStr, timeStr) { const [year, month, day] = dateStr.split('-'); const [hour, minute] = timeStr.split(':'); const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0)); const yyyy = date.getUTCFullYear(); const mm = String(date.getUTCMonth() + 1).padStart(2, '0'); const dd = String(date.getUTCDate()).padStart(2, '0'); const hh = String(date.getUTCHours()).padStart(2, '0'); const mi = String(date.getUTCMinutes()).padStart(2, '0'); const ss = String(date.getUTCSeconds()).padStart(2, '0'); return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`; } const now = new Date(); const dtStamp = formatICalDateTime(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`); shiftsToExport.forEach(([dateStr, shiftData], index) => { const [year, month, day] = dateStr.split('-').map(Number); const startTime = shiftData.startTime; const endTime = shiftData.endTime; let endDateStr = dateStr; if (endTime < startTime) { const nextDay = new Date(year, month - 1, day); nextDay.setDate(nextDay.getDate() + 1); endDateStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`; } const dtStart = formatICalDateTime(dateStr, startTime); const dtEnd = formatICalDateTime(endDateStr, endTime); const uid = `shift-${dateStr}-${startTime.replace(':', '')}-${index}@yourdomain.com`; icalContent.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${dtStamp}`, `DTSTART:${dtStart}`, `DTEND:${dtEnd}`, `SUMMARY:${shiftData.label}`, 'END:VEVENT'); }); icalContent.push('END:VCALENDAR'); downloadFile(icalContent.join('\r\n'), `shifts-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.ics`, 'text/calendar;charset=utf-8;'); }

    // --- Utility Functions (Unchanged) ---
    function isColorLight(hexColor) { /* ... */ try { const hex = hexColor.replace('#', ''); const r = parseInt(hex.substring(0, 2), 16); const g = parseInt(hex.substring(2, 4), 16); const b = parseInt(hex.substring(4, 6), 16); const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255; return luminance > 0.6; } catch (e) { console.warn("Could not determine color brightness for:", hexColor, e); return true; } }
    function downloadFile(content, filename, contentType) { /* ... */ const blob = new Blob([content], { type: contentType }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", filename); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }

    // --- Event Listeners Setup ---
    function addEventListeners() {
        monthPicker.addEventListener('change', (e) => { /* ... update month ... */
            const [year, month] = e.target.value.split('-').map(Number); currentYear = year; currentMonth = month - 1;
            loadShiftsForMonth(currentYear, currentMonth); renderCalendar(currentYear, currentMonth);
        });

        addShiftTypeBtn.addEventListener('click', openModal); // Will open in 'Add' mode
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => { if (event.target === modal) { closeModal(); } });
        // Update listener to call the renamed save function
        addShiftForm.addEventListener('submit', handleSaveShiftType);

        exportCsvBtn.addEventListener('click', exportCSV);
        exportIcalBtn.addEventListener('click', exportICal);

        // Deselect listener (Unchanged)
        document.addEventListener('click', (event) => { /* ... deselect logic ... */
            if (!event.target.closest('.shift-templates') && !event.target.closest('.calendar-days') && !event.target.closest('.controls') && !event.target.closest('.modal')) {
                if (selectedShiftData) { console.log("Deselecting shift due to outside click."); const currentlySelected = shiftTemplatesContainer.querySelector('.selected-shift-template'); if (currentlySelected) { currentlySelected.classList.remove('selected-shift-template'); } selectedShiftData = null; }
            }
        });
    }

    // --- Load initial data and run ---
    initialize();

}); // End DOMContentLoaded wrapper
