Internal Assessment (IA) Marks System
Build a structured IA marks system where faculty enter subject-wise IA1/IA2/IA3 marks. The system auto-computes internal_marks for the ML risk model, replacing manual entry. Students view their marks in a dedicated page.

Proposed Changes
Backend — Data Model
[NEW] 
internal_mark.py
New InternalMark SQLAlchemy model:

Column	Type	Purpose
id	Integer PK	Auto ID
student_id	FK → student_profiles.id	Which student
subject_name	String(100)	e.g. "Mathematics", "DBMS"
ia_type	String(10)	"IA1", "IA2", or "IA3"
max_marks	Float	Default 20 (typical for Indian colleges)
obtained_marks	Float	Marks scored
faculty_id	FK → users.id	Who entered it
created_at	DateTime	Timestamp
Unique constraint: 
(student_id, subject_name, ia_type)
 — one mark per student per subject per IA.

Backend — API Routes
[NEW] 
internal_marks.py
Endpoint	Method	Auth	Purpose
/ia-marks/	GET	Faculty/HOD/Admin	List marks (filterable by ia_type, subject, student)
/ia-marks/	POST	Faculty/HOD/Admin	Enter marks for multiple students at once (bulk for a class)
/ia-marks/upload	POST	Faculty/HOD/Admin	CSV upload: roll_number,subject,ia_type,max_marks,obtained_marks
/ia-marks/subjects	GET	Faculty/HOD/Admin	List distinct subjects entered for the department
/ia-marks/my	GET	Student	Get own marks (all subjects, all IAs)
/ia-marks/student/{id}	GET	Faculty/HOD/Admin	Get a specific student's marks
Auto-ML integration: After saving marks, the route:

Computes average internal marks % across all subjects and IAs for that student
Updates the latest AcademicRecord.internal_marks field
Re-runs the ML prediction (same pattern as attendance auto-update)
Backend — Registration
[MODIFY] 
main.py
Import and register the new internal_marks router
Import the InternalMark model for SQLAlchemy table auto-creation
Frontend — Faculty IA Marks Page
[NEW] 
InternalMarks.jsx
Premium tabbed UI with:

3 Tabs: IA1 / IA2 / IA3 — faculty enters marks one IA at a time
Subject selector at top (text input for new, dropdown for existing)
Class-wide entry grid: Shows all students in dept with input fields for marks
CSV Upload button per tab — allows bulk upload
Summary section below showing entered marks overview with averages
Save button that POSTs all marks and triggers ML re-prediction
Frontend — Student Marks View
[NEW] 
MyMarks.jsx
Student-facing page showing:

Subject-wise table with IA1/IA2/IA3 columns + average
Color-coded cells (green ≥60%, yellow 40-59%, red <40%)
Overall internal marks percentage shown prominently
Frontend — API Service
[MODIFY] 
api.js
Add functions: fetchIAMarks(), saveIAMarks(), uploadIAMarksCSV(), fetchMyIAMarks(), fetchIASubjects(), fetchStudentIAMarks()

Frontend — Navigation & Routing
[MODIFY] 
FacultyLayout.jsx
[MODIFY] 
HodLayout.jsx
[MODIFY] 
AdminLayout.jsx
Add "IA Marks" nav link to each layout.

[MODIFY] 
StudentLayout.jsx
Add "My Marks" nav link.

[MODIFY] 
App.jsx
Add new routes for /*/ia-marks (faculty/HOD/admin) and /student/marks (student).

Verification Plan
Manual Testing (in browser at localhost:5173)
Faculty mark entry:

Login as faculty → Navigate to "IA Marks"
Select IA1 tab → Enter a subject name → Enter marks for students → Click Save
Verify marks appear in the summary section
Repeat for IA2 and IA3
CSV upload:

Prepare a CSV with: roll_number,subject,ia_type,max_marks,obtained_marks
Upload via the CSV button → Verify marks appear correctly
Student view:

Login as a student → Navigate to "My Marks"
Verify subject-wise IA1/IA2/IA3 breakdown is visible with correct averages
ML auto-update:

After entering marks, navigate to Students → View Records for that student
Verify the internal_marks field in the latest academic record has been auto-updated
Verify risk level reflects the new internal marks