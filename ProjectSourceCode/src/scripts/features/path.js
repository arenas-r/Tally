const express = require("express");
const router = express.Router();

const db = require("../db")

// Requests here

// GET route for /path
router.get('/', (req, res) => {
    const sampleAssignments = [
        {
            Assignment: 'Calculus Homework 3',
            dueDate: 'January 8, 2007',
            Priority: 'High',
            Status: 'In Progress',
            estimatedTime: '2 hours',
            Description: 'Complete problems 1-15 on washer method.'
        },
        {
            Assignment: 'Data Structures Lab 6',
            dueDate: 'January 8, 2007',
            Priority: 'Medium',
            Status: 'Not Started',
            estimatedTime: '3 hours',
            Description: 'Implement binary search peak-finding algorithm.'
        }
    ];

    res.render('path', {
        title: 'Homework Path Dashboard',
        assignment: sampleAssignments // This array feeds into your Handlebars partial
    });
});

module.exports = router;
