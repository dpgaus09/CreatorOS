import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Add new images table
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Define type for enrollment progress tracking
// The progress tracking can be either the complex schema (below) or
// a simple record of lesson IDs and completion status
export const progressSchema = z.union([
  // Advanced progress schema with detailed tracking
  z.object({
    completedModules: z.array(z.number()).default([]),
    currentModule: z.number().optional(),
    lastAccessedAt: z.string().optional(),
    quizScores: z.record(z.string(), z.number()).default({}),
    notes: z.record(z.string(), z.string()).default({}),
    timeSpent: z.number().default(0)
  }),
  // Simple progress schema (currently in use)
  z.record(z.string(), z.boolean())
]);

export type EnrollmentProgress = z.infer<typeof progressSchema>;

// Keep existing tables and add accessibility preferences to users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["instructor", "student"] }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  accessibility: jsonb("accessibility").notNull().default({
    highContrast: false,
    textToSpeech: false,
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructorId: integer("instructor_id").notNull(),
  published: boolean("published").notNull().default(false),
  modules: jsonb("modules").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  progress: jsonb("progress").notNull().default({}),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Simplified announcements table - removed expiresAt field
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  active: boolean("active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// New analytics tables
export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  path: text("path").notNull(),
  query: text("query"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  deviceType: text("device_type"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const userEvents = pgTable("user_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").notNull().default({}),
  path: text("path").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const courseAnalytics = pgTable("course_analytics", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id),
  totalViews: integer("total_views").notNull().default(0),
  uniqueViews: integer("unique_views").notNull().default(0),
  totalCompletions: integer("total_completions").notNull().default(0),
  averageRating: integer("average_rating").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const sessionData = pgTable("session_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: text("session_id").notNull(),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  deviceType: text("device_type"),
  browserInfo: text("browser_info"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(enrollments),
  pageViews: many(pageViews),
  userEvents: many(userEvents),
  sessions: many(sessionData),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  enrollments: many(enrollments),
  analytics: many(courseAnalytics),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

export const moduleSchema = z.object({
  id: z.string(),
  title: z.string(),
  lessons: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(["text", "video"]),
    content: z.string(),
  })),
});

export const insertUserSchema = createInsertSchema(users, {
  role: z.enum(["instructor", "student"]),
}).extend({
  confirmPassword: z.string(),
}).omit({
  id: true,
  createdAt: true,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  enrolledAt: true,
  progress: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  createdAt: true,
});

// Simplified insert schema for announcements - removed expiresAt field
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for analytics tables
export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  timestamp: true,
});

export const insertUserEventSchema = createInsertSchema(userEvents).omit({
  id: true,
  timestamp: true,
});

export const insertCourseAnalyticsSchema = createInsertSchema(courseAnalytics).omit({
  id: true,
  lastUpdated: true,
});

export const insertSessionDataSchema = createInsertSchema(sessionData).omit({
  id: true,
  startTime: true,
  endTime: true,
  duration: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Module = z.infer<typeof moduleSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;

// Announcement types
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

// Analytics types
export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type UserEvent = typeof userEvents.$inferSelect;
export type InsertUserEvent = z.infer<typeof insertUserEventSchema>;
export type CourseAnalytic = typeof courseAnalytics.$inferSelect;
export type InsertCourseAnalytic = z.infer<typeof insertCourseAnalyticsSchema>;
export type SessionData = typeof sessionData.$inferSelect;
export type InsertSessionData = z.infer<typeof insertSessionDataSchema>;