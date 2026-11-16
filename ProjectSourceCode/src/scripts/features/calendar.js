
const express = require("express");
const router = express.Router();

const { db } = require("../db");
const { getCourses } = require("./courses");

/*
 * CALENDAR ROUTES
 *
 * Handles:
 * - Displaying the monthly Calendar
 * - Returning Calendar assignments as JSON
 * - Creating new assignments
 * - Editing existing assignments
 * - Updating assignment completion status
 *
 * S3 attachment uploads, downloads, and listings
 * are handled separately in assignmentFiles.js.
 *
 * DEVELOPMENT NOTE:
 * Calendar currently uses user ID 1 to remain compatible
 * with the team's existing development setup.
 * Replace this with the authenticated user's ID
 * before deploying a multiuser application.
 */
const DEVELOPMENT_USER_ID = 1;


/*
 * Validate the requested calendar year and month.
 * January = 1 and December = 12.
 */
function isValidMonth(year, month) {
    return (
        Number.isInteger(year) &&
        Number.isInteger(month) &&
        year >= 100 &&
        year <= 9999 &&
        month >= 1 &&
        month <= 12
    );
}


/*
 * Validate dates submitted through datetime-local inputs.
 *
 * Required format: YYYY-MM-DDTHH:mm
 *
 * This function is shared by assignment creation
 * and assignment editing to avoid duplicate validation code.
 */
function isValidDueDate(value) {
    if (typeof value !== "string") {
        return false;
    }

    const match =
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

    if (!match) {
        return false;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);

    if (
        !isValidMonth(year, month) ||
        day < 1 ||
        hour > 23 ||
        minute > 59
    ) {
        return false;
    }

    // UTC is used only to check whether the date exists.
    // The submitted deadline is not converted to another timezone.
    const date = new Date(
        Date.UTC(year, month - 1, day, hour, minute)
    );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day &&
        date.getUTCHours() === hour &&
        date.getUTCMinutes() === minute
    );
}


/*
 * Retrieve all assignments due during a selected month.
 *
 * The course join limits results to the specified user.
 * The date range includes the first day of the month
 * and excludes the first day of the following month.
 *
 * Course ID and due_datetime are also returned so the
 * Edit Assignment form can be populated correctly.
 */
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
            a.course_id,
            a.assignment_name,
            a.description,
            a.priority,
            a.estimated_time,
            a.completed,

            TO_CHAR(
                a.due_date,
                'YYYY-MM-DD'
            ) AS due_day,

            TO_CHAR(
                a.due_date,
                'FMHH12:MI AM'
            ) AS due_time,

            TO_CHAR(
                a.due_date,
                'YYYY-MM-DD"T"HH24:MI'
            ) AS due_datetime,

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


/*
 * GET /calendar
 *
 * Render the monthly calendar.
 *
 * Examples:
 * /calendar
 * /calendar?month=2026-11
 *
 * Defaults to the current month when no month
 * query parameter is supplied.
 */
