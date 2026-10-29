// Dependencies
require('dotenv').config();

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars'); //to enable express to work with handlebars
const Handlebars = require('handlebars'); // to include the templating engine responsible for compiling templates
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.
const PORT = process.env.PORT || 3000;

// Initialization
app.use(bodyParser.json());

const db = require('./db')

// test database connection
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/templates/layouts',
  partialsDir: __dirname + '/views/partials',
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../templates'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
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
// app.use(express.static(path.join(__dirname, "../public"))); // Allows files to be accessible to browser directly

// Import feature modules
const calendarRoutes = require("./features/calendar");
const coursesRoutes = require("./features/courses");
const dashboardRoutes = require("./features/dashboard");
const importRoutes = require("./features/import");
const loginRoutes = require("./features/login");
const pathRoutes = require("./features/path");

// Connect each module to its URL
app.use("/", dashboardRoutes);
app.use("/dashboard", dashboardRoutes)
app.use("/calendar", calendarRoutes);
app.use("/courses", coursesRoutes);
app.use("/import", importRoutes);
app.use("/login", loginRoutes);
app.use("/path", pathRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});