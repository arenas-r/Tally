-- USERS
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- COURSES
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    course_code VARCHAR(10),

    CONSTRAINT fk_courses_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- ASSIGNMENTS
CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    assignment_name VARCHAR(150) NOT NULL,
    description TEXT,
    due_date TIMESTAMP NOT NULL,

    priority VARCHAR(15)
        CHECK (priority IN ('low', 'medium', 'high')),

    estimated_time INTEGER
        CHECK (estimated_time >= 0),

    completed BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_assignments_course
        FOREIGN KEY (course_id)
        REFERENCES courses(course_id)
        ON DELETE CASCADE
);


-- ASSIGNMENT FILES
CREATE TABLE assignment_files (
    file_id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL,
    original_filename VARCHAR(225) NOT NULL,
    stored_filename VARCHAR(225) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(30),
    file_size INTEGER
        CHECK (file_size >= 0),
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_files_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES assignments(assignment_id)
        ON DELETE CASCADE
);