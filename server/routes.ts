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

    const courseData = insertCourseSchema.parse(req.body);
    const course = await storage.createCourse({
      ...courseData,
      instructorId: req.user.id,
    });
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

    const enrollmentData = insertEnrollmentSchema.parse(req.body);
    const enrollment = await storage.createEnrollment({
      ...enrollmentData,
      studentId: req.user.id,
    });
    res.json(enrollment);
  });

  app.get("/api/enrollments", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "student") {
      return res.sendStatus(401);
    }

    const enrollments = await storage.getStudentEnrollments(req.user.id);
    res.json(enrollments);
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
