import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertCourseSchema, insertEnrollmentSchema, insertSettingSchema, insertImageSchema, users, insertAnnouncementSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from 'express';
// Now importing password functions from auth.ts
import { db, pool } from "./db";
import { eq, and, count } from "drizzle-orm";
import { analyticsMiddleware, trackCourseView, trackCourseCompletion } from "./analytics-middleware";

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// We're now importing hashPassword from auth.ts

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment monitoring - serves both /health and /api/health
  app.get(['/health', '/api/health'], (req, res) => {
    // Prepare the response object
    const response = {
      status: "minimal",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.version,
      database: "unknown",
      message: "Application running"
    };
    
    // Always send a 200 response
    res.status(200).json(response);
    
    // Attempt a database check in the background
    // This won't block the response but logs status
    try {
      if (pool && typeof pool.query === 'function') {
        pool.query('SELECT 1')
          .then(() => {
            console.log("Health check: Database connected");
          })
          .catch((err: Error) => {
            console.warn("Health check: Database connectivity issue:", err.message);
          });
      }
    } catch (error) {
      console.warn("Health check background check error:", error);
    }
  });
  setupAuth(app);

  // Register the analytics middleware
  app.use(analyticsMiddleware);

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }

  // Settings routes
  app.get("/api/settings/lms-name", async (req, res) => {
    try {
      const setting = await storage.getSetting("lms-name");
      res.json(setting || { value: "CreatorOS" });
    } catch (error) {
      console.error("Error fetching LMS name:", error);
      res.status(500).json({ message: "Failed to fetch LMS name" });
    }
  });

  app.post("/api/settings/lms-name", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const settingData = insertSettingSchema.parse({
        name: "lms-name",
        value: req.body.value
      });

      const setting = await storage.updateSetting(settingData.name, settingData.value);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error updating LMS name:", error);
      res.status(500).json({ message: "Failed to update LMS name" });
    }
  });

  // Add these routes after the existing lms-name routes
  app.get("/api/settings/enrollment-url", async (req, res) => {
    try {
      const setting = await storage.getSetting("enrollment-url");
      res.json(setting || { value: "/auth/login" });
    } catch (error) {
      console.error("Error fetching enrollment URL:", error);
      res.status(500).json({ message: "Failed to fetch enrollment URL" });
    }
  });

  app.post("/api/settings/enrollment-url", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const settingData = insertSettingSchema.parse({
        name: "enrollment-url",
        value: req.body.value
      });

      const setting = await storage.updateSetting(settingData.name, settingData.value);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error updating enrollment URL:", error);
      res.status(500).json({ message: "Failed to update enrollment URL" });
    }
  });
  
  // Stripe customer portal URL routes
  app.get("/api/settings/stripe-portal-url", async (req, res) => {
    try {
      const setting = await storage.getSetting("stripe-portal-url");
      res.json(setting || { value: "" });
    } catch (error) {
      console.error("Error fetching Stripe portal URL:", error);
      res.status(500).json({ message: "Failed to fetch Stripe portal URL" });
    }
  });

  app.post("/api/settings/stripe-portal-url", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const settingData = insertSettingSchema.parse({
        name: "stripe-portal-url",
        value: req.body.value
      });

      const setting = await storage.updateSetting(settingData.name, settingData.value);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error updating Stripe portal URL:", error);
      res.status(500).json({ message: "Failed to update Stripe portal URL" });
    }
  });

  // Add the logo upload endpoint after existing settings endpoints
  app.post("/api/settings/logo", upload.single('logo'), async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      // Handle removing logo case (value is sent directly in body without a file)
      if (req.body.value === "") {
        const settingData = insertSettingSchema.parse({
          name: "logo-url",
          value: ""
        });

        const setting = await storage.updateSetting(settingData.name, settingData.value);
        return res.json(setting);
      }

      // Handle file upload case
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const logoUrl = `${baseUrl}/uploads/${req.file.filename}`;

      const settingData = insertSettingSchema.parse({
        name: "logo-url",
        value: logoUrl
      });

      const setting = await storage.updateSetting(settingData.name, settingData.value);
      res.json(setting);
    } catch (error) {
      console.error("Error uploading logo:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  app.get("/api/settings/logo", async (req, res) => {
    try {
      const setting = await storage.getSetting("logo-url");
      res.json(setting || { value: "" });
    } catch (error) {
      console.error("Error fetching logo URL:", error);
      res.status(500).json({ message: "Failed to fetch logo URL" });
    }
  });

  // System announcements settings
  app.get("/api/settings/announcements-enabled", async (req, res) => {
    try {
      const setting = await storage.getSetting("announcements-enabled");
      res.json(setting || { value: "true" });
    } catch (error) {
      console.error("Error fetching announcements setting:", error);
      res.status(500).json({ message: "Failed to fetch announcements setting" });
    }
  });

  app.post("/api/settings/announcements-enabled", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const settingData = insertSettingSchema.parse({
        name: "announcements-enabled",
        value: req.body.value
      });

      const setting = await storage.updateSetting(settingData.name, settingData.value);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error updating announcements setting:", error);
      res.status(500).json({ message: "Failed to update announcements setting" });
    }
  });

  // Announcements API endpoints
  app.get("/api/announcements", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Routes for active announcements
  app.get("/api/announcements/active", async (req, res) => {
    try {
      // Check if announcements are enabled
      const enabled = await storage.getSetting("announcements-enabled");
      if (enabled && enabled.value === "false") {
        console.log("Announcements are disabled. Returning empty array.");
        return res.json([]);
      }

      // Get active announcements
      console.log("Fetching active announcements...");
      const announcements = await storage.getActiveAnnouncements();
      console.log("Active announcements fetched successfully:", JSON.stringify(announcements));

      return res.json(announcements);
    } catch (error) {
      console.error("Error fetching active announcements:", error);
      res.status(500).json({ message: "Failed to fetch active announcements" });
    }
  });

  app.get("/api/announcements/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const announcementId = parseInt(req.params.id);
      if (isNaN(announcementId)) {
        return res.status(400).json({ message: "Invalid announcement ID" });
      }

      const announcement = await storage.getAnnouncement(announcementId);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      res.json(announcement);
    } catch (error) {
      console.error("Error fetching announcement:", error);
      res.status(500).json({ message: "Failed to fetch announcement" });
    }
  });

  app.post("/api/announcements", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      console.log("Creating announcement with data:", JSON.stringify(req.body));

      const announcementData = insertAnnouncementSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });

      console.log("Parsed announcement data:", JSON.stringify(announcementData));

      const announcement = await storage.createAnnouncement(announcementData);
      res.json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.message);
        return res.status(400).json({ message: error.message });
      }
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.patch("/api/announcements/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const announcementId = parseInt(req.params.id);
      if (isNaN(announcementId)) {
        return res.status(400).json({ message: "Invalid announcement ID" });
      }

      const announcement = await storage.getAnnouncement(announcementId);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      const updatedAnnouncement = await storage.updateAnnouncement(announcementId, req.body);
      res.json(updatedAnnouncement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const announcementId = parseInt(req.params.id);
      if (isNaN(announcementId)) {
        return res.status(400).json({ message: "Invalid announcement ID" });
      }

      const announcement = await storage.getAnnouncement(announcementId);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      console.log(`Deleting announcement with ID: ${announcementId}`);
      await storage.deleteAnnouncement(announcementId);
      console.log(`Announcement ${announcementId} deleted successfully`);

      res.json({ message: "Announcement deleted successfully" });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // Image upload route
  app.post("/api/images/upload", upload.single('image'), async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      const courseId = parseInt(req.body.courseId);
      if (isNaN(courseId)) {
        throw new Error('Invalid course ID');
      }

      // Get the course to verify ownership
      const course = await storage.getCourse(courseId);
      if (!course || course.instructorId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to upload to this course" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

      const imageData = insertImageSchema.parse({
        courseId,
        filename: req.file.filename,
        url: imageUrl
      });

      const image = await storage.createImage(imageData);
      res.json(image);
    } catch (error) {
      console.error("Error uploading image:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));
  
  // Get images for a course
  app.get("/api/courses/:courseId/images", async (req, res) => {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }
    
    try {
      const images = await storage.getImagesByCourse(courseId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching course images:", error);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  // Student routes
  app.get("/api/students", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      // Only show students assigned to this instructor if strict multi-tenant mode
      const instructorId = req.user.id;
      const students = await storage.getStudentsWithEnrollments(instructorId);
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });
  
  // Add endpoint to get instructor information for student registration
  app.get("/api/users/instructor/:id", async (req, res) => {
    try {
      const instructorId = parseInt(req.params.id);
      if (isNaN(instructorId)) {
        return res.status(400).json({ message: "Invalid instructor ID" });
      }

      const instructor = await storage.getUser(instructorId);
      if (!instructor || instructor.role !== "instructor") {
        return res.status(404).json({ message: "Instructor not found" });
      }

      // Return instructor info without sensitive data
      const { password, ...instructorData } = instructor;
      res.json(instructorData);
    } catch (error) {
      console.error("Error fetching instructor:", error);
      res.status(500).json({ message: "Failed to fetch instructor" });
    }
  });

  // Add a DELETE endpoint for students (admin use)
  app.delete("/api/students/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const studentId = parseInt(req.params.id);
      if (isNaN(studentId)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      // Check if the student exists and is actually a student
      const student = await storage.getUser(studentId);
      if (!student || student.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }

      // Delete the student
      await storage.deleteStudent(studentId);
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });
  
  // Add endpoint for users to update their profile
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { name, email } = req.body;
      
      // Update user profile (name and email only)
      const updatedUser = await storage.updateUser(req.user.id, {
        name,
        email
      });

      // Don't send password back to client
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // Add endpoint for user to update their password
  app.patch("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { currentPassword, newPassword } = req.body;
      
      // Get current user
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const passwordMatch = await comparePasswords(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash and update new password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(req.user.id, {
        password: hashedPassword
      });
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });
  
  // Add endpoint for user to delete their own account
  app.delete("/api/user/account", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Only students can delete their own accounts through this endpoint
      if (req.user.role === "student") {
        await storage.deleteStudent(req.user.id);
        // Destroy session
        req.logout((err) => {
          if (err) {
            console.error("Error logging out:", err);
            return res.status(500).json({ message: "Error during logout" });
          }
          res.json({ message: "Account deleted successfully" });
        });
      } else {
        res.status(403).json({ message: "Only students can delete their accounts" });
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Public API endpoint for accessing published courses without auth
  app.get("/api/courses/public", async (req, res) => {
    try {
      const courses = await storage.getPublishedCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching public courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Course management routes
  app.post("/api/courses", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const courseData = insertCourseSchema.parse({
        ...req.body,
        instructorId: req.user.id,
      });

      // Ensure all required fields have appropriate values with correct types
      const course = await storage.createCourse({
        title: courseData.title,
        description: courseData.description,
        instructorId: courseData.instructorId,
        published: courseData.published || false,
        modules: courseData.modules || [],
        createdAt: new Date(),
      });
      res.json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  app.get("/api/courses/instructor", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const courses = await storage.getCoursesByInstructor(req.user.id);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching instructor courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Important: Put the published courses route BEFORE the dynamic :id route
  app.get("/api/courses/published", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Check if the user is a student with an assigned instructor
      let instructorId: number | undefined = undefined;
      if (req.user.role === 'student' && req.user.instructorId) {
        instructorId = req.user.instructorId;
        console.log(`Filtering courses for student by instructor ID: ${instructorId}`);
      }
      
      // Fetch courses with optional instructor filtering
      const courses = await storage.getPublishedCourses(instructorId);
      console.log("Published courses count:", courses.length); // Debug log
      res.json(courses);
    } catch (error) {
      console.error("Error fetching published courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({ message: "Invalid course ID" });
      }

      const course = await storage.getCourse(courseId);
      
      // Basic validation: course must exist
      if (!course) {
        return res.sendStatus(404);
      }
      
      // Access control rules:
      // 1. Instructors can access their own courses (published or not)
      // 2. Students can access published courses from their assigned instructor
      if (req.user.role === "instructor") {
        // Instructors can only access their own courses
        if (course.instructorId !== req.user.id) {
          return res.status(403).json({ message: "You don't have access to this course" });
        }
      } else if (req.user.role === "student") {
        // Students can only access published courses
        if (!course.published) {
          return res.status(404).json({ message: "Course not found" });
        }
        
        // If student has an assigned instructor, they can only access courses from that instructor
        if (req.user.instructorId && course.instructorId !== req.user.instructorId) {
          return res.status(403).json({ message: "You don't have access to this course" });
        }
      }

      // Track course view for analytics - only track student views, not instructor previews
      if (req.user.role === "student") {
        console.log(`Tracking course view for course ID: ${courseId}, user ID: ${req.user.id}`);
        await trackCourseView(courseId, req.user.id);
      }

      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.patch("/api/courses/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({ message: "Invalid course ID" });
      }

      const course = await storage.getCourse(courseId);
      if (!course || course.instructorId !== req.user.id) {
        return res.sendStatus(404);
      }

      const updatedCourse = await storage.updateCourse(courseId, req.body);
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  // Enrollment routes
  app.post("/api/enrollments", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "student") {
      return res.sendStatus(401);
    }

    try {
      const courseId = req.body.courseId;
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }
      
      // Get the course to verify the instructor
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Verify the student can access this course based on instructor assignment
      if (req.user.instructorId && course.instructorId !== req.user.instructorId) {
        return res.status(403).json({ 
          message: "You cannot enroll in courses from other instructors"
        });
      }
      
      const enrollmentData = insertEnrollmentSchema.parse({
        ...req.body,
        studentId: req.user.id
      });
      
      // Check if student is already enrolled in this course
      const existingEnrollment = await storage.getEnrollment(req.user.id, courseId);
      if (existingEnrollment) {
        return res.status(400).json({ message: "You are already enrolled in this course" });
      }

      const enrollment = await storage.createEnrollment({
        ...enrollmentData,
        progress: {},
        enrolledAt: new Date(),
      });
      res.json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error creating enrollment:", error);
      res.status(500).json({ message: "Failed to create enrollment" });
    }
  });

  app.get("/api/enrollments", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "student") {
      return res.sendStatus(401);
    }

    const enrollments = await storage.getStudentEnrollments(req.user.id);
    res.json(enrollments);
  });

  app.get("/api/enrollments/:courseId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "student") {
      return res.sendStatus(401);
    }

    const courseId = parseInt(req.params.courseId);
    const enrollment = await storage.getEnrollment(req.user.id, courseId);

    if (!enrollment) {
      return res.sendStatus(404);
    }

    res.json(enrollment);
  });

  app.patch("/api/enrollments/:courseId/progress", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "student") {
      return res.sendStatus(401);
    }

    const courseId = parseInt(req.params.courseId);
    const enrollment = await storage.getEnrollment(req.user.id, courseId);

    if (!enrollment) {
      return res.sendStatus(404);
    }

    const updatedEnrollment = await storage.updateEnrollmentProgress(
      enrollment.id,
      req.body
    );
    res.json(updatedEnrollment);
  });
  
  // Route to track and record course completion
  app.post("/api/courses/:courseId/complete", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "student") {
      return res.sendStatus(401);
    }

    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    try {
      console.log(`Recording course completion for course ID: ${courseId}`);
      
      // Track the course completion in analytics
      await trackCourseCompletion(courseId);
      
      // Return success response
      res.json({ 
        success: true, 
        message: "Course completion recorded successfully" 
      });
    } catch (error) {
      console.error("Error recording course completion:", error);
      res.status(500).json({ message: "Failed to record course completion" });
    }
  });

  // Add this route after the existing user routes
  app.patch("/api/user/accessibility", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const updatedUser = await storage.updateUser(req.user.id, {
        accessibility: req.body
      });

      // Don't send password back to client
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating accessibility settings:", error);
      res.status(500).json({ message: "Failed to update accessibility settings" });
    }
  });

  // Add password reset route
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, username, role, newPassword } = req.body;

      // Find user matching all three criteria
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, email),
            eq(users.username, username),
            eq(users.role, role)
          )
        );

      if (!user) {
        return res.status(400).json({
          message: "The email and username do not match, contact the administrator if you need help reseting your password."
        });
      }

      // Update password
      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(user.id, {
        password: hashedPassword,
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Analytics API endpoints
  app.get("/api/analytics/dashboard", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      // Initialize response object with default values
      const response = {
        summary: {
          userCount: 0,
          totalPageViews: 0,
          activeSessionCount: 0,
          avgSessionDuration: 0,
          completionRate: 0,
          courseCount: 0,
          publishedCourseCount: 0,
          enrollmentCount: 0,
          activeEnrollmentCount: 0,
          newUserCount: 0,
        },
        deviceBreakdown: [] as {deviceType: string, count: number}[],
        popularPages: [] as {path: string, count: number}[],
        mostViewedCourses: [] as any[],
      };

      // First, get all the basic stats
      try {
        // Count users
        const [userCountResult] = await db.select({ count: count() }).from(users);
        response.summary.userCount = userCountResult?.count || 0;

        // Count courses and published courses for this instructor
        const instructorCourses = await storage.getCoursesByInstructor(req.user.id);
        const publishedCourses = instructorCourses.filter(c => c.published);
        response.summary.courseCount = instructorCourses.length;
        response.summary.publishedCourseCount = publishedCourses.length;

        // Count enrollments
        const students = await storage.getStudentsWithEnrollments();
        const allEnrollments = students.flatMap(s => s.enrollments);
        response.summary.enrollmentCount = allEnrollments.length;

        // Get total page views
        response.summary.totalPageViews = await storage.getPageViewCount();

        // Get active sessions count
        try {
          response.summary.activeSessionCount = await storage.getActiveSessionsCount();
        } catch (error) {
          console.error("Error getting active session count:", error);
        }

        // Get average session duration
        try {
          response.summary.avgSessionDuration = await storage.getAverageSessionDuration();
        } catch (error) {
          console.error("Error getting average session duration:", error);
        }

        // Get device breakdown
        try {
          response.deviceBreakdown = await storage.getDeviceBreakdown();
        } catch (error) {
          console.error("Error getting device breakdown:", error);
        }

        // Get popular pages
        try {
          response.popularPages = await storage.getPopularPages(5);
        } catch (error) {
          console.error("Error getting popular pages:", error);
        }

        // Get most viewed courses
        try {
          const mostViewedCourses = await storage.getMostViewedCourses(5);
          
          // Transform to expected format
          response.mostViewedCourses = mostViewedCourses.map(item => ({
            course: item.course,
            totalViews: item.totalViews,
            totalCompletions: item.totalCompletions,
          }));
        } catch (error) {
          console.error("Error getting most viewed courses:", error);
          
          // Fallback for most viewed courses if the above fails
          const courseAnalytics = await storage.getAllCourseAnalytics();
          const coursesWithAnalytics = publishedCourses.map(course => {
            const analytics = courseAnalytics.find(a => a.courseId === course.id);
            return {
              course,
              totalViews: analytics?.totalViews || 0,
              totalCompletions: analytics?.totalCompletions || 0,
            };
          });

          // Sort by views (descending)
          response.mostViewedCourses = coursesWithAnalytics
            .sort((a, b) => b.totalViews - a.totalViews)
            .slice(0, 5);
        }

        // Calculate completion rate from real data
        const courseAnalytics = await storage.getAllCourseAnalytics();
        const totalCompletions = courseAnalytics.reduce((sum, item) => sum + item.totalCompletions, 0);
        const totalViews = courseAnalytics.reduce((sum, item) => sum + item.totalViews, 0);
        response.summary.completionRate = totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0;
      } catch (error) {
        console.error("Error fetching basic stats:", error);
      }

      res.json(response);
    } catch (error) {
      console.error("Error fetching analytics dashboard:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  app.get("/api/analytics/user-activity", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      // Initialize with empty activity
      let formattedActivity = [];

      // Try to get analytics data if available
      try {
        // Get the most recent page views for activity tracking
        const recentPageViews = await storage.getPageViews(50);

        // Format and group by date for the chart
        const activityByDay: Record<string, {date: string, views: number, uniqueUsers: Set<number>}> = {};

        recentPageViews.forEach(view => {
          const date = new Date(view.timestamp);
          const day = date.toLocaleDateString();

          if (!activityByDay[day]) {
            activityByDay[day] = { date: day, views: 0, uniqueUsers: new Set() };
          }

          activityByDay[day].views += 1;
          if (view.userId) {
            activityByDay[day].uniqueUsers.add(view.userId);
          }
        });

        // Convert to array and replace Set with count
        formattedActivity = Object.values(activityByDay).map(item => ({
          date: item.date,
          views: item.views,
          uniqueUsers: item.uniqueUsers.size,
        }));

        // Sort by date
        formattedActivity.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      } catch (error) {
        console.error("Error processing user activity, returning empty data:", error);

        // Generate current date for empty placeholder
        const today = new Date().toLocaleDateString();
        formattedActivity = [
          { date: today, views: 0, uniqueUsers: 0 }
        ];
      }

      res.json(formattedActivity);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ message: "Failed to fetch user activity data" });
    }
  });

  app.get("/api/analytics/course/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({ message: "Invalid course ID" });
      }

      // Get course to verify ownership
      const course = await storage.getCourse(courseId);
      if (!course || course.instructorId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this course's analytics" });
      }

      let analytics;
      try {
        analytics = await storage.getCourseAnalytics(courseId);
      } catch (error) {
        console.error("Analytics table not available, creating default analytics object", error);
      }

      if (!analytics) {
        // Return default analytics if not found
        analytics = {
          id: 0,
          courseId,
          totalViews: 0,
          uniqueViews: 0,
          totalCompletions: 0,
          averageRating: 0,
          lastUpdated: new Date()
        };
      }

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching course analytics:", error);
      res.status(500).json({ message: "Failed to fetch course analytics" });
    }
  });

  app.get("/api/analytics/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const setting = await storage.getSetting("analytics-enabled");
      res.json(setting || { value: "true" });
    } catch (error) {
      console.error("Error fetching analytics setting:", error);
      res.status(500).json({ message: "Failed to fetch analytics setting" });
    }
  });

  app.post("/api/analytics/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const settingData = insertSettingSchema.parse({
        name: "analytics-enabled",
        value: req.body.value
      });

      const setting = await storage.updateSetting(settingData.name, settingData.value);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error updating analytics setting:", error);
      res.status(500).json({ message: "Failed to update analytics setting" });
    }
  });
  
  // Special endpoint to verify and decode user password
  app.get("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      // Get the user from the database
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return a message indicating this endpoint should be updated to use a proper mechanism
      // In a real app, we wouldn't store or retrieve plaintext passwords
      res.json({ 
        message: "For security reasons, we cannot retrieve your actual password. Please use the reset password function if needed.",
        password: "ResetPasswordIfNeeded" // Placeholder text
      });
    } catch (error) {
      console.error("Error retrieving password:", error);
      res.status(500).json({ message: "An error occurred while retrieving the password" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}