router.get("/", async (req, res) => {
    try {
        const today = new Date();

        let year = today.getFullYear();
        let month = today.getMonth() + 1;

        // Parse and validate the optional month query parameter.
        if (req.query.month !== undefined) {
            if (typeof req.query.month !== "string") {
                return res.status(400).send(
                    "Invalid calendar month"
                );
            }

            const match =
                /^(\d{4})-(\d{2})$/.exec(req.query.month);

            if (!match) {
                return res.status(400).send(
                    "Invalid calendar month"
                );
            }

            year = Number(match[1]);
            month = Number(match[2]);
        }

        if (!isValidMonth(year, month)) {
            return res.status(400).send(
                "Invalid calendar month"
            );
        }

        const userId = DEVELOPMENT_USER_ID;

        // Load assignments and courses for the Calendar page.
        const assignments =
            await getCalendarAssignments(userId, year, month);

        const courses = await getCourses(userId);

        // Organize assignments using their YYYY-MM-DD due date.
        const assignmentsByDay = {};

        for (const assignment of assignments) {
            const dueDay = assignment.due_day;

            if (!assignmentsByDay[dueDay]) {
                assignmentsByDay[dueDay] = [];
            }

            assignmentsByDay[dueDay].push(assignment);
        }

        // Determine the weekday of the first day of the month.
        const firstDay =
            new Date(year, month - 1, 1).getDay();

        const daysInMonth =
            new Date(year, month, 0).getDate();

        const days = [];

        // Insert blank cells before the first day of the month.
        for (let i = 0; i < firstDay; i++) {
            days.push({
                isBlank: true
            });
        }

        // Create the calendar cells and attach assignments.
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString =
                `${year}-${String(month).padStart(2, "0")}` +
                `-${String(day).padStart(2, "0")}`;

            days.push({
                day: day,
                date: dateString,
                assignments: assignmentsByDay[dateString] || []
            });
        }

        // Calculate the previous month for navigation.
        let previousMonth = month - 1;
        let previousYear = year;

        if (previousMonth === 0) {
            previousMonth = 12;
            previousYear--;
        }

        // Calculate the next month for navigation.
        let nextMonth = month + 1;
        let nextYear = year;

        if (nextMonth === 13) {
            nextMonth = 1;
            nextYear++;
        }

        const monthName =
            new Date(year, month - 1, 1).toLocaleString(
                "default",
                { month: "long" }
            );

        /*
         * Render calendar.hbs.
         *
         * Each assignment includes data used by:
         * - The assignment details popup
         * - The completed-assignment styling
         * - The Edit Assignment form
         */
        return res.render("calendar", {
            title: "Calendar",
            stylesheet: "calendar.css",

            monthLabel: `${monthName} ${year}`,

            days: days,
            courses: courses,

            previousMonth:
                `${previousYear}-` +
                String(previousMonth).padStart(2, "0"),

            nextMonth:
                `${nextYear}-` +
                String(nextMonth).padStart(2, "0")
        });

    } catch (error) {
        console.error("Calendar error:", error);

        return res.status(500).send(
            "Unable to load calendar"
        );
    }
});


/*
 * GET /calendar/events
 *
 * Return assignments as JSON for the requested month.
 *
 * Example:
 * /calendar/events?year=2026&month=11
 */
router.get("/events", async (req, res) => {
    try {
        const today = new Date();

        const year =
            req.query.year === undefined
                ? today.getFullYear()
                : Number(req.query.year);

        const month =
            req.query.month === undefined
                ? today.getMonth() + 1
                : Number(req.query.month);

        if (!isValidMonth(year, month)) {
            return res.status(400).json({
                error: "Invalid calendar year or month"
            });
        }

        const userId = DEVELOPMENT_USER_ID;

        const assignments =
            await getCalendarAssignments(userId, year, month);

        return res.status(200).json(assignments);

    } catch (error) {
        console.error("Calendar events error:", error);

        return res.status(500).json({
            error: "Unable to retrieve calendar events"
        });
    }
});


/*
 * POST /calendar/add
 *
 * Create an assignment.
 *
 * The frontend creates the assignment before uploading
 * attachments because S3 paths require an assignment ID.
 *
 * JSON requests receive the new ID and redirect URL.
 * Standard form submissions receive an HTTP 303 redirect.
 */
