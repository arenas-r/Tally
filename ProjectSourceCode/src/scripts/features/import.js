// Router is a router for the app extension so can make requests
const express = require("express");
const router = express.Router();

// Multer is file storage and upload
// ical is a prebuilt .ical/.ics file parser
const multer = require("multer");
const ical = require("node-ical");

const db = require("../db");

// Multer will temporarily store the file in the server's RAM as a buffer
// Memory will be naturally released once done parsing
// Will limit file size to avoid Out of memory crashes
const storage = multer.memoryStorage();
const upload = multer({
    storage:storage,
    limits: {fileSize: 5 * 1024 * 1024} // Limits files to 5MB for security
});

// Requests here

router.get('/', (req, res) => {
    res.render('importTest')
});

router.post('/icalSubmission',  upload.single('icalFile'), (req, res) => {
    // Ensure the file uploaded
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        //1. Convert the binary buffer back into a readable string
        const icalData = req.file.buffer.toString('utf-8')

        //2. Parse the string data immediately
        const parsedData = ical.parseICS(icalData);

        //3. Store the parsed data into the database
        console.log(parsedData);

        //4. Respond to the client. Memory should clear afterwards
        res.status(200).json({
            message: 'Calendar parsed successfully!',
            eventsFound: Object.keys(parsedData).length
        });
    } catch (err) {
        console.error('Parsing failed:', err);
        res.status(500).send('Failed to parse iCal file.');
    }
});

module.exports = router;