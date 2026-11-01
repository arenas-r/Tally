const express = require("express");
const router = express.Router();

const db = require("../db")

// Requests here

// GET route for /path
router.get('/', (req, res) => {
    // Pass test data to your Handlebars template
    res.render('partials/PathStructure', {
        title: 'Homework Path',
        assignments: [
            { id: 1, name: 'CSCI 2400 - Lab 1', dueDate: 'Tomorrow', details: 'Complete binary lab' },
            { id: 2, name: 'MATH 2400 - HW 4', dueDate: 'Friday', details: 'Section 14.3 exercises' }
        ]
    });
});

module.exports = router;
