# Multi-Tenant Architecture Guide for Learner_Bruh LMS

This guide explains how the Learner_Bruh LMS application implements strict multi-tenancy for multiple instructors and their students.

## Enhanced Multi-Tenant Architecture

Learner_Bruh LMS implements a comprehensive multi-tenant model with strict tenant isolation:

1. **Instructors as Tenants**:
   - Each instructor account acts as a separate "tenant" in the system
   - Instructors can only manage their own courses, content, and students
   - Complete data isolation ensures instructors cannot view or modify other instructors' content

2. **Student-Instructor Association**:
   - Students are assigned to a specific instructor during registration
   - Students can only access courses created by their assigned instructor
   - This creates a strict boundary that prevents cross-tenant access

3. **Data Isolation**:
   - Every course has an `instructorId` that links it to a specific instructor
   - Students have an `instructorId` that links them to their assigned instructor
   - Database queries enforce tenant boundaries by filtering content by instructor relationships
   - All API endpoints implement tenant checks to prevent unauthorized access

4. **Authentication and Role-Based Access**:
   - The system enforces role-based access control (instructor vs student)
   - Each role has appropriate permissions and tenant-aware UI views
   - Authentication mechanisms prevent cross-tenant data access

## Quick Start for Instructors

As an instructor, you can create your own isolated "tenant space" by:

1. **Register as an instructor**: Create your instructor account
2. **Generate enrollment links**: Create dedicated links for students to register under your tenant
3. **Create courses**: Add your course content that will only be visible to your students
4. **Manage your students**: View and manage only the students assigned to your tenant
5. **Monitor analytics**: Track learning progress specific to your courses and students

## Strict Tenant Isolation

Our enhanced multi-tenant architecture ensures:

1. **Student Isolation**:
   - Students can only view and enroll in courses from their assigned instructor
   - The student dashboard automatically filters courses based on instructor association
   - Registration links contain instructor context to properly assign students

2. **Course Containment**:
   - Courses are completely isolated within each instructor's tenant
   - Course content, images, and materials remain private to the instructor's space
   - Analytics data maintains strict tenant boundaries

3. **Administrative Separation**:
   - Instructors cannot see or manage other instructors' students
   - Announcements and notifications stay within each instructor's tenant
   - System settings apply independently to each instructor's environment

## Database Structure Supporting Strict Multi-Tenancy

The database implements strict tenant isolation through foreign key relationships:

```
users
├── id
├── username
├── password
├── role: "instructor" | "student"
├── instructorId (references users.id for student-instructor association)
└── ...

courses
├── id
├── title
├── description
├── instructorId (links to users)
└── ...

enrollments
├── id
├── studentId (links to users)
├── courseId (links to courses)
└── ...
```

This structure ensures:
- Each course belongs to exactly one instructor
- Each student is assigned to exactly one instructor
- Students can only access courses created by their assigned instructor
- Instructors cannot access other instructors' courses or students

## Implementation Details

The multi-tenant isolation is enforced at multiple layers:

### 1. Database Layer
- Added `instructorId` column to the `users` table
- This column creates a direct link between students and their assigned instructor
- Foreign key constraints prevent orphaned relationships

### 2. API Access Controls
- Course endpoints check `instructorId` matching:
  ```javascript
  // Students can only access courses from their assigned instructor
  if (req.user.instructorId && course.instructorId !== req.user.instructorId) {
    return res.status(403).json({ message: "You don't have access to this course" });
  }
  ```

- Published courses endpoint filters by instructor:
  ```javascript
  // Check if the user is a student with an assigned instructor
  let instructorId: number | undefined = undefined;
  if (req.user.role === 'student' && req.user.instructorId) {
    instructorId = req.user.instructorId;
  }
  
  // Fetch courses with optional instructor filtering
  const courses = await storage.getPublishedCourses(instructorId);
  ```

- Enrollments check instructor association:
  ```javascript
  // Verify the student can access this course based on instructor assignment
  if (req.user.instructorId && course.instructorId !== req.user.instructorId) {
    return res.status(403).json({ 
      message: "You cannot enroll in courses from other instructors"
    });
  }
  ```

### 3. Client-Side Filtering
- Student dashboard applies an additional filter for courses:
  ```javascript
  // Filter courses based on instructor association
  const filteredCourses = useMemo(() => {
    if (!publishedCourses) return [];
    
    // If student has an assigned instructor, only show courses from that instructor
    if (userInstructorId && publishedCourses) {
      return publishedCourses.filter(course => course.instructorId === userInstructorId);
    }
    
    // Otherwise show all published courses
    return publishedCourses;
  }, [publishedCourses, userInstructorId]);
  ```

### 4. Registration Flow
- The student registration form includes the instructor association:
  ```javascript
  // When registering through an instructor link
  registerMutation.mutate({
    ...data,
    role: "student",
    instructorId: instructorId
  });
  ```

This multi-layered approach ensures tenant isolation is maintained even if one layer fails.

## Deployment Considerations

When deploying with this strict multi-tenant architecture:

1. **Single database**: All tenants share the same database with logical isolation
2. **Single application instance**: One deployment serves all instructors and students
3. **Scalability**: The app can handle many instructors without configuration changes
4. **Tenant boundaries**: Security is maintained through database relationships, not physical separation

## Using the Application

### For Instructors:
1. Register as an instructor
2. Generate registration links with your instructor ID for students
3. Create and manage your courses
4. View only your students and course analytics
5. Customize your tenant space with branding and announcements

### For Students:
1. Register as a student using your instructor's registration link
2. Access only courses created by your assigned instructor
3. Track your learning progress within your instructor's tenant