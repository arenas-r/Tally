const express = require("express");
const router = express.Router();

const db = require("../db");


// Get all assignments for one month
async function getCalendarAssignments(userId, year, month) {

  // First day of the selected month
  const startDate =
    `${year}-${String(month).padStart(2, "0")}-01`;

  // Find the first day of the next month
  let nextYear = year;
  let nextMonth = month + 1;

  // Handle December -> January
  if (nextMonth === 13) {
    nextMonth = 1;
    nextYear++;
  }

  const endDate =
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  // Get this user's assignments during the selected month
  return db.any(
    `
    SELECT
      a.assignment_id,
      a.assignment_name,
      a.priority,
      a.completed,
      TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_day,
      TO_CHAR(a.due_date, 'HH24:MI') AS due_time,
      c.course_name,
      c.course_code
    FROM assignments a
    JOIN courses c
      ON a.course_id = c.course_id
    WHERE c.user_id = $1
      AND a.due_date >= $2::date
      AND a.due_date < $3::date
    ORDER BY a.due_date;
    `,
    [userId, startDate, endDate]
  );
}


// Show the calendar page
router.get("/", async (req, res) => {
  try {

    const today = new Date();

    let year;
    let month;

    // If the URL contains a month, use it
    if (req.query.month) {
      [year, month] = req.query.month.split("-").map(Number);
    } else {

      // Otherwise use the current month
      year = today.getFullYear();
      month = today.getMonth() + 1;
    }

    // Temporary user until login is fully connected
    const userId = req.session.user_id || 1;

    // Get assignments from the database
    const assignments =
      await getCalendarAssignments(userId, year, month);


    // Group assignments by due date
    const assignmentsByDay = {};

    for (const assignment of assignments) {

      // Create the date entry if it does not exist yet
      if (!assignmentsByDay[assignment.due_day]) {
        assignmentsByDay[assignment.due_day] = [];
      }

      // Add assignment to its due date
      assignmentsByDay[assignment.due_day].push(assignment);
    }


    // Find calendar information for this month
    const firstDay =
      new Date(year, month - 1, 1).getDay();

    const daysInMonth =
      new Date(year, month, 0).getDate();

    const days = [];


    // Add empty calendar boxes before day 1
    for (let i = 0; i < firstDay; i++) {
      days.push({
        isBlank: true
      });
    }


    // Add every real day of the month
    for (let day = 1; day <= daysInMonth; day++) {

      const dateString =
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      days.push({
        day: day,
        date: dateString,

        // Add assignments due on this day
        assignments: assignmentsByDay[dateString] || []
      });
    }


    // Find previous month
    let previousMonth = month - 1;
    let previousYear = year;

    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear--;
    }


    // Find next month
    let nextMonth = month + 1;
    let nextYear = year;

    if (nextMonth === 13) {const express = require("express");
const router = express.Router();

const db = require("../db");

// Helper function: get assignments for one month
async function getCalendarAssignments(userId, year, month) {
  const startDate =
    `${year}-${String(month).padStart(2, "0")}-01`;

  let nextYear = year;
  let nextMonth = month + 1;

  if (nextMonth === 13) {
    nextMonth = 1;
    nextYear++;
  }

  const endDate =
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  return db.any(
    `
    SELECT
      a.assignment_id,
      a.assignment_name,
      a.priority,
      a.completed,
      TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_day,
      TO_CHAR(a.due_date, 'HH24:MI') AS due_time,
      c.course_name,
      c.course_code
    FROM assignments a
    JOIN courses c
      ON a.course_id = c.course_id
    WHERE c.user_id = $1
      AND a.due_date >= $2::date
      AND a.due_date < $3::date
    ORDER BY a.due_date;
    `,
    [userId, startDate, endDate]
  );
}


// GET /calendar
router.get("/", async (req, res) => {
  try {
    const today = new Date();

    let year;
    let month;

    if (req.query.month) {
      [year, month] = req.query.month.split("-").map(Number);
    } else {
      year = today.getFullYear();
      month = today.getMonth() + 1;
    }

    // Temporary fallback until login/session logic is finished
    const userId = req.session.user_id || 1;

    const assignments =
      await getCalendarAssignments(userId, year, month);

    const assignmentsByDay = {};

    for (const assignment of assignments) {
      if (!assignmentsByDay[assignment.due_day]) {
        assignmentsByDay[assignment.due_day] = [];
      }

      assignmentsByDay[assignment.due_day].push(assignment);
    }

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Add blank cells before day 1
    for (let i = 0; i < firstDay; i++) {
      days.push({
        isBlank: true
      });
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString =
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      days.push({
        day,
        date: dateString,
        assignments: assignmentsByDay[dateString] || []
      });
    }

    // Previous month
    let previousMonth = month - 1;
    let previousYear = year;

    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear--;
    }

    // Next month
    let nextMonth = month + 1;
    let nextYear = year;

    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear++;
    }

    const monthName = new Date(year, month - 1)
      .toLocaleString("default", { month: "long" });

    res.render("calendar", {
      title: "Calendar",
      monthLabel: `${monthName} ${year}`,
      days,
      previousMonth:
        `${previousYear}-${String(previousMonth).padStart(2, "0")}`,
      nextMonth:
        `${nextYear}-${String(nextMonth).padStart(2, "0")}`
    });

  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).send("Unable to load calendar");
  }
});


// GET /calendar/events
router.get("/events", async (req, res) => {
  try {
    const today = new Date();

    const year =
      Number(req.query.year) || today.getFullYear();

    const month =
      Number(req.query.month) || today.getMonth() + 1;

    const userId = req.session.user_id || 1;

    const assignments =
      await getCalendarAssignments(userId, year, month);

    res.status(200).json(assignments);

  } catch (error) {
    console.error("Calendar events error:", error);

    res.status(500).json({
      error: "Unable to retrieve calendar events"
    });
  }
});

module.exports = router;
      nextMonth = 1;
      nextYear++;
    }


    // Convert month number into a name
    const monthName =
      new Date(year, month - 1)
        .toLocaleString("default", { month: "long" });


    // Send all calendar information to calendar.hbs
    res.render("calendar", {
      title: "Calendar",

      monthLabel: `${monthName} ${year}`,

      days: days,

      previousMonth:
        `${previousYear}-${String(previousMonth).padStart(2, "0")}`,

      nextMonth:
        `${nextYear}-${String(nextMonth).padStart(2, "0")}`
    });

  } catch (error) {

    console.error("Calendar error:", error);

    res.status(500).send("Unable to load calendar");
  }
});


// Return calendar assignments as JSON
router.get("/events", async (req, res) => {
  try {

    const today = new Date();

    // Use requested year/month or default to today
    const year =
      Number(req.query.year) || today.getFullYear();

    const month =
      Number(req.query.month) || today.getMonth() + 1;

    // Temporary user until login is connected
    const userId = req.session.user_id || 1;

    // Get assignments from database
    const assignments =
      await getCalendarAssignments(userId, year, month);

    // Return assignments as JSON
    res.status(200).json(assignments);

  } catch (error) {

    console.error("Calendar events error:", error);

    res.status(500).json({
      error: "Unable to retrieve calendar events"
    });
  }
});

module.exports = router;