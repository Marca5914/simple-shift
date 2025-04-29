# Simple Shift Scheduler

A web-based tool to visually schedule shifts onto a monthly calendar using drag-and-drop and export the schedule to CSV (Google Calendar compatible) or iCal (.ics) formats.

## Features

* **Monthly Calendar View:** Displays a standard calendar grid for any selected month and year.
* **Draggable Shift Templates:** Predefined shifts ("Day", "Night", "Back") and custom-defined shifts can be dragged onto calendar days.
* **Custom Shift Types:** Add new shift types with custom labels, start/end times, and background colors via a modal form.
* **Delete Shift Types:** Remove unwanted shift templates (predefined or custom) from the available list.
* **Remove Scheduled Shifts:** Click on a shift placed on the calendar to remove it.
* **CSV Export:** Export the schedule for the currently viewed month in a format compatible with Google Calendar import.
* **iCal (.ics) Export:** Export the schedule for the currently viewed month as an `.ics` file, compatible with Apple Calendar, Outlook, Google Calendar (import), and other calendar applications.
* **Persistence:** Scheduled shifts and custom shift types are saved in the browser's `localStorage`, so they persist between sessions on the same browser.

## How to Use

1.  **Open the Tool:** Open the `index.html` file in your web browser.
2.  **Select Month:** Use the month picker at the top to choose the year and month you want to schedule.
3.  **Add Shifts:**
    * Drag a shift template from the "Available Shifts" list on the left onto a specific day in the calendar grid on the right.
4.  **Manage Shift Types:**
    * Click "Add New Shift Type" to open a form where you can define a new shift's label, start/end times, and color. Save it to add it to the "Available Shifts" list.
    * Click the small 'x' button next to any shift template in the list to delete that shift type (confirmation required).
5.  **Remove a Scheduled Shift:** Click directly on a shift that has been placed onto a calendar day. Confirm the removal when prompted.
6.  **Export:**
    * Click "Export to CSV" to download a `.csv` file for the currently viewed month, suitable for importing into Google Calendar.
    * Click "Export to iCal (.ics)" to download an `.ics` file for the currently viewed month, suitable for importing into various calendar applications.

## Files

* `index.html`: The main HTML structure of the application.
* `style.css`: Contains all the CSS rules for styling the application.
* `script.js`: The core JavaScript code handling calendar generation, drag-and-drop, shift management, local storage, and export functionality.

## Potential Improvements

* More robust timezone handling for iCal export.
* Ability to edit shifts directly on the calendar.
* Support for recurring shifts.
* Visual indication of overnight shifts spanning across midnight.
* Backend integration for storing data instead of `localStorage`.
* More sophisticated UI/UX (e.g., better visual feedback, loading indicators).
* Unit/Integration tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
