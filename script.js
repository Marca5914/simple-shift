document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const monthPicker = document.getElementById('month-picker');
    const calendarDaysContainer = document.getElementById('calendar-days');
    const shiftTemplatesContainer = document.getElementById('shift-templates');
    const addShiftTypeBtn = document.getElementById('add-shift-type-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportIcalBtn = document.getElementById('export-ical-btn');
    const exportScopeToggle = document.getElementById('export-scope-toggle'); // New
    const clearAllDataBtn = document.getElementById('clear-all-data-btn');   // New
    const modal = document.getElementById('add-shift-modal');

    // Check essential elements exist
    if (!monthPicker || !calendarDaysContainer || !shiftTemplatesContainer || !addShiftTypeBtn || !exportCsvBtn || !exportIcalBtn || !exportScopeToggle || !clearAllDataBtn || !modal) {
        console.error("Fatal Error: One or more essential page elements not found. Check IDs.");
        return; // Stop if core elements are missing
    }

    // Modal Elements (with check)
    const modalTitle = document.getElementById('modal-title');
    const closeModalBtn = modal.querySelector('.close-btn');
    const addShiftForm = document.getElementById('add-shift-form');
    const shiftLabelInput = document.getElementById('shift-label');
    const shiftStartTimeInput = document.getElementById('shift-start-time');
    const shiftEndTimeInput = document.getElementById('shift-end-time');
    const shiftColorInput = document.getElementById('shift-color');
    const modalSubmitButton = addShiftForm ? addShiftForm.querySelector('button[type="submit"]') : null;

    if (!modalTitle || !closeModalBtn || !addShiftForm || !shiftLabelInput || !shiftStartTimeInput || !shiftEndTimeInput || !shiftColorInput || !modalSubmitButton) {
        console.error("Fatal Error: One or more elements within the modal form were not found.");
        return;
    }

    // --- State ---
    let currentYear, currentMonth;
    let scheduledShifts = {}; // Shifts for the currently viewed month
    // Default shift types (will be replaced by localStorage if available)
    const defaultShiftTypes = [
        { label: "Day", color: "#add8e6", startTime: "08:00", endTime: "16:00", cssClass: "shift-day" },
        { label: "Night", color: "#4682b4", startTime: "20:00", endTime: "04:00", cssClass: "shift-night" },
        { label: "Back", color: "#90ee90", startTime: "12:00", endTime: "20:00", cssClass: "shift-back" }
    ];
    let shiftTypes = [...defaultShiftTypes]; // Initialize with defaults
    let selectedShiftData = null;
    let editingShiftLabel = null;
    let exportAllData = false; // New state for export scope

    // --- Constants for LocalStorage ---
    const SHIFTS_STORAGE_KEY_PREFIX = 'scheduledShifts_';
    const SHIFT_TYPES_STORAGE_KEY = 'shiftTypes';

    // --- Initialization ---
    function initialize() {
        const today = new Date();
        currentYear = today.getFullYear();
        currentMonth = today.getMonth();
        monthPicker.value = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        loadShiftTypes(); // Load custom types
        loadShiftsForMonth(currentYear, currentMonth); // Load current month's shifts
        updateExportToggleButton(); // Set initial state of toggle button
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
        // Add empty cells before 1st
        for (let i = 0; i < startDayOfWeek; i++) { const emptyCell = document.createElement('div'); emptyCell.classList.add('calendar-day', 'outside-month'); calendarDaysContainer.appendChild(emptyCell); }
        // Add day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div'); dayCell.classList.add('calendar-day');
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; dayCell.dataset.date = dateStr;
            const dayNumber = document.createElement('div'); dayNumber.classList.add('day-number'); dayNumber.textContent = day; dayCell.appendChild(dayNumber);
            // Add listeners
            dayCell.addEventListener('dragover', handleDragOver); dayCell.addEventListener('dragleave', handleDragLeave); dayCell.addEventListener('drop', handleDrop); dayCell.addEventListener('click', handleDayClick);
            // Display existing shift
            if (scheduledShifts[dateStr]) { displayShiftOnCalendar(dayCell, scheduledShifts[dateStr]); }
            calendarDaysContainer.appendChild(dayCell);
        }
        // Add empty cells after last day
        const totalCells = startDayOfWeek + daysInMonth; const remainingCells = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < remainingCells; i++) { const emptyCell = document.createElement('div'); emptyCell.classList.add('calendar-day', 'outside-month'); calendarDaysContainer.appendChild(emptyCell); }
    }

    // --- Shift Template Rendering (Unchanged) ---
    function renderShiftTemplates() {
        shiftTemplatesContainer.querySelectorAll('.shift-template-wrapper').forEach(el => el.remove());
        if (shiftTypes.length === 0) { /* ... no shifts message ... */
             const noShiftsMsg = document.createElement('p'); noShiftsMsg.textContent = "No shift types defined."; noShiftsMsg.style.textAlign = 'center'; noShiftsMsg.style.fontSize = '0.9em'; noShiftsMsg.style.color = '#666';
             const wrapper = document.createElement('div'); wrapper.classList.add('shift-template-wrapper'); wrapper.appendChild(noShiftsMsg); shiftTemplatesContainer.appendChild(wrapper); return;
        }
        shiftTypes.forEach(shift => { /* ... create template, label, buttons ... */
            const wrapper = document.createElement('div'); wrapper.classList.add('shift-template-wrapper');
            const shiftDiv = document.createElement('div'); shiftDiv.classList.add('shift-template');
            if (shift.cssClass) { shiftDiv.classList.add(shift.cssClass); }
            shiftDiv.style.backgroundColor = shift.color; shiftDiv.style.color = isColorLight(shift.color) ? '#333' : '#fff';
            shiftDiv.setAttribute('draggable', true);
            const labelSpan = document.createElement('span'); labelSpan.classList.add('label-text'); labelSpan.textContent = `${shift.label} (${shift.startTime}-${shift.endTime})`; shiftDiv.appendChild(labelSpan);
            shiftDiv.dataset.label = shift.label; shiftDiv.dataset.color = shift.color; shiftDiv.dataset.startTime = shift.startTime; shiftDiv.dataset.endTime = shift.endTime;
            shiftDiv.addEventListener('dragstart', handleDragStart); shiftDiv.addEventListener('click', handleTemplateClick);
            const editBtn = document.createElement('button'); editBtn.classList.add('edit-shift-type-btn'); editBtn.innerHTML = 'E'; editBtn.setAttribute('aria-label', `Edit shift type ${shift.label}`); editBtn.title = `Edit shift type "${shift.label}"`; editBtn.dataset.label = shift.label; editBtn.addEventListener('click', handleEditShiftType);
            const deleteBtn = document.createElement('button'); deleteBtn.classList.add('delete-shift-type-btn'); deleteBtn.innerHTML = '&times;'; deleteBtn.setAttribute('aria-label', `Delete shift type ${shift.label}`); deleteBtn.title = `Delete shift type "${shift.label}"`; deleteBtn.dataset.label = shift.label; deleteBtn.addEventListener('click', handleDeleteShiftType);
            shiftDiv.appendChild(editBtn); shiftDiv.appendChild(deleteBtn); wrapper.appendChild(shiftDiv); shiftTemplatesContainer.appendChild(wrapper);
            if (selectedShiftData && selectedShiftData.label === shift.label) { shiftDiv.classList.add('selected-shift-template'); }
        });
    }

    // --- Click/Drag Handlers (Unchanged) ---
    function handleTemplateClick(event) { /* ... toggle selection ... */
        if (event.target.classList.contains('delete-shift-type-btn') || event.target.classList.contains('edit-shift-type-btn')) { return; }
        const clickedTemplateDiv = event.currentTarget; const clickedShift = { label: clickedTemplateDiv.dataset.label, color: clickedTemplateDiv.dataset.color, startTime: clickedTemplateDiv.dataset.startTime, endTime: clickedTemplateDiv.dataset.endTime };
        if (selectedShiftData && selectedShiftData.label === clickedShift.label) { selectedShiftData = null; clickedTemplateDiv.classList.remove('selected-shift-template'); } else { const currentlySelected = shiftTemplatesContainer.querySelector('.selected-shift-template'); if (currentlySelected) { currentlySelected.classList.remove('selected-shift-template'); } selectedShiftData = clickedShift; clickedTemplateDiv.classList.add('selected-shift-template'); }
    }
    function handleDayClick(event) { /* ... place selected shift ... */
        if (selectedShiftData && !event.target.closest('.shift-on-calendar')) { const targetCell = event.currentTarget; const dateStr = targetCell.dataset.date; scheduledShifts[dateStr] = { ...selectedShiftData }; saveShift(dateStr, scheduledShifts[dateStr]); displayShiftOnCalendar(targetCell, scheduledShifts[dateStr]); }
    }
    function handleEditShiftType(event) { /* ... populate and open modal for edit ... */
        event.stopPropagation(); const labelToEdit = event.target.dataset.label; const shiftToEdit = shiftTypes.find(shift => shift.label === labelToEdit);
        if (shiftToEdit) { editingShiftLabel = labelToEdit; openModal(); shiftLabelInput.value = shiftToEdit.label; shiftStartTimeInput.value = shiftToEdit.startTime; shiftEndTimeInput.value = shiftToEdit.endTime; shiftColorInput.value = shiftToEdit.color; modalTitle.textContent = "Edit Shift Type"; modalSubmitButton.textContent = "Update Shift Type"; shiftLabelInput.disabled = true; } else { console.error("Could not find shift type to edit:", labelToEdit); alert("Error: Could not find the shift type to edit."); editingShiftLabel = null; }
    }
    function handleDeleteShiftType(event) { /* ... delete shift type ... */
        event.stopPropagation(); const labelToDelete = event.target.dataset.label; if (confirm(`Are you sure you want to delete the shift type "${labelToDelete}"? ...`)) { const indexToDelete = shiftTypes.findIndex(shift => shift.label === labelToDelete); if (indexToDelete > -1) { if (selectedShiftData && selectedShiftData.label === labelToDelete) { selectedShiftData = null; } shiftTypes.splice(indexToDelete, 1); saveShiftTypes(); renderShiftTemplates(); } else { console.error("Error: Could not find shift type to delete:", labelToDelete); alert("An error occurred..."); } }
    }
    function handleDragStart(event) { /* ... deselect and drag ... */
        if (event.target.classList.contains('delete-shift-type-btn') || event.target.classList.contains('edit-shift-type-btn')) { event.preventDefault(); return; } const shiftElement = event.target.closest('.shift-template'); if (!shiftElement) return; if (selectedShiftData) { const currentlySelected = shiftTemplatesContainer.querySelector('.selected-shift-template'); if (currentlySelected) { currentlySelected.classList.remove('selected-shift-template'); } selectedShiftData = null; } const shiftData = { label: shiftElement.dataset.label, color: shiftElement.dataset.color, startTime: shiftElement.dataset.startTime, endTime: shiftElement.dataset.endTime }; event.dataTransfer.setData('application/json', JSON.stringify(shiftData)); event.dataTransfer.effectAllowed = 'copy';
    }
    function handleDragOver(event) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; event.currentTarget.classList.add('drag-over'); }
    function handleDragLeave(event) { event.currentTarget.classList.remove('drag-over'); }
    function handleDrop(event) { /* ... place dropped shift ... */
        event.preventDefault(); event.currentTarget.classList.remove('drag-over'); const targetCell = event.currentTarget; const dateStr = targetCell.dataset.date; try { const shiftData = JSON.parse(event.dataTransfer.getData('application/json')); scheduledShifts[dateStr] = shiftData; saveShift(dateStr, shiftData); displayShiftOnCalendar(targetCell, shiftData); } catch (e) { console.error("Error parsing dropped data or applying shift:", e); alert("An error occurred..."); }
    }
    function displayShiftOnCalendar(dayCell, shiftData) { /* ... display shift with remove listener ... */
        const existingShift = dayCell.querySelector('.shift-on-calendar'); if (existingShift) { existingShift.remove(); } if (!shiftData) return; const shiftDiv = document.createElement('div'); shiftDiv.classList.add('shift-on-calendar'); shiftDiv.textContent = `${shiftData.label} (${shiftData.startTime}-${shiftData.endTime})`; shiftDiv.style.backgroundColor = shiftData.color; shiftDiv.style.color = isColorLight(shiftData.color) ? '#333' : '#fff'; shiftDiv.title = `Click to remove this shift`;
        shiftDiv.addEventListener('click', (e) => { e.stopPropagation(); if (confirm(`Remove ${shiftData.label} shift on ${dayCell.dataset.date}?`)) { delete scheduledShifts[dayCell.dataset.date]; deleteShift(dayCell.dataset.date); shiftDiv.remove(); } }); dayCell.appendChild(shiftDiv);
    }

    // --- Modal Handling (Unchanged) ---
    function openModal() { /* ... configure based on editingShiftLabel ... */
        if (!editingShiftLabel) { addShiftForm.reset(); modalTitle.textContent = "Add New Shift Type"; modalSubmitButton.textContent = "Save Shift Type"; shiftLabelInput.disabled = false; shiftLabelInput.focus(); } else { modalTitle.textContent = "Edit Shift Type"; modalSubmitButton.textContent = "Update Shift Type"; shiftLabelInput.disabled = true; shiftStartTimeInput.focus(); } modal.style.display = 'block';
    }
    function closeModal() { /* ... reset state and hide ... */
        modal.style.display = 'none'; editingShiftLabel = null; modalTitle.textContent = "Add New Shift Type"; modalSubmitButton.textContent = "Save Shift Type"; shiftLabelInput.disabled = false; addShiftForm.reset();
    }
    function handleSaveShiftType(event) { /* ... add or update shift type ... */
        event.preventDefault(); const label = shiftLabelInput.value.trim(); const startTime = shiftStartTimeInput.value; const endTime = shiftEndTimeInput.value; const color = shiftColorInput.value;
        if (!label || !startTime || !endTime) { alert("Please fill in Label, Start Time, and End Time."); return; }
        const originalLabel = editingShiftLabel || label;
        if (editingShiftLabel) { const indexToUpdate = shiftTypes.findIndex(shift => shift.label === editingShiftLabel); if (indexToUpdate > -1) { shiftTypes[indexToUpdate].startTime = startTime; shiftTypes[indexToUpdate].endTime = endTime; shiftTypes[indexToUpdate].color = color; } else { alert("Error: Could not find the shift to update."); closeModal(); return; } } else { if (shiftTypes.some(st => st.label.toLowerCase() === label.toLowerCase())) { alert(`A shift type with the label "${label}" already exists.`); return; } const newShift = { label, startTime, endTime, color, cssClass: '' }; shiftTypes.push(newShift); }
        saveShiftTypes(); renderShiftTemplates(); if (selectedShiftData && selectedShiftData.label === originalLabel) { selectedShiftData = { label: label, startTime: startTime, endTime: endTime, color: color }; } closeModal();
    }

    // --- Data Persistence (localStorage - Unchanged) ---
    function getStorageKeyForMonth(year, month) { return `${SHIFTS_STORAGE_KEY_PREFIX}${year}-${String(month + 1).padStart(2, '0')}`; }
    function saveShift(dateStr, shiftData) { const [year, monthStr] = dateStr.split('-'); const month = parseInt(monthStr, 10) - 1; const storageKey = getStorageKeyForMonth(year, month); let monthShifts = JSON.parse(localStorage.getItem(storageKey) || '{}'); monthShifts[dateStr] = shiftData; localStorage.setItem(storageKey, JSON.stringify(monthShifts)); }
    function deleteShift(dateStr) { const [year, monthStr] = dateStr.split('-'); const month = parseInt(monthStr, 10) - 1; const storageKey = getStorageKeyForMonth(year, month); let monthShifts = JSON.parse(localStorage.getItem(storageKey) || '{}'); delete monthShifts[dateStr]; localStorage.setItem(storageKey, JSON.stringify(monthShifts)); }
    function loadShiftsForMonth(year, month) { const storageKey = getStorageKeyForMonth(year, month); scheduledShifts = JSON.parse(localStorage.getItem(storageKey) || '{}'); }
    function saveShiftTypes() { localStorage.setItem(SHIFT_TYPES_STORAGE_KEY, JSON.stringify(shiftTypes)); }
    function loadShiftTypes() {
        const storedTypes = localStorage.getItem(SHIFT_TYPES_STORAGE_KEY);
        if (storedTypes) { try { const parsedTypes = JSON.parse(storedTypes); if (Array.isArray(parsedTypes)) { shiftTypes = parsedTypes; } else { console.warn("Stored shift types data is not an array. Using defaults."); shiftTypes = [...defaultShiftTypes]; } } catch (e) { console.error("Error parsing stored shift types. Using defaults.", e); shiftTypes = [...defaultShiftTypes]; } }
        else { shiftTypes = [...defaultShiftTypes]; } // Use defaults if nothing in storage
    }

    // --- NEW: Clear All Data ---
    function handleClearAllData() {
        if (confirm("⚠️ Are you sure you want to clear ALL scheduled shifts and ALL custom shift types?\nThis action cannot be undone!")) {
            console.log("Clearing all data...");
            // Iterate through localStorage and remove shift schedule keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(SHIFTS_STORAGE_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                    console.log("Removed:", key);
                }
            });

            // Remove custom shift types key
            localStorage.removeItem(SHIFT_TYPES_STORAGE_KEY);
            console.log("Removed:", SHIFT_TYPES_STORAGE_KEY);

            // Reset in-memory state
            shiftTypes = [...defaultShiftTypes]; // Reset to defaults
            scheduledShifts = {}; // Clear current month's view
            selectedShiftData = null; // Deselect any template
            editingShiftLabel = null; // Exit edit mode if active

            // Re-render UI
            renderShiftTemplates();
            renderCalendar(currentYear, currentMonth); // Re-render the current month (now empty)

            alert("All schedule data and custom shift types have been cleared.");
        }
    }

    // --- NEW: Toggle Export Scope ---
    function handleToggleExportScope() {
        exportAllData = !exportAllData; // Toggle the state
        updateExportToggleButton();
        console.log("Export scope toggled. Export all:", exportAllData);
    }

    // --- NEW: Update Export Toggle Button Appearance ---
    function updateExportToggleButton() {
        if (exportAllData) {
            exportScopeToggle.textContent = "Mode: Export All";
            exportScopeToggle.classList.add('export-all-active'); // Add class for styling
            exportScopeToggle.title = "Toggle to export only the current month's data";
        } else {
            exportScopeToggle.textContent = "Mode: Export Month";
            exportScopeToggle.classList.remove('export-all-active'); // Remove class
            exportScopeToggle.title = "Toggle to export all stored data across all months";
        }
    }

    // --- Modified Export Functions ---
    function getAllScheduledShifts() {
        let allShifts = {};
        console.log("Loading all shifts for export...");
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(SHIFTS_STORAGE_KEY_PREFIX)) {
                try {
                    const monthData = JSON.parse(localStorage.getItem(key) || '{}');
                    // Merge monthData into allShifts. Ensure date strings are keys.
                    Object.assign(allShifts, monthData);
                    console.log("Loaded data for key:", key);
                } catch (e) {
                    console.error("Error parsing data for key:", key, e);
                }
            }
        });
        console.log(`Total shifts loaded for export: ${Object.keys(allShifts).length}`);
        return allShifts;
    }

    function exportCSV() {
        const shiftsToExport = exportAllData ? getAllScheduledShifts() : scheduledShifts;
        const shiftEntries = Object.entries(shiftsToExport); // Convert to array for iteration

        if (shiftEntries.length === 0) {
            alert(`No shifts scheduled ${exportAllData ? 'in any month' : 'for the current month'} to export.`);
            return;
        }

        const header = "Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description,Location,Private\n";
        let csvContent = header;

        shiftEntries.forEach(([dateStr, shiftData]) => {
            // Ensure shiftData is valid before processing
            if (!shiftData || typeof shiftData !== 'object' || !shiftData.label || !shiftData.startTime || !shiftData.endTime) {
                console.warn(`Skipping invalid shift data for date ${dateStr}:`, shiftData);
                return; // Skip this entry
            }
            const [year, month, day] = dateStr.split('-');
            const startDate = `${month}/${day}/${year}`; let endDate = startDate;
            if (shiftData.endTime < shiftData.startTime) { const nextDay = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); nextDay.setDate(nextDay.getDate() + 1); endDate = `${String(nextDay.getMonth() + 1).padStart(2, '0')}/${String(nextDay.getDate()).padStart(2, '0')}/${nextDay.getFullYear()}`; }
            const startTime = shiftData.startTime; const endTime = shiftData.endTime; const subject = shiftData.label;
            const allDayEvent = "FALSE"; const description = ""; const location = ""; const private = "TRUE";
            csvContent += `"${subject}",${startDate},${startTime},${endDate},${endTime},${allDayEvent},"${description}","${location}",${private}\n`;
        });

        const filename = exportAllData
            ? `all_shifts_${new Date().toISOString().slice(0,10)}.csv`
            : `shifts-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.csv`;
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    }

    function exportICal() {
        const shiftsToExport = exportAllData ? getAllScheduledShifts() : scheduledShifts;
        const shiftEntries = Object.entries(shiftsToExport); // Convert to array

        if (shiftEntries.length === 0) {
            alert(`No shifts scheduled ${exportAllData ? 'in any month' : 'for the current month'} to export.`);
            return;
        }

        let icalContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Your Company//Your Product//EN', 'CALSCALE:GREGORIAN'];
        function formatICalDateTime(dateStr, timeStr) { /* ... format UTC ... */
             // Basic validation for dateStr and timeStr
             if (!dateStr || !timeStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) {
                console.error("Invalid date or time format for iCal:", dateStr, timeStr);
                return null; // Indicate error
             }
             const [year, month, day] = dateStr.split('-'); const [hour, minute] = timeStr.split(':');
             const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
             if (isNaN(date.getTime())) { // Check if date is valid
                 console.error("Invalid date created for iCal:", dateStr, timeStr);
                 return null;
             }
             const yyyy = date.getUTCFullYear(); const mm = String(date.getUTCMonth() + 1).padStart(2, '0'); const dd = String(date.getUTCDate()).padStart(2, '0');
             const hh = String(date.getUTCHours()).padStart(2, '0'); const mi = String(date.getUTCMinutes()).padStart(2, '0'); const ss = String(date.getUTCSeconds()).padStart(2, '0');
             return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
        }
        const now = new Date(); const dtStamp = formatICalDateTime(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

        shiftEntries.forEach(([dateStr, shiftData], index) => {
             // Ensure shiftData is valid before processing
             if (!shiftData || typeof shiftData !== 'object' || !shiftData.label || !shiftData.startTime || !shiftData.endTime) {
                console.warn(`Skipping invalid shift data for date ${dateStr}:`, shiftData);
                return; // Skip this entry
             }
            const [year, month, day] = dateStr.split('-').map(Number); const startTime = shiftData.startTime; const endTime = shiftData.endTime; let endDateStr = dateStr;
            if (endTime < startTime) { const nextDay = new Date(year, month - 1, day); nextDay.setDate(nextDay.getDate() + 1); endDateStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`; }

            const dtStart = formatICalDateTime(dateStr, startTime);
            const dtEnd = formatICalDateTime(endDateStr, endTime);
            // Skip event if date/time formatting failed
            if (!dtStart || !dtEnd) return;

            const uid = `shift-${dateStr}-${startTime.replace(':', '')}-${index}@yourdomain.com`; // Consider a more robust UID generation
            icalContent.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${dtStamp}`, `DTSTART:${dtStart}`, `DTEND:${dtEnd}`, `SUMMARY:${shiftData.label}`, 'END:VEVENT');
        });

        icalContent.push('END:VCALENDAR');
        const filename = exportAllData
            ? `all_shifts_${new Date().toISOString().slice(0,10)}.ics`
            : `shifts-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.ics`;
        downloadFile(icalContent.join('\r\n'), filename, 'text/calendar;charset=utf-8;');
    }

    // --- Utility Functions (Unchanged) ---
    function isColorLight(hexColor) { try { const hex = hexColor.replace('#', ''); const r = parseInt(hex.substring(0, 2), 16); const g = parseInt(hex.substring(2, 4), 16); const b = parseInt(hex.substring(4, 6), 16); const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255; return luminance > 0.6; } catch (e) { console.warn("Could not determine color brightness for:", hexColor, e); return true; } }
    function downloadFile(content, filename, contentType) { const blob = new Blob([content], { type: contentType }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", filename); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }

    // --- Event Listeners Setup ---
    function addEventListeners() {
        // Month Picker
        monthPicker.addEventListener('change', (e) => { const [year, month] = e.target.value.split('-').map(Number); currentYear = year; currentMonth = month - 1; loadShiftsForMonth(currentYear, currentMonth); renderCalendar(currentYear, currentMonth); });
        // Add New Shift Button
        addShiftTypeBtn.addEventListener('click', () => { editingShiftLabel = null; openModal(); }); // Ensures 'Add' mode
        // Modal listeners
        closeModalBtn.addEventListener('click', closeModal); modal.addEventListener('click', (event) => { if (event.target === modal) { closeModal(); } }); addShiftForm.addEventListener('submit', handleSaveShiftType);
        // Export buttons
        exportCsvBtn.addEventListener('click', exportCSV); exportIcalBtn.addEventListener('click', exportICal);
        // --- NEW Listeners ---
        exportScopeToggle.addEventListener('click', handleToggleExportScope);
        clearAllDataBtn.addEventListener('click', handleClearAllData);
        // Global click listener for deselecting templates
        document.addEventListener('click', (event) => { if (!event.target.closest('.shift-templates') && !event.target.closest('.calendar-days') && !event.target.closest('.controls') && !event.target.closest('.modal')) { if (selectedShiftData) { const currentlySelected = shiftTemplatesContainer.querySelector('.selected-shift-template'); if (currentlySelected) { currentlySelected.classList.remove('selected-shift-template'); } selectedShiftData = null; } } });
    }

    // --- Load initial data and run ---
    initialize();

}); // End DOMContentLoaded wrapper
