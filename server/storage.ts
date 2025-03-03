import { users, courses, enrollments, settings, images, pageViews, userEvents, courseAnalytics, sessionData } from "@shared/schema";
import { InsertUser, User, Course, Enrollment, Setting, InsertImage, Image, InsertPageView, PageView, InsertUserEvent, UserEvent, InsertCourseAnalytic, CourseAnalytic, InsertSessionData, SessionData } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllStudents(): Promise<User[]>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  deleteStudent(id: number): Promise<void>; // Added this method

  // Course management
  createCourse(course: Omit<Course, "id">): Promise<Course>;
  updateCourse(id: number, course: Partial<Course>): Promise<Course>;
  getCourse(id: number): Promise<Course | undefined>;
  getCoursesByInstructor(instructorId: number): Promise<Course[]>;
  getPublishedCourses(): Promise<Course[]>;

  // Enrollments
  createEnrollment(enrollment: Omit<Enrollment, "id">): Promise<Enrollment>;
  getEnrollment(studentId: number, courseId: number): Promise<Enrollment | undefined>;
  getStudentEnrollments(studentId: number): Promise<Enrollment[]>;
  getStudentsWithEnrollments(): Promise<(User & { enrollments: (Enrollment & { course?: Course })[] })[]>;
  updateEnrollmentProgress(id: number, progress: Record<string, any>): Promise<Enrollment>;

  // Settings
  getSetting(name: string): Promise<Setting | undefined>;
  updateSetting(name: string, value: string): Promise<Setting>;

  // Image Management
  createImage(image: InsertImage): Promise<Image>;
  getImagesByCourse(courseId: number): Promise<Image[]>;

  // Analytics
  createPageView(pageView: InsertPageView): Promise<PageView>;
  getPageViews(limit?: number): Promise<PageView[]>;
  getPageViewsByPath(path: string): Promise<PageView[]>;
  getPageViewsByUserId(userId: number): Promise<PageView[]>;
  getPageViewCount(): Promise<number>;
  getPopularPages(limit?: number): Promise<{path: string, count: number}[]>;

  createUserEvent(event: InsertUserEvent): Promise<UserEvent>;
  getUserEvents(limit?: number): Promise<UserEvent[]>;
  getUserEventsByType(eventType: string): Promise<UserEvent[]>;
  getUserEventsByUserId(userId: number): Promise<UserEvent[]>;

  getCourseAnalytics(courseId: number): Promise<CourseAnalytic | undefined>;
  createCourseAnalytics(analytics: Partial<InsertCourseAnalytic>): Promise<CourseAnalytic>;
  updateCourseAnalytics(courseId: number, updates: Partial<CourseAnalytic>): Promise<CourseAnalytic>;
  getAllCourseAnalytics(): Promise<CourseAnalytic[]>;
  getMostViewedCourses(limit?: number): Promise<(CourseAnalytic & { course: Course })[]>;

  createSession(session: InsertSessionData): Promise<SessionData>;
  getSessionBySessionId(sessionId: string): Promise<SessionData | undefined>;
  updateSession(id: number, updates: Partial<SessionData>): Promise<SessionData>;
  getActiveSessionsCount(): Promise<number>;
  getSessionsByUserId(userId: number): Promise<SessionData[]>;
  getAverageSessionDuration(): Promise<number>;
  getDeviceBreakdown(): Promise<{deviceType: string, count: number}[]>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllStudents(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.role, "student"))
      .orderBy(users.createdAt);
  }

  async getStudentsWithEnrollments(): Promise<(User & { enrollments: (Enrollment & { course?: Course })[] })[]> {
    const students = await this.getAllStudents();
    const studentsWithEnrollments = await Promise.all(
      students.map(async (student) => {
        const studentEnrollments = await db
          .select({
            enrollment: enrollments,
            course: courses,
          })
          .from(enrollments)
          .where(eq(enrollments.studentId, student.id))
          .leftJoin(courses, eq(enrollments.courseId, courses.id));

        // Transform the result to match the expected format
        const transformedEnrollments = studentEnrollments.map(({ enrollment, course }) => ({
          ...enrollment,
          course: course || undefined,
        }));

        return {
          ...student,
          enrollments: transformedEnrollments,
        };
      })
    );
    return studentsWithEnrollments;
  }

  async createCourse(course: Omit<Course, "id">): Promise<Course> {
    const [newCourse] = await db.insert(courses).values({
      ...course,
      modules: course.modules || [],
      published: course.published || false,
    }).returning();
    return newCourse;
  }

  async updateCourse(id: number, updates: Partial<Course>): Promise<Course> {
    const [updatedCourse] = await db
      .update(courses)
      .set(updates)
      .where(eq(courses.id, id))
      .returning();
    return updatedCourse;
  }

  async getCourse(id: number): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCoursesByInstructor(instructorId: number): Promise<Course[]> {
    return db
      .select()
      .from(courses)
      .where(eq(courses.instructorId, instructorId));
  }

  async getPublishedCourses(): Promise<Course[]> {
    return db
      .select()
      .from(courses)
      .where(eq(courses.published, true));
  }

  async createEnrollment(enrollment: Omit<Enrollment, "id">): Promise<Enrollment> {
    const [newEnrollment] = await db
      .insert(enrollments)
      .values(enrollment)
      .returning();
    return newEnrollment;
  }

  async getEnrollment(studentId: number, courseId: number): Promise<Enrollment | undefined> {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.courseId, courseId)
        )
      );
    return enrollment;
  }

  async getStudentEnrollments(studentId: number): Promise<Enrollment[]> {
    return db
      .select()
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId));
  }

  async updateEnrollmentProgress(
    id: number,
    progress: Record<string, any>
  ): Promise<Enrollment> {
    const [updatedEnrollment] = await db
      .update(enrollments)
      .set({ progress })
      .where(eq(enrollments.id, id))
      .returning();
    return updatedEnrollment;
  }

  async getSetting(name: string): Promise<Setting | undefined> {
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.name, name));
    return setting;
  }

  async updateSetting(name: string, value: string): Promise<Setting> {
    // Try to update existing setting
    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.name, name));

    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.name, name))
        .returning();
      return updated;
    }

    // If setting doesn't exist, create it
    const [newSetting] = await db
      .insert(settings)
      .values({ name, value })
      .returning();
    return newSetting;
  }

  async createImage(image: InsertImage): Promise<Image> {
    const [newImage] = await db.insert(images).values(image).returning();
    return newImage;
  }

  async getImagesByCourse(courseId: number): Promise<Image[]> {
    return db
      .select()
      .from(images)
      .where(eq(images.courseId, courseId));
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Implementation of deleteStudent method
  async deleteStudent(id: number): Promise<void> {
    // First delete any enrollments associated with this student
    await db
      .delete(enrollments)
      .where(eq(enrollments.studentId, id));

    // Then delete the student
    await db
      .delete(users)
      .where(and(
        eq(users.id, id),
        eq(users.role, "student")  // Ensure we only delete students
      ));
  }

  // Analytics implementation

  async createPageView(pageView: InsertPageView): Promise<PageView> {
    const [newPageView] = await db.insert(pageViews).values(pageView).returning();
    return newPageView;
  }

  async getPageViews(limit: number = 100): Promise<PageView[]> {
    return db
      .select()
      .from(pageViews)
      .orderBy(desc(pageViews.timestamp))
      .limit(limit);
  }

  async getPageViewsByPath(path: string): Promise<PageView[]> {
    return db
      .select()
      .from(pageViews)
      .where(eq(pageViews.path, path))
      .orderBy(desc(pageViews.timestamp));
  }

  async getPageViewsByUserId(userId: number): Promise<PageView[]> {
    return db
      .select()
      .from(pageViews)
      .where(eq(pageViews.userId, userId))
      .orderBy(desc(pageViews.timestamp));
  }

  async getPageViewCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(pageViews);
    return result?.count || 0;
  }

  async getPopularPages(limit: number = 10): Promise<{path: string, count: number}[]> {
    const result = await db
      .select({
        path: pageViews.path,
        count: count(),
      })
      .from(pageViews)
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(limit);

    return result;
  }

  async createUserEvent(event: InsertUserEvent): Promise<UserEvent> {
    const [newEvent] = await db.insert(userEvents).values(event).returning();
    return newEvent;
  }

  async getUserEvents(limit: number = 100): Promise<UserEvent[]> {
    return db
      .select()
      .from(userEvents)
      .orderBy(desc(userEvents.timestamp))
      .limit(limit);
  }

  async getUserEventsByType(eventType: string): Promise<UserEvent[]> {
    return db
      .select()
      .from(userEvents)
      .where(eq(userEvents.eventType, eventType))
      .orderBy(desc(userEvents.timestamp));
  }

  async getUserEventsByUserId(userId: number): Promise<UserEvent[]> {
    return db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, userId))
      .orderBy(desc(userEvents.timestamp));
  }

  async getCourseAnalytics(courseId: number): Promise<CourseAnalytic | undefined> {
    const [analytics] = await db
      .select()
      .from(courseAnalytics)
      .where(eq(courseAnalytics.courseId, courseId));
    return analytics;
  }

  async createCourseAnalytics(analytics: Partial<InsertCourseAnalytic>): Promise<CourseAnalytic> {
    const fullAnalytics = {
      ...analytics,
      totalViews: analytics.totalViews || 0,
      uniqueViews: analytics.uniqueViews || 0,
      totalCompletions: analytics.totalCompletions || 0,
      averageRating: analytics.averageRating || 0,
    };

    const [newAnalytics] = await db
      .insert(courseAnalytics)
      .values(fullAnalytics as InsertCourseAnalytic)
      .returning();
    return newAnalytics;
  }

  async updateCourseAnalytics(courseId: number, updates: Partial<CourseAnalytic>): Promise<CourseAnalytic> {
    const [updatedAnalytics] = await db
      .update(courseAnalytics)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(eq(courseAnalytics.courseId, courseId))
      .returning();
    return updatedAnalytics;
  }

  async getAllCourseAnalytics(): Promise<CourseAnalytic[]> {
    return db
      .select()
      .from(courseAnalytics)
      .orderBy(desc(courseAnalytics.totalViews));
  }

  async getMostViewedCourses(limit: number = 10): Promise<(CourseAnalytic & { course: Course })[]> {
    const analytics = await db
      .select({
        analytics: courseAnalytics,
        course: courses,
      })
      .from(courseAnalytics)
      .innerJoin(courses, eq(courseAnalytics.courseId, courses.id))
      .orderBy(desc(courseAnalytics.totalViews))
      .limit(limit);

    return analytics.map(({ analytics, course }) => ({
      ...analytics,
      course,
    }));
  }

  async createSession(sessionData: InsertSessionData): Promise<SessionData> {
    const [newSession] = await db
      .insert(sessionData)
      .values({
        ...sessionData,
      })
      .returning();
    return newSession;
  }

  async getSessionBySessionId(sessionId: string): Promise<SessionData | undefined> {
    const [session] = await db
      .select()
      .from(sessionData)
      .where(eq(sessionData.sessionId, sessionId));
    return session;
  }

  async updateSession(id: number, updates: Partial<SessionData>): Promise<SessionData> {
    const [updatedSession] = await db
      .update(sessionData)
      .set(updates)
      .where(eq(sessionData.id, id))
      .returning();
    return updatedSession;
  }

  async getActiveSessionsCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(sessionData)
      .where(sql`${sessionData.endTime} IS NULL`);
    return result?.count || 0;
  }

  async getSessionsByUserId(userId: number): Promise<SessionData[]> {
    return db
      .select()
      .from(sessionData)
      .where(eq(sessionData.userId, userId))
      .orderBy(desc(sessionData.startTime));
  }

  async getAverageSessionDuration(): Promise<number> {
    const [result] = await db
      .select({
        avgDuration: sql<number>`AVG(${sessionData.duration})`,
      })
      .from(sessionData)
      .where(sql`${sessionData.duration} IS NOT NULL`);

    return result?.avgDuration || 0;
  }

  async getDeviceBreakdown(): Promise<{deviceType: string, count: number}[]> {
    const result = await db
      .select({
        deviceType: sessionData.deviceType,
        count: count(),
      })
      .from(sessionData)
      .groupBy(sessionData.deviceType)
      .orderBy(desc(count()));

    return result.map(item => ({
      deviceType: item.deviceType || "unknown",
      count: item.count,
    }));
  }
}

export const storage = new DatabaseStorage();