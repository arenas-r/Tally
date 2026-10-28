-- Tally seed/test data
-- TODO: Add sample data after create.sql is finalized

-- TODO: Insert test users first

-- TODO: Insert test courses
-- Courses must reference existing user IDs

-- TODO: Insert test assignments
-- Assignments must reference existing course IDs

-- TODO: Insert test assignment file records
-- Files must reference existing assignment IDs

-- IMPORTANT:
-- Insert data in this order because of foreign keys:
-- users -> courses -> assignments -> assignment_files