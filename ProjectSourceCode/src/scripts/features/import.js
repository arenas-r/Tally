// Router is a router for the app extension so can make requests
const express = require("express");
const router = express.Router();

// Multer is file storage and upload
// ical is a prebuilt .ical/.ics file parser
const multer = require("multer");
const ical = require("node-ical");

const{ DateTime } = require("luxon");
const { db } = require("../db");

// Multer will temporarily store the file in the server's RAM as a buffer
// Memory will be naturally released once done parsing
// Will limit file size to avoid Out of memory crashes
const storage = multer.memoryStorage();
const upload = multer({
    storage:storage,
    limits: {fileSize: 5 * 1024 * 1024} // Limits files to 5MB for security
});

// Requests here

// basic testing route
router.get('/', (req, res) => {
    res.redirect('/calendar')
});

// Submission route. Sends ical file for parsing
router.post('/icalSubmission',  upload.single('icalFile'), async (req, res) => {
    // Ensure the file uploaded
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        // Validate the browser's timezone
        // const timeZone = req.body.timezone;
        // if (!timeZone || !DateTime.now().setZone(timeZone).isValid) {
        //     return res.status(400).send("Invalid or missing timezone.");
        // }

        const timeZone = req.body.timezone;

        console.log("Received timezone:", timeZone);

        if (!timeZone || !DateTime.now().setZone(timeZone).isValid) {
            console.error("Invalid or missing browser timezone:", timeZone);
            return res.status(400).send(`Invalid or missing timezone: ${timeZone}`);
        }

        //1. Convert the binary buffer back into a readable string
        const icalData = req.file.buffer.toString('utf-8')

        //2. Parse the string data immediately
        const parsedData = await ical.async.parseICS(icalData);

        const userId = 1; // Temp, change when session data added
        // const url = event.url;

        //3. Store the parsed data into the database
        for (const event of Object.values(parsedData)) {
            if (event.type !== 'VEVENT') continue;

            // Skip Canvas calendar events that aren't assignments
            if (event.uid && event.uid.includes("event-calendar-event")) {
                continue;
            }
            
            // Gather all the needed data
            const summary = event.summary || '';

            const courseMatches = [...summary.matchAll(/\[(.*?)\]/g)];

            const title = summary.replace(/\s*\[.*?\]/, '').trim();
            const course = courseMatches.length > 0
                ? courseMatches[courseMatches.length - 1][1] : '';

            const courseCode = course.match(/^[A-Z]+\s*\d+/)?.[0].replace(/\s/g, '') || '';
            const description = event.description || null;
            // const description = null; // testing purposes
            const dueDate = getAssignmentDueDate(event, timeZone);

            // 1. Find or create the course
            const courseQuery = `
                INSERT INTO courses (
                    user_id,
                    course_name,
                    course_code
                )
                VALUES ($1, $2, $3)

                ON CONFLICT (user_id, course_code)
                DO UPDATE SET course_name = EXCLUDED.course_name

                RETURNING course_id;
            `;

            const courseResult = await db.one(courseQuery, [
                userId,
                course,
                courseCode
            ]);

            const courseId = courseResult.course_id;

            // Create the assignment
            const assignmentQuery = `
                INSERT INTO assignments (
                    course_id,
                    assignment_name,
                    description,
                    due_date
                )
                VALUES ($1, $2, $3, ${dueDate ? "$4" : "DEFAULT"})
                ON CONFLICT (course_id, assignment_name, due_date)
                DO NOTHING

                RETURNING *;
            `;

            // console.log(event);
            // console.log('--------------------');
            // console.log('Title:', title);
            // console.log('Course:', course);
            // console.log('Description:', event.description);
            // console.log('Due-date:', event.end);
            // console.log('URL', event.url);

            let assignmentResult;
            if(dueDate) {
                 assignmentResult = await db.any(assignmentQuery, [
                    courseId,
                    title,
                    description,
                    dueDate
                ]);
            } else {
                assignmentResult = await db.any(assignmentQuery, [
                    courseId,
                    title,
                    description
                ]);
            }

            // console.log(assignmentResult);
        }

        //4. Respond to the client. Memory should clear afterwards
        console.log('Calendar parsed successfully with', Object.keys(parsedData).length, 'assignments');
        res.redirect('/calendar')
    } catch (err) {
        console.error('Parsing failed:', err);
        res.status(500).send('Failed to parse iCal file.');
    }
});

function getAssignmentDueDate(event, timeZone) {

    // All-day event
    if (event.start.dateOnly) {

        // Get the original calendar date from the iCal file
        const date = event.start.toISOString().substring(0, 10);

        // Set the deadline to 11:59 PM in the user's timezone
        return DateTime.fromISO(date, {
            zone: timeZone
        })
        .set({
            hour: 23,
            minute: 59,
            second: 0,
            millisecond: 0
        })
        .toUTC()
        .toJSDate();
    }

    // Regular timed event: preserve its original timestamp
    return event.end;
};

module.exports = router;