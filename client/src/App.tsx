import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { AccessibilityProvider } from "@/hooks/use-accessibility";
import { Suspense, lazy } from "react";
import Navbar from "@/components/navbar";
import { ProtectedRoute } from "./lib/protected-route";
import { AnnouncementBanner } from "@/components/announcement-banner";

// Eager-loaded critical components
import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/login";

// Lazy-loaded components
const InstructorRegister = lazy(() => import("@/pages/auth/instructor-register"));
const StudentRegister = lazy(() => import("@/pages/auth/student-register"));
const InstructorDashboard = lazy(() => import("@/pages/instructor/dashboard"));
const CreateCourse = lazy(() => import("@/pages/instructor/create-course"));
const StudentDashboard = lazy(() => import("@/pages/student/dashboard"));
const CourseView = lazy(() => import("@/pages/student/course-view"));
const CourseEditor = lazy(() => import("@/pages/instructor/course-editor"));
const StudentsList = lazy(() => import("@/pages/instructor/students-list"));
const PasswordReset = lazy(() => import("@/pages/auth/password-reset"));
const AdminSettings = lazy(() => import("@/pages/instructor/admin-settings"));
const StudentProfile = lazy(() => import("@/pages/student/profile"));
const PublicCourseCatalog = lazy(() => import("@/pages/public/course-catalog"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function Layout({ children, showNav = true }: { children: React.ReactNode, showNav?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      {showNav && <Navbar />}
      <main className="container mx-auto px-4 py-8">
        <AnnouncementBanner />
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth/login" component={Login} />
      <Route 
        path="/auth/register/instructor" 
        component={() => (
          <Suspense fallback={<LoadingFallback />}>
            <InstructorRegister />
          </Suspense>
        )}
      />
      <Route 
        path="/auth/register/student" 
        component={() => (
          <Suspense fallback={<LoadingFallback />}>
            <StudentRegister />
          </Suspense>
        )}
      />
      <Route 
        path="/auth/register/student/:instructorId" 
        component={() => (
          <Suspense fallback={<LoadingFallback />}>
            <StudentRegister />
          </Suspense>
        )}
      />
      <Route 
        path="/auth/reset-password" 
        component={() => (
          <Suspense fallback={<LoadingFallback />}>
            <PasswordReset />
          </Suspense>
        )}
      />
      <Route 
        path="/courses" 
        component={() => (
          <Suspense fallback={<LoadingFallback />}>
            <PublicCourseCatalog />
          </Suspense>
        )}
      />
      <ProtectedRoute 
        path="/" 
        component={({ user }) => (
          <Layout>
            {user?.role === "instructor" ? <InstructorDashboard /> : <StudentDashboard />}
          </Layout>
        )}
      />
      <ProtectedRoute
        path="/students"
        component={({ user }) => {
          if (user?.role !== "instructor") return <NotFound />;
          return (
            <Layout>
              <StudentsList />
            </Layout>
          );
        }}
      />
      <ProtectedRoute
        path="/create-course"
        component={({ user }) => {
          if (user?.role !== "instructor") return <NotFound />;
          return (
            <Layout>
              <CreateCourse />
            </Layout>
          );
        }}
      />
      <ProtectedRoute
        path="/course/:courseId/edit"
        component={({ user }) => {
          if (user?.role !== "instructor") return <NotFound />;
          return (
            <Layout>
              <CourseEditor />
            </Layout>
          );
        }}
      />
      <ProtectedRoute
        path="/course/:courseId"
        component={() => (
          <Layout showNav={false}>
            <CourseView />
          </Layout>
        )}
      />
      <ProtectedRoute
        path="/admin/settings"
        component={({ user }) => {
          if (user?.role !== "instructor") return <NotFound />;
          return (
            <Layout>
              <AdminSettings />
            </Layout>
          );
        }}
      />
      <ProtectedRoute
        path="/profile"
        component={({ user }) => {
          if (user?.role !== "student") return <NotFound />;
          return (
            <Layout>
              <StudentProfile />
            </Layout>
          );
        }}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AccessibilityProvider>
            <Router />
            <Toaster />
          </AccessibilityProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;