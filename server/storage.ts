import { users, courses, enrollments, settings } from "@shared/schema";
import { InsertUser, User, Course, Enrollment, Setting } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
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
          course,
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
}

export const storage = new DatabaseStorage();