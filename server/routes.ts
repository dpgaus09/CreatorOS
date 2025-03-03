import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCourseSchema, insertEnrollmentSchema, insertSettingSchema, insertImageSchema, users } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from 'express';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { eq, and, count } from "drizzle-orm";
import { analyticsMiddleware, trackCourseView } from "./analytics-middleware";

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

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
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
      res.json(setting || { value: "LearnBruh" });
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

  // Student routes
  app.get("/api/students", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    try {
      const students = await storage.getStudentsWithEnrollments();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Add a DELETE endpoint for students
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

      const course = await storage.createCourse({
        ...courseData,
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
      const courses = await storage.getPublishedCourses();
      console.log("Published courses:", courses); // Debug log
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
      if (!course || (!course.published && course.instructorId !== req.user.id)) {
        return res.sendStatus(404);
      }

      // Track course view for analytics
      await trackCourseView(courseId, req.user.id);

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
      const enrollmentData = insertEnrollmentSchema.parse({
        ...req.body,
        studentId: req.user.id
      });

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
      throw error;
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
      const response: any = {
        summary: {
          userCount: 0,
          totalPageViews: 0,
          activeSessionCount: 0,
          avgSessionDuration: 0,
          completionRate: 0,
        },
        deviceBreakdown: [],
        popularPages: [],
        mostViewedCourses: [],
      };

      // First, get the basic stats that don't rely on analytics tables
      try {
        // Count users
        const [userCountResult] = await db.select({ count: count() }).from(users);
        response.summary.userCount = userCountResult?.count || 0;

        // Get published courses for mostViewedCourses
        const publishedCourses = await storage.getPublishedCourses();
        response.mostViewedCourses = publishedCourses.map(course => ({
          course,
          totalViews: 0,
          totalCompletions: 0,
        }));
      } catch (error) {
        console.error("Error fetching basic stats:", error);
      }

      // Now try to get analytics data if available
      try {
        response.summary.totalPageViews = await storage.getPageViewCount();
        response.summary.activeSessionCount = await storage.getActiveSessionsCount();
        response.summary.avgSessionDuration = await storage.getAverageSessionDuration();
        response.deviceBreakdown = await storage.getDeviceBreakdown();
        response.popularPages = await storage.getPopularPages(10);

        const analyticsViewedCourses = await storage.getMostViewedCourses(5);
        if (analyticsViewedCourses.length > 0) {
          response.mostViewedCourses = analyticsViewedCourses;
        }

        const courseAnalytics = await storage.getAllCourseAnalytics();
        const totalCompletions = courseAnalytics.reduce((sum, item) => sum + item.totalCompletions, 0);
        const totalViews = courseAnalytics.reduce((sum, item) => sum + item.totalViews, 0);
        response.summary.completionRate = totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0;
      } catch (error) {
        console.error("Error fetching analytics data, using basic stats only:", error);
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

  const httpServer = createServer(app);
  return httpServer;
}