router.post("/add", async (req, res) => {
    try {
        const userId = DEVELOPMENT_USER_ID;

        const courseId = Number(req.body.course_id);

        const assignmentName =
            typeof req.body.assignment_name === "string"
                ? req.body.assignment_name.trim()
                : "";

        const description =
            typeof req.body.description === "string"
                ? req.body.description
                : null;

        const dueDate =
            typeof req.body.due_date === "string"
                ? req.body.due_date.trim()
                : "";

        const priority = req.body.priority || null;

        const estimatedTime =
            req.body.estimated_time === "" ||
            req.body.estimated_time == null
                ? null
                : Number(req.body.estimated_time);

        // Validate required assignment information.
        if (
            !Number.isSafeInteger(courseId) ||
            courseId <= 0 ||
            !assignmentName ||
            assignmentName.length > 150 ||
            !isValidDueDate(dueDate)
        ) {
            return res.status(400).send(
                "Invalid assignment information"
            );
        }

        // Validate optional priority and estimated study time.
        if (
            (
                priority !== null &&
                !["low", "medium", "high"].includes(priority)
            ) ||
            (
                estimatedTime !== null &&
                (
                    !Number.isSafeInteger(estimatedTime) ||
                    estimatedTime < 0
                )
            )
        ) {
            return res.status(400).send(
                "Invalid priority or estimated time"
            );
        }

        // Make sure the selected course belongs to this user.
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
            return res.status(400).send(
                "Invalid course selected"
            );
        }

        /*
         * Create the assignment and return its generated ID.
         *
         * The assignment ID is used for optional S3 uploads.
         */
        const createdAssignment = await db.one(
            `
            INSERT INTO assignments (
                course_id,
                assignment_name,
                description,
                due_date,
                priority,
                estimated_time
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING assignment_id;
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

        // Redirect to the month containing the new assignment.
        const month = dueDate.substring(0, 7);

        const redirectUrl =
            `/calendar?month=${encodeURIComponent(month)}`;

        // Return JSON when the Calendar JavaScript creates the record.
        if (
            (req.get("Accept") || "").includes(
                "application/json"
            )
        ) {
            return res.status(201).json({
                message: "Assignment created successfully.",
                assignmentId: createdAssignment.assignment_id,
                redirectUrl
            });
        }

        return res.redirect(303, redirectUrl);

    } catch (error) {
        console.error("Error adding assignment:", error);

        /*
         * PostgreSQL error 23505 indicates a unique-constraint
         * violation, if a matching constraint exists.
         *
         * Full duplicate prevention is a separate planned feature.
         */
        if (error.code === "23505") {
            return res.status(409).send(
                "Assignment already exists"
            );
        }

        return res.status(500).send(
            "Unable to add assignment"
        );
    }
});


/*
 * POST /calendar/:assignmentId/edit
 *
 * Edit an existing assignment.
 *
 * The original assignment ID is preserved.
 * Completion status and S3 attachments are not modified.
 */
router.post("/:assignmentId/edit", async (req, res) => {
    try {
        const userId = DEVELOPMENT_USER_ID;

        const assignmentId = Number(req.params.assignmentId);
        const courseId = Number(req.body.course_id);

        const assignmentName =
            typeof req.body.assignment_name === "string"
                ? req.body.assignment_name.trim()
                : "";

        const description =
            typeof req.body.description === "string"
                ? req.body.description
                : null;

        const dueDate =
            typeof req.body.due_date === "string"
                ? req.body.due_date.trim()
                : "";

        const priority =
            req.body.priority === "" ||
            req.body.priority == null
                ? null
                : req.body.priority;

        const estimatedTime =
            req.body.estimated_time === "" ||
            req.body.estimated_time == null
                ? null
                : Number(req.body.estimated_time);

        /*
         * Reuse the creation date validator.
         * Validate the assignment ID, course ID, name,
         * and due date before contacting PostgreSQL.
         */
        if (
            !Number.isSafeInteger(assignmentId) ||
            assignmentId <= 0 ||
            !Number.isSafeInteger(courseId) ||
            courseId <= 0 ||
            !assignmentName ||
            assignmentName.length > 150 ||
            !isValidDueDate(dueDate)
        ) {
            return res.status(400).json({
                error: "Invalid assignment information."
            });
        }

        // Validate optional planning fields.
        if (
            (
                priority !== null &&
                !["low", "medium", "high"].includes(priority)
            ) ||
            (
                estimatedTime !== null &&
                (
                    !Number.isSafeInteger(estimatedTime) ||
                    estimatedTime < 0
                )
            )
        ) {
            return res.status(400).json({
                error: "Invalid priority or estimated time."
            });
        }

        /*
         * Only update an assignment if:
         * - Its existing course belongs to the user.
         * - Its newly selected course also belongs to the user.
         *
         * This permits moving an assignment between the
         * user's courses without modifying its assignment ID.
         */
        const updatedAssignment = await db.oneOrNone(
            `
            UPDATE assignments a
            SET
                course_id = $1,
                assignment_name = $2,
                description = $3,
                due_date = $4,
                priority = $5,
                estimated_time = $6
            WHERE a.assignment_id = $7
              AND EXISTS (
                  SELECT 1
                  FROM courses c
                  WHERE c.course_id = a.course_id
                    AND c.user_id = $8
              )
              AND EXISTS (
                  SELECT 1
                  FROM courses c
                  WHERE c.course_id = $1
                    AND c.user_id = $8
              )
            RETURNING a.assignment_id;
            `,
            [
                courseId,
                assignmentName,
                description,
                dueDate,
                priority,
                estimatedTime,
                assignmentId,
                userId
            ]
        );

        if (!updatedAssignment) {
            return res.status(404).json({
                error: "Assignment not found or course unavailable."
            });
        }

        /*
         * Return the month containing the updated due date.
         * The frontend reloads that month so the assignment
         * appears in the correct calendar cell.
         */
        const month = dueDate.substring(0, 7);

        return res.status(200).json({
            message: "Assignment updated successfully.",
            assignmentId: updatedAssignment.assignment_id,
            redirectUrl:
                `/calendar?month=${encodeURIComponent(month)}`
        });

    } catch (error) {
        console.error("Error editing assignment:", error);

        // Handle database uniqueness conflicts if applicable.
        if (error.code === "23505") {
            return res.status(409).json({
                error: "An assignment with these details already exists."
            });
        }

        return res.status(500).json({
            error: "Unable to update assignment."
        });
    }
});


/*
 * POST /calendar/:assignmentId/completed
 *
 * Update the completion status of an existing assignment.
 *
 * The frontend sends completed=true or completed=false.
 * The server returns the saved Boolean status as JSON.
 */
router.post("/:assignmentId/completed", async (req, res) => {
    try {
        const userId = DEVELOPMENT_USER_ID;

        const assignmentId =
            Number(req.params.assignmentId);

        const completedValue =
            req.body.completed;

        if (
            !Number.isSafeInteger(assignmentId) ||
            assignmentId <= 0
        ) {
            return res.status(400).json({
                error: "Invalid assignment ID"
            });
        }

        if (
            completedValue !== "true" &&
            completedValue !== "false"
        ) {
            return res.status(400).json({
                error: "Invalid completion status"
            });
        }

        const completed = completedValue === "true";

        /*
         * Update only assignments belonging to the user.
         * The course join verifies assignment ownership.
         */
        const assignment = await db.oneOrNone(
            `
            UPDATE assignments a
            SET completed = $1
            FROM courses c
            WHERE a.course_id = c.course_id
              AND a.assignment_id = $2
              AND c.user_id = $3
            RETURNING
                a.assignment_id,
                a.completed;
            `,
            [completed, assignmentId, userId]
        );

        if (!assignment) {
            return res.status(404).json({
                error: "Assignment not found"
            });
        }

        /*
         * The frontend updates the calendar card's
         * data-completed attribute after this response.
         * CSS then applies completed styling automatically.
         */
        return res.status(200).json(assignment);

    } catch (error) {
        console.error("Error updating assignment:", error);

        return res.status(500).json({
            error: "Unable to update assignment"
        });
    }
});


// Export the Calendar routes for registration in app.js.
module.exports = router;
