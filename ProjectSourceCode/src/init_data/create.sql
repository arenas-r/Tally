-- Tally database schema
-- TODO: Finalize ER diagram before implementing tables

-- TODO: Create users table
-- Include primary key, username, email, password hash, and timestamps

-- TODO: Create courses table
-- Each course should belong to a user
-- Add foreign key to users

-- TODO: Create assignments table
-- Each assignment should belong to a course
-- Include name, description, due date, priority, estimated time, and completion status

-- TODO: Create assignment_files table
-- Each file should belong to a specific assignment
-- Store file metadata such as filename, path, type, size, and upload time

-- TODO: Add foreign key constraints
-- TODO: Add ON DELETE CASCADE where appropriate
-- TODO: Add UNIQUE, NOT NULL, and CHECK constraints after schema is finalized