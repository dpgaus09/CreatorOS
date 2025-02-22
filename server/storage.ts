import { InsertUser, User, Course, Enrollment } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  updateEnrollmentProgress(id: number, progress: Record<string, any>): Promise<Enrollment>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private courses: Map<number, Course>;
  private enrollments: Map<number, Enrollment>;
  sessionStore: session.Store;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.enrollments = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createCourse(course: Omit<Course, "id">): Promise<Course> {
    const id = this.currentId++;
    const newCourse: Course = { ...course, id };
    this.courses.set(id, newCourse);
    return newCourse;
  }

  async updateCourse(id: number, updates: Partial<Course>): Promise<Course> {
    const course = this.courses.get(id);
    if (!course) throw new Error("Course not found");
    const updatedCourse = { ...course, ...updates };
    this.courses.set(id, updatedCourse);
    return updatedCourse;
  }

  async getCourse(id: number): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async getCoursesByInstructor(instructorId: number): Promise<Course[]> {
    return Array.from(this.courses.values()).filter(
      (course) => course.instructorId === instructorId,
    );
  }

  async getPublishedCourses(): Promise<Course[]> {
    return Array.from(this.courses.values()).filter(
      (course) => course.published,
    );
  }

  async createEnrollment(enrollment: Omit<Enrollment, "id">): Promise<Enrollment> {
    const id = this.currentId++;
    const newEnrollment: Enrollment = { ...enrollment, id };
    this.enrollments.set(id, newEnrollment);
    return newEnrollment;
  }

  async getEnrollment(studentId: number, courseId: number): Promise<Enrollment | undefined> {
    return Array.from(this.enrollments.values()).find(
      (e) => e.studentId === studentId && e.courseId === courseId,
    );
  }

  async getStudentEnrollments(studentId: number): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values()).filter(
      (e) => e.studentId === studentId,
    );
  }

  async updateEnrollmentProgress(id: number, progress: Record<string, any>): Promise<Enrollment> {
    const enrollment = this.enrollments.get(id);
    if (!enrollment) throw new Error("Enrollment not found");
    const updatedEnrollment = { ...enrollment, progress };
    this.enrollments.set(id, updatedEnrollment);
    return updatedEnrollment;
  }
}

export const storage = new MemStorage();
