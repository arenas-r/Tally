const express = require("express");
const router = express.Router();

const db = require("../db")

// Requests here

// GET route for /path
router.get('/', (req, res) => {
    const sampleAssignments = [
        {
            Assignment_Name: 'Calculus Homework 3',
            Due_Date: 'due in 1 day, 6:00pm',
            Priority: 'High',
            Completed: 'In Progress',
            Estimated_Time: '2 hours',
            Description: 'Complete problems 1-15 on washer method.'
        },
        {
            Assignment_Name: 'Data Structures Lab 6',
            Due_Date: 'in two days, 11:59 pm',
            Priority: 'Medium',
            Completed: 'Not Started',
            estimatedTime: '3 hours',
            Description: 'Implement binary search peak-finding algorithm.'
        }
    ];

    res.render('path', {
        title: 'Homework Path Dashboard',
        assignment: sampleAssignments, // This array feeds into your Handlebars partial
        isPathPage: true
    });
});

module.exports = router;
