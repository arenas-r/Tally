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
            ORDER BY assignments.due_date ASC


            `);

            //Get metadata that will be used to detect changes from the database, find the number of assignments in databse
            const countResult = await db.one(
                'SELECT COUNT(*) FROM assignments'
            );
            //Convert database count into clean JS integer
            const totalCount = parseInt(countResult.count)
            /* 
            This function below is to check is the user only requested new data (such as updating the database)
            and if so will only add the new data in without rebuilding the entire html file
            */ 
            if(req.xhr || req.headers.accept?.indexOf('json')>-1){
                return res.json({
                    status: "Success",
                    count: totalCount,
                    data:assignmentData
                });
            }
            /*This here is to see if the user requested the entire html page again 
            such as loading into the page feature in the website
            */
            res.render('path',{
                assignment: assignmentData,
                totalCount: totalCount,
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
