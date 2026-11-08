const express = require("express");
const router = express.Router();

const { db } = require("../db")

// Requests here

// GET route for /path
/*
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
*/
router.get('/',async (req, res)=>{

    try{
        const assignmentData = await db.any(`
            SELECT
            assignment_name,
            description,
            TO_CHAR(due_date, 'Mon DD, YYYY') AS due_date,
            priority,
            estimated_time,
            completed
            FROM assignments
            ORDER BY assignments.due_date DESC
            `);

            res.render('path',{
                assignment: assignmentData,
                isPathPage: true
            });
    }catch(err){
        res.status(400).json({
            status:"Error",
            message: err.message
        });
    }
});
module.exports = router;
