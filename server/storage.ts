import { users, courses, enrollments, settings, images, pageViews, userEvents, courseAnalytics, sessionData, announcements } from "@shared/schema";
import { InsertUser, User, Course, Enrollment, Setting, InsertImage, Image, InsertPageView, PageView, InsertUserEvent, UserEvent, InsertCourseAnalytic, CourseAnalytic, InsertSessionData, SessionData, Announcement, InsertAnnouncement, EnrollmentProgress } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, lt, gt, isNull, or } from "drizzle-orm";
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
  getPublishedCourses(instructorId?: number): Promise<Course[]>;

  // Enrollments
  createEnrollment(enrollment: Omit<Enrollment, "id">): Promise<Enrollment>;
  getEnrollment(studentId: number, courseId: number): Promise<Enrollment | undefined>;
  getStudentEnrollments(studentId: number): Promise<Enrollment[]>;
  getStudentsWithEnrollments(): Promise<(User & { enrollments: (Enrollment & { course?: Course })[] })[]>;
  updateEnrollmentProgress(id: number, progress: Partial<EnrollmentProgress>): Promise<Enrollment>;

  // Settings
  getSetting(name: string): Promise<Setting | undefined>;
  updateSetting(name: string, value: string): Promise<Setting>;

  // Image Management
  createImage(image: InsertImage): Promise<Image>;
  getImagesByCourse(courseId: number): Promise<Image[]>;

  // Announcements
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getAnnouncements(): Promise<Announcement[]>;
  getActiveAnnouncements(): Promise<Announcement[]>;
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  updateAnnouncement(id: number, updates: Partial<Announcement>): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;

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
  // Cache to store frequently accessed data
  private cache: {
    settings: Map<string, { value: Setting, timestamp: number }>,
    courses: Map<number, { value: Course, timestamp: number }>,
    users: Map<number, { value: User, timestamp: number }>,
    publishedCourses: { value: Course[], timestamp: number, instructorId?: number } | null,
    activeAnnouncements: { value: Announcement[], timestamp: number } | null
  };
  
  // Cache TTL in milliseconds (5 minutes)
  private readonly CACHE_TTL = 5 * 60 * 1000;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
    
    // Initialize the cache
    this.cache = {
      settings: new Map(),
      courses: new Map(),
      users: new Map(),
      publishedCourses: null,
      activeAnnouncements: null
    };
  }
  
  // Helper method to check if cache is valid
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
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

  async getAllStudents(instructorId?: number): Promise<User[]> {
    let query = db
      .select()
      .from(users)
      .where(eq(users.role, "student"));
      
    // If instructorId is provided, filter students by that instructor
    if (instructorId) {
      query = query.where(eq(users.instructorId, instructorId));
    }
      
    return query.orderBy(users.createdAt);
  }

  async getStudentsWithEnrollments(instructorId?: number): Promise<(User & { enrollments: (Enrollment & { course?: Course })[] })[]> {
    const students = await this.getAllStudents(instructorId);
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
      .where(eq(courses.instructorId, instructorId))
      .orderBy(courses.id);  // This ensures consistent ordering by course ID
  }

  async getPublishedCourses(instructorId?: number): Promise<Course[]> {
    // Check if we have a valid cached result for this specific instructorId
    if (this.cache.publishedCourses && 
        this.isCacheValid(this.cache.publishedCourses.timestamp) &&
        this.cache.publishedCourses.instructorId === instructorId) {
      return this.cache.publishedCourses.value;
    }
    
    // Base query for published courses
    let query = db
      .select()
      .from(courses)
      .where(eq(courses.published, true));
      
    // If instructorId is provided, filter by that instructor
    if (instructorId) {
      query = query.where(eq(courses.instructorId, instructorId));
    }
    
    // Apply ordering and get results
    const result = await query.orderBy(courses.id);
    
    // Update the cache
    this.cache.publishedCourses = {
      value: result,
      timestamp: Date.now(),
      instructorId
    };
    
    console.log(`Published courses count: ${result.length}`);
    return result;
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
    progress: Partial<EnrollmentProgress>
  ): Promise<Enrollment> {
    try {
      // Get current enrollment to merge progress safely
      const [currentEnrollment] = await db
        .select()
        .from(enrollments)
        .where(eq(enrollments.id, id));
      
      if (!currentEnrollment) {
        throw new Error(`Enrollment with id ${id} not found`);
      }
      
      // Handle the progress object based on its structure
      let mergedProgress: any;
      
      // Check if we have the current simplified implementation (Record<string, boolean>)
      if (typeof progress === 'object' && 
          !('completedModules' in progress) && 
          !('quizScores' in progress) && 
          !('notes' in progress)) {
        // Simple key-value mapping of lesson IDs to completion status
        mergedProgress = {
          ...currentEnrollment.progress,
          ...progress
        };
      } else {
        // Complex progress schema with structured data
        const currentProgress = currentEnrollment.progress || {};
        
        // Create safe empty objects for nested properties
        const safeCurrentProgress = {
          ...currentProgress
        };
        
        const safeProgressUpdate = {
          ...progress
        };
        
        // Create merged progress with proper nested object handling
        mergedProgress = {
          ...safeCurrentProgress,
          ...safeProgressUpdate
        };
        
        // Handle specific nested properties if they exist in our schema
        if ('completedModules' in progress || 'completedModules' in currentProgress) {
          mergedProgress.completedModules = 
            (progress as any)?.completedModules || 
            (currentProgress as any)?.completedModules || 
            [];
        }
        
        if ('quizScores' in progress || 'quizScores' in currentProgress) {
          mergedProgress.quizScores = {
            ...((currentProgress as any)?.quizScores || {}),
            ...((progress as any)?.quizScores || {})
          };
        }
        
        if ('notes' in progress || 'notes' in currentProgress) {
          mergedProgress.notes = {
            ...((currentProgress as any)?.notes || {}),
            ...((progress as any)?.notes || {})
          };
        }
      }
      
      // Update with the properly merged progress
      const [updatedEnrollment] = await db
        .update(enrollments)
        .set({ progress: mergedProgress })
        .where(eq(enrollments.id, id))
        .returning();
        
      return updatedEnrollment;
    } catch (error) {
      console.error(`Error updating enrollment progress for id ${id}:`, 
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async getSetting(name: string): Promise<Setting | undefined> {
    // Check the cache first
    const cachedSetting = this.cache.settings.get(name);
    if (cachedSetting && this.isCacheValid(cachedSetting.timestamp)) {
      return cachedSetting.value;
    }

    // If not in cache or cache is invalid, fetch from database
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.name, name));
    
    // Update the cache if setting exists
    if (setting) {
      this.cache.settings.set(name, { value: setting, timestamp: Date.now() });
    }
    
    return setting;
  }

  async updateSetting(name: string, value: string): Promise<Setting> {
    // Try to update existing setting
    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.name, name));

    let result: Setting;
    
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.name, name))
        .returning();
      result = updated;
    } else {
      // If setting doesn't exist, create it
      const [newSetting] = await db
        .insert(settings)
        .values({ name, value })
        .returning();
      result = newSetting;
    }
    
    // Update the cache
    this.cache.settings.set(name, { value: result, timestamp: Date.now() });
    
    return result;
  }

  async createImage(image: InsertImage): Promise<Image> {
    const [newImage] = await db.insert(images).values(image).returning();
    return newImage;
  }

  async getImagesByCourse(courseId: number): Promise<Image[]> {
    return db
      .select()
      .from(images)
      .where(eq(images.courseId, courseId))
      .orderBy(desc(images.createdAt));  // Sort by creation date, newest first
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

  // Announcement methods
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    // Check if we have a valid cached result
    if (this.cache.activeAnnouncements && this.isCacheValid(this.cache.activeAnnouncements.timestamp)) {
      return this.cache.activeAnnouncements.value;
    }
    
    // If not in cache or cache is invalid, fetch from database
    const result = await db
      .select()
      .from(announcements)
      .where(eq(announcements.active, true))
      .orderBy(desc(announcements.createdAt));
    
    // Update the cache
    this.cache.activeAnnouncements = {
      value: result,
      timestamp: Date.now()
    };
    
    return result;
  }

  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    const [announcement] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id));
    return announcement;
  }

  async updateAnnouncement(id: number, updates: Partial<Announcement>): Promise<Announcement> {
    const [updatedAnnouncement] = await db
      .update(announcements)
      .set(updates)
      .where(eq(announcements.id, id))
      .returning();
    return updatedAnnouncement;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    console.log(`Storage: Attempting to delete announcement with ID ${id}`);

    // First verify the announcement exists
    const announcement = await this.getAnnouncement(id);
    if (!announcement) {
      console.log(`Storage: No announcement found with ID ${id}`);
      return;
    }

    try {
      await db
        .delete(announcements)
        .where(eq(announcements.id, id));
      console.log(`Storage: Successfully deleted announcement with ID ${id} from database`);
    } catch (error) {
      console.error(`Storage: Error deleting announcement with ID ${id}:`, error);
      throw error;
    }
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

  async createSession(data: InsertSessionData): Promise<SessionData> {
    try {
      // @ts-ignore: Drizzle ORM sometimes has type issues with complex inserts
      const [newSession] = await db.insert(sessionData).values(data).returning();
      return newSession;
    } catch (error) {
      console.error("Error creating session:", error instanceof Error ? error.message : String(error));
      throw error;
    }
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