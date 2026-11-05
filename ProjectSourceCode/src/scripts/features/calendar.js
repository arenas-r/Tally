const express = require("express");
const router = express.Router();

const db = require("../db");
const { getCourses } = require("./courses");


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

    // Use month from URL if provided
    // Example: /calendar?month=2026-11
    if (req.query.month) {
      [year, month] = req.query.month.split("-").map(Number);
    } else {

      // Otherwise use the current month
      year = today.getFullYear();
      month = today.getMonth() + 1;
    }

    // Temporary test user until authentication is integrated
    const userId = 1;

    // Get assignments from the database
    const assignments =
    await getCalendarAssignments(userId, year, month);

    // Get courses for the assignment form
    const courses = await getCourses(userId);


    // Group assignments by due date
    const assignmentsByDay = {};

    for (const assignment of assignments) {

      // Create the date entry if needed
      if (!assignmentsByDay[assignment.due_day]) {
        assignmentsByDay[assignment.due_day] = [];
      }

      // Add assignment to its due date
      assignmentsByDay[assignment.due_day].push(assignment);
    }


    // Find the weekday the month begins on
    const firstDay =
      new Date(year, month - 1, 1).getDay();

    // Find number of days in the month
    const daysInMonth =
      new Date(year, month, 0).getDate();

    const days = [];


    // Add empty boxes before day 1
    for (let i = 0; i < firstDay; i++) {
      days.push({
        isBlank: true
      });
    }


    // Add each day of the month
    for (let day = 1; day <= daysInMonth; day++) {

      const dateString =
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      days.push({
        day: day,
        date: dateString,
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

    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear++;
    }


    // Convert month number to month name
    const monthName =
      new Date(year, month - 1)
        .toLocaleString("default", { month: "long" });


    // Send calendar information to calendar.hbs
    res.render("calendar", {

      title: "Calendar",

      stylesheet: "calendar.css",

      monthLabel: `${monthName} ${year}`,

      days: days,

      courses: courses,

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

    // Use requested year/month or current date
    const year =
      Number(req.query.year) || today.getFullYear();

    const month =
      Number(req.query.month) || today.getMonth() + 1;

    // Temporary test user until authentication is integrated
    const userId = 1;

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

// Add a new assignment to the database
router.post("/add", async (req, res) => {
  try {

    // Temporary test user
    const userId = 1;

    // Get assignment information from the form
    const courseId = Number(req.body.course_id);
    const assignmentName = (req.body.assignment_name || "").trim();
    const description = req.body.description || null;
    const dueDate = req.body.due_date;
    const priority = req.body.priority || null;

    const estimatedTime =
      req.body.estimated_time === "" ||
      req.body.estimated_time == null
        ? null
        : Number(req.body.estimated_time);

    const completed = req.body.completed === "true";

    // Validate required fields
    if (
      !Number.isInteger(courseId) ||
      courseId <= 0 ||
      !assignmentName ||
      assignmentName.length > 150 ||
      !dueDate
    ) {
      return res.status(400).send("Invalid assignment information");
    }

    // Validate optional fields
    if (
      (priority !== null && !["low", "medium", "high"].includes(priority)) ||
      (estimatedTime !== null &&
        (!Number.isSafeInteger(estimatedTime) || estimatedTime < 0))
    ) {
      return res.status(400).send("Invalid priority or estimated time");
    }

    // Make sure the selected course belongs to the test user
    const course = await db.oneOrNone(
      `
      SELECT course_id
      FROM courses
      WHERE course_id = $1
        AND user_id = $2;
      `,
      [courseId, userId]
    );

    if (!course) {
      return res.status(400).send("Invalid course selected");
    }

    // Save assignment to PostgreSQL
    await db.none(
      `
      INSERT INTO assignments (
        course_id,
        assignment_name,
        description,
        due_date,
        priority,
        estimated_time,
        completed
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7);
      `,
      [
        courseId,
        assignmentName,
        description,
        dueDate,
        priority,
        estimatedTime,
        completed
      ]
    );

    // Return to the calendar month containing the assignment
    const month = dueDate.substring(0, 7);

    res.redirect(303, `/calendar?month=${month}`);

  } catch (error) {

    console.error("Error adding assignment:", error);

    if (error.code === "23505") {
      return res.status(409).send("Assignment already exists");
    }

    res.status(500).send("Unable to add assignment");
  }
});

module.exports = router;
