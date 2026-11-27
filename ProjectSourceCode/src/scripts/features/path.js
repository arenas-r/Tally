const express = require("express");
const router = express.Router();

const { db } = require("../db")

const {
    requireAuth,
    getCurrentUser
} = require("./auth"); 

router.use(requireAuth);

async function getUser(req) {
    return getCurrentUser(req).user_id;
}
// Requests here

// GET route for /path

router.get('/',async (req, res)=>{
    try{
        const userID = await getUser(req);
        const sortBy = req.query.sort || 'due_date';
        let orderByClause = 'a.due_date ASC';
        if(sortBy === 'priority'){
            orderByClause = `
            CASE
                WHEN a.priority = 'high' THEN 1
                WHEN a.priority = 'medium' THEN 2
                WHEN a.priority = 'low' THEN 3
                ELSE 4
            END ASC
        `;
        }
        else if(sortBy === 'assignment_name'){
            orderByClause = 'a.assignment_name ASC';
        }
        if(sortBy === 'estimated_time'){
            orderByClause = 'a.estimated_time DESC';
        }        

        // Fetch active assignments, completed assignments, and counts in parallel using pg-promise
        const [assignmentData, completedAssignments, activeCountResult, completedCountResult] = await Promise.all([
            //Query for any item that is not completed
            db.any(`
                SELECT
                a.assignment_name,
                a.description,
                a.assignment_id,
                a.assignment_name,
                TO_CHAR(a.due_date, 'Mon DD, YYYY') AS due_date,
                a.priority,
                a.estimated_time,
                a.completed,
                c.course_name
                FROM assignments a
                JOIN courses c
                    ON a.course_id = c.course_id
                WHERE c.user_id = $1
                    AND a.completed = FALSE
                ORDER BY ${orderByClause}
            `, [userID]),
            //Query for any item that is completed
            db.any(`
                SELECT
                a.assignment_name,
                a.description,
                a.assignment_id,
                a.assignment_name,
                TO_CHAR(a.due_date, 'Mon DD, YYYY') AS due_date,
                a.priority,
                a.estimated_time,
                a.completed,
                c.course_name
                FROM assignments a
                JOIN courses c
                    ON a.course_id = c.course_id
                WHERE c.user_id = $1
                    AND a.completed = TRUE
                ORDER BY a.due_date DESC
            `, [userID]),
            //Returns the count for how many items exist for this user that are not completed
            db.one(`
                SELECT COUNT(*) 
                FROM assignments a
                JOIN courses c
                    ON a.course_id = c.course_id
                WHERE c.user_id = $1 AND a.completed = FALSE
            `, [userID]),
            //Returns the count of how many items exist for this user that are completed
            db.one(`
                SELECT COUNT(*) 
                FROM assignments a
                JOIN courses c
                    ON a.course_id = c.course_id
                WHERE c.user_id = $1 AND a.completed = TRUE
            `, [userID])
        ]);

            //Convert database count into clean JS integer
            const totalCount = parseInt(activeCountResult.count);
            const completedCount = parseInt(completedCountResult.count);
            /* 
            This function below is to check is the user only requested new data (such as updating the database)
            and if so will only add the new data in without rebuilding the entire html file
            */ 
            if(req.xhr || req.headers.accept?.indexOf('json')>-1){
                return res.json({
                    status: "Success",
                    count: totalCount,
                    completedCount: completedCount,//Used for polling
                    data:assignmentData,
                    completedData: completedAssignments //Used for polling
                });
            }
            /*This here is to see if the user requested the entire html page again 
            such as loading into the page feature in the website
            */
            res.render('path',{
                assignment: assignmentData,
                completedAssignments: completedAssignments, //Used in the handlebars for the page load
                totalCount: totalCount,
                completedCount: completedCount, //Also used in the handlebars for the page load
                isPathPage: true,
                activeSort: sortBy
            });
    }catch(err){
        res.status(400).json({
            status:"Error",
            message: err.message
        });
    }
});
module.exports = router;
