const express = require("express");
const router = express.Router();

const db = require("../db")

// Requests here
<<<<<<< HEAD

// GET route for /path
router.get('/', (req, res) => {
    const sampleAssignments = [
        {
            assignment_name: 'Calculus Homework 3',
            due_date: 'due in 1 day, 6:00pm',
            priority: 'High',
            completed: 'True',
            estimated_time: '2 hours',
            description: 'Complete problems 1-15 on washer method.'
        },
        {
            assignment_name: 'Data Structures Lab 6',
            due_date: 'in two days, 11:59 pm',
            priority: 'Medium',
            completed: 'False',
            estimated_time: '3 hours',
            description: 'Implement binary search peak-finding algorithm.'
        }
    ];

    res.render('path', {
        title: 'Homework Path Dashboard',
        assignment: sampleAssignments, // This array feeds into your Handlebars partial
        isPathPage: true
    });
});

module.exports = router;
=======
//router.get("/",(req,res) 
>>>>>>> 12e7d0f (dashboard queries for assignments, courses, workload)
