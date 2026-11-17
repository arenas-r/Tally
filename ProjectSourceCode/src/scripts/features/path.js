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
        console.log("👉 CURRENT LOGGED-IN USER ID:", userID);
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
        const assignmentData = await db.any(`
            SELECT
            a.assignment_name,
            a.description,
            TO_CHAR(a.due_date, 'Mon DD, YYYY') AS due_date,
            a.priority,
            a.estimated_time,
            a.completed
            FROM assignments a
            JOIN courses c
                ON a.course_id = c.course_id
            WHERE c.user_id = $1
                AND a.completed = FALSE
            ORDER BY ${orderByClause}
            `,[userID]);
            console.log("👉 ASSIGNMENTS FOUND FOR PATH:", assignmentData);

            //Get metadata that will be used to detect changes from the database, find the number of assignments in databse
            const countResult = await db.one(
                `SELECT COUNT(*) 
                FROM assignments a
                JOIN courses c
                    ON a.course_id = c.course_id
                WHERE c.user_id = $1
            `,[userID]);
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
