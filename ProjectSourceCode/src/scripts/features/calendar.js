
const express = require("express");
const router = express.Router();

const { db } = require("../db");
const { getCourses } = require("./courses");


// Get all assignments for a selected month
async function getCalendarAssignments(userId, year, month) {

  // Calculate the first day of the month
  const startDate =
    `${year}-${String(month).padStart(2, "0")}-01`;

  let nextYear = year;
  let nextMonth = month + 1;

  // Handle December to January
  if (nextMonth === 13) {
    nextMonth = 1;
    nextYear++;
  }

  // Calculate the first day of the next month
  const endDate =
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  // Retrieve assignments and their course information
  return db.any(
    `
    SELECT
      a.assignment_id,
      a.assignment_name,
      a.description,
      a.priority,
      a.estimated_time,
      a.completed,
      TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_day,
      TO_CHAR(a.due_date, 'FMHH12:MI AM') AS due_time,
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


// Display the calendar page
router.get("/", async (req, res) => {
  try {
    const today = new Date();

    let year;
    let month;

    // Use the requested month or the current month
    if (req.query.month) {
      [year, month] = req.query.month.split("-").map(Number);
    } else {
      year = today.getFullYear();
      month = today.getMonth() + 1;
    }

    // Temporary test user
    const userId = 1;

    // Retrieve assignments and courses
    const assignments =
      await getCalendarAssignments(userId, year, month);

    const courses = await getCourses(userId);

    // Group assignments by their due date
    const assignmentsByDay = {};

    for (const assignment of assignments) {
      if (!assignmentsByDay[assignment.due_day]) {
        assignmentsByDay[assignment.due_day] = [];
      }

      assignmentsByDay[assignment.due_day].push(assignment);
    }

    // Find the first weekday and number of days
    const firstDay =
      new Date(year, month - 1, 1).getDay();

    const daysInMonth =
      new Date(year, month, 0).getDate();

    const days = [];

    // Add blank cells before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push({
        isBlank: true
      });
    }

    // Create each day and include its assignments
    for (let day = 1; day <= daysInMonth; day++) {

      const dateString =
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      days.push({
        day: day,
        date: dateString,
        assignments: assignmentsByDay[dateString] || []
      });
    }

    // Calculate the previous month
    let previousMonth = month - 1;
    let previousYear = year;

    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear--;
    }

    // Calculate the next month
    let nextMonth = month + 1;
    let nextYear = year;

    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear++;
    }

    // Convert the month number to its name
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

    // Get the requested year and month
    const year =
      Number(req.query.year) || today.getFullYear();

    const month =
      Number(req.query.month) || today.getMonth() + 1;

    // Temporary test user
    const userId = 1;

    // Retrieve assignments for the selected month
    const assignments =
      await getCalendarAssignments(userId, year, month);

    // Return assignment data as JSON
    res.status(200).json(assignments);

  } catch (error) {
    console.error("Calendar events error:", error);

    res.status(500).json({
      error: "Unable to retrieve calendar events"
    });
  }
});


// Add a new assignment
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

    // Validate required assignment information
    if (
      !Number.isInteger(courseId) ||
      courseId <= 0 ||
      !assignmentName ||
      assignmentName.length > 150 ||
      !dueDate
    ) {
      return res.status(400).send("Invalid assignment information");
    }

    // Validate priority and estimated time
    if (
      (priority !== null &&
        !["low", "medium", "high"].includes(priority)) ||
      (estimatedTime !== null &&
        (!Number.isSafeInteger(estimatedTime) || estimatedTime < 0))
    ) {
      return res.status(400).send("Invalid priority or estimated time");
    }

    // Verify that the course belongs to the user
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

    // Save the assignment as incomplete by default
    await db.none(
      `
      INSERT INTO assignments (
        course_id,
        assignment_name,
        description,
        due_date,
        priority,
        estimated_time
      )
      VALUES ($1, $2, $3, $4, $5, $6);
      `,
      [
        courseId,
        assignmentName,
        description,
        dueDate,
        priority,
        estimatedTime
      ]
    );

    // Open the month containing the new assignment
    const month = dueDate.substring(0, 7);

    res.redirect(303, `/calendar?month=${month}`);

  } catch (error) {
    console.error("Error adding assignment:", error);

    // Reject duplicate assignments
    if (error.code === "23505") {
      return res.status(409).send("Assignment already exists");
    }

    // Handle other database errors
    res.status(500).send("Unable to add assignment");
  }
});


// Update an assignment's completion status
router.post("/:assignmentId/completed", async (req, res) => {
  try {

    // Temporary test user
    const userId = 1;

    // Get the assignment ID and new completion status
    const assignmentId = Number(req.params.assignmentId);
    const completedValue = req.body.completed;

    // Validate the assignment ID
    if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) {
      return res.status(400).json({
        error: "Invalid assignment ID"
      });
    }

    // Only accept true or false
    if (completedValue !== "true" && completedValue !== "false") {
      return res.status(400).json({
        error: "Invalid completion status"
      });
    }

    const completed = completedValue === "true";

    // Update the assignment in PostgreSQL
    // Only update assignments belonging to the user
    const assignment = await db.oneOrNone(
      `
      UPDATE assignments a
      SET completed = $1
      FROM courses c
      WHERE a.course_id = c.course_id
        AND a.assignment_id = $2
        AND c.user_id = $3
      RETURNING a.assignment_id, a.completed;
      `,
      [completed, assignmentId, userId]
    );

    // Handle assignments that do not exist
    if (!assignment) {
      return res.status(404).json({
        error: "Assignment not found"
      });
    }

    // Return the updated completion status
    res.status(200).json(assignment);

  } catch (error) {
    console.error("Error updating assignment:", error);

    res.status(500).json({
      error: "Unable to update assignment"
    });
  }
});


// Export the calendar routes
module.exports = router;