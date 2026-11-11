// Dependencies
require('dotenv').config();

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars'); // To enable express to work with handlebars
const Handlebars = require('handlebars'); // To include the templating engine responsible for compiling templates
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object
const bcrypt = require('bcryptjs'); // To hash passwords
const axios = require('axios'); // To make HTTP requests

// Initialization
app.use(bodyParser.json());


// Create `ExpressHandlebars` instance and configure layouts and partials directory.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: path.join(__dirname, '../templates/layouts'),
  partialsDir: path.join(__dirname, '../templates/partials'),
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../templates'));

app.use('/styles', express.static(path.join(__dirname, '../styles')));

app.use(bodyParser.json()); // Specify the usage of JSON for parsing request body.


// Initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);


// Middleware
app.use(express.urlencoded({ extended: true })); // Better req.body with richer parsing
app.use(express.json()); // Lets express parse JSON bodies
app.use(express.static(path.join(__dirname, "../"))); // Allows files to be accessible to browser directly

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

// Import feature modules
const calendarRoutes = require("./features/calendar");
const { router: coursesRoutes } = require("./features/courses");
const dashboardRoutes = require("./features/dashboard");
const importRoutes = require("./features/import");
const landingRoutes = require("./features/landing");
const loginRoutes = require("./features/login");
const pathRoutes = require("./features/path");


// Connect each module to its URL
app.use("/", landingRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/calendar", calendarRoutes);
app.use("/courses", coursesRoutes);
app.use("/import", importRoutes);
app.use("/login", loginRoutes);
app.use("/path", pathRoutes);


// Export app for testing
module.exports = app;
