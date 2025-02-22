import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCourseSchema, insertEnrollmentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Course management routes
  app.post("/api/courses", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    // Create a modified schema that ensures instructorId is provided
    const createCourseSchema = insertCourseSchema.extend({
      instructorId: z.number(),
    });

    try {
      const courseData = createCourseSchema.parse({
        ...req.body,
        instructorId: req.user.id,
      });

      const course = await storage.createCourse({
        ...courseData,
        modules: courseData.modules || [], // Ensure modules is never undefined
      });
      res.json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      throw error;
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const courseId = Number(req.params.id);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const course = await storage.getCourse(courseId);
    if (!course || (!course.published && course.instructorId !== req.user.id)) {
      return res.sendStatus(404);
    }

    res.json(course);
  });

  app.get("/api/courses/instructor", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    const courses = await storage.getCoursesByInstructor(req.user.id);
    res.json(courses);
  });

  app.get("/api/courses/published", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const courses = await storage.getPublishedCourses();
    res.json(courses);
  });

  app.patch("/api/courses/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "instructor") {
      return res.sendStatus(401);
    }

    const courseId = parseInt(req.params.id);
    const course = await storage.getCourse(courseId);

    if (!course || course.instructorId !== req.user.id) {
      return res.sendStatus(404);
    }

    const updatedCourse = await storage.updateCourse(courseId, req.body);
    res.json(updatedCourse);
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

  const httpServer = createServer(app);
  return httpServer;
}