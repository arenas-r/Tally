# Tally – User Acceptance Testing Plan

## 1. Scope

This UAT plan evaluates whether users can successfully complete common tasks within Tally.

The three features selected for testing are:

1. **Account Registration and Login:** Users can create an account, sign in, and receive appropriate feedback when entering invalid information.
2. **Course Management:** Users can add courses to their accounts and view their existing courses.
3. **Assignment Importing and Calendar:** Users can import assignments from a calendar file and view their assignments in the application calendar.

These features represent important workflows that users are expected to complete when using Tally.

## 2. Acceptance Criteria

### Feature 1: Account Registration and Login

- Users can create an account by providing a valid username, email, password, and password confirmation.
- Successful registration redirects users to the login page.
- Missing or invalid registration information produces a clear error message.
- Users can sign in using their newly created account credentials.
- Users entering incorrect login credentials cannot access protected features.

### Feature 2: Course Management

- Users can successfully add a course to their account.
- Newly added courses appear in the user's course list.
- Users receive appropriate feedback when attempting to add a course with missing or invalid information.
- Users can view their existing courses after navigating away and returning to the course page.

### Feature 3: Assignment Importing and Calendar

- Users can import a valid calendar file containing assignments.
- Imported assignments appear in the appropriate calendar or assignment view.
- Assignment information, including its title, course, and due date, is displayed correctly.
- Users receive clear feedback when attempting to import an invalid or unsupported calendar file.

## 3. Test Environment

**Environment:** Local development environment using Docker Compose.

**Application URL:** http://localhost:3000

**Setup instructions:**
1. Clone the Tally repository.
2. Navigate to the project directory.
3. Configure the required environment variables.
4. Start the application and database using Docker Compose.
5. Open the application in a supported web browser.

**Browser/device:** Google Chrome on a desktop or laptop computer.

**Application version:** Record the Git commit hash when UAT is executed.

**Database:** Local PostgreSQL development database.

## 4. Testers

The intended testers are college students who regularly manage multiple courses and assignments.

The team will coordinate tester recruitment and provide instructions for completing the test cases.

Planned tester IDs:

- T1: Representative student user.
- T2: Representative student user.
- T3: Representative student user.

Testers outside the development team will be recruited when feasible. If team members must act as testers, they will be documented as proxies, and this limitation will be recorded.

No unnecessary personal information will be collected.

## 5. Test Cases

| Test ID | Feature / Requirement | Acceptance Criterion | Preconditions | Test Data | User Steps | Expected Result | Tester ID | Actual Result | Status | Issue / Follow-up |
|---|---|---|---|---|---|---|---|---|---|---|
| UAT-01 | Registration / Account Creation | Valid information creates an account and navigates to the login page. | User is signed out and registration page is open. | Username: uat_student_01; Email: uat_student_01@example.com; Password: TestPassword123!; Confirmation: TestPassword123! | 1. Open registration. 2. Enter all test information. 3. Submit registration. | Account is created successfully and the user is redirected to the login page. | T1 | Not run | Not run | None yet |
| UAT-02 | Registration / Invalid Input | Missing password produces clear feedback and prevents registration. | User is signed out and registration page is open. | Username: uat_student_02; Email: uat_student_02@example.com; Password: blank. | 1. Enter username and email. 2. Leave password blank. 3. Submit registration. | Registration is rejected and a message identifies that the password must be at least 8 characters. | T1 | Not run | Not run | None yet |
| UAT-03 | Course Management / Add Course | Users can add a course and see it in their course list. | User is signed in and has access to course management. | Course name: UAT Introduction to Programming; Course code: UAT1000 | 1. Navigate to courses. 2. Open the add-course option. 3. Enter the course information. 4. Submit. 5. View the course list. | The course is added and appears in the user's course list with the correct name and course code. | T2 | Not run | Not run | None yet |
| UAT-04 | Course Management / Invalid Input | Missing required course information is rejected with clear feedback. | User is signed in and can access course management. | Course name: blank; Course code: UAT2000 | 1. Navigate to courses. 2. Open the add-course option. 3. Leave the course name blank. 4. Enter the course code. 5. Submit. | The course is not added and the user receives feedback identifying the missing required information. | T2 | Not run | Not run | None yet |
| UAT-05 | Assignment Import / Valid Calendar | Users can import a valid calendar file and see the imported assignments. | User is signed in, has an appropriate course available, and can access assignment importing. | A valid test iCalendar (.ics) file containing an assignment titled UAT Test Assignment, associated with UAT1000, due on December 1, 2026. | 1. Navigate to assignment importing. 2. Select the test calendar file. 3. Submit the import. 4. Open the calendar or assignment view. | The assignment appears in the application with the expected title, course, and due date. | T3 | Not run | Not run | None yet |
| UAT-06 | Assignment Import / Invalid File | Invalid calendar files are rejected with understandable feedback. | User is signed in and can access assignment importing. | A plain text file named invalid-calendar.txt containing "This is not a valid calendar file." | 1. Navigate to assignment importing. 2. Select the invalid file. 3. Attempt to import it. | The import is rejected and the user receives a clear error message. No invalid assignment is displayed in the calendar. | T3 | Not run | Not run | None yet |

## 6. Results and Follow-Up

All test cases are currently marked **Not run**.

Testing will be performed during the project's scheduled testing milestone.

After execution, the team will:

- Record the actual results for each test.
- Mark each test as Pass, Fail, or Blocked.
- Document any unexpected behavior or usability problems.
- Record follow-up actions for failed tests.
- Retest any fixes and document the results.
- Include completed UAT observations in the final project report.

No test results or observations will be recorded until the tests have actually been performed.