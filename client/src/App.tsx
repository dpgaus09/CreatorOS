import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { AccessibilityProvider } from "@/hooks/use-accessibility";
import Navbar from "@/components/navbar";
import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/login";
import InstructorRegister from "@/pages/auth/instructor-register";
import StudentRegister from "@/pages/auth/student-register";
import InstructorDashboard from "@/pages/instructor/dashboard";
import CreateCourse from "@/pages/instructor/create-course";
import StudentDashboard from "@/pages/student/dashboard";
import CourseView from "@/pages/student/course-view";
import CourseEditor from "@/pages/instructor/course-editor";
import StudentsList from "@/pages/instructor/students-list";
import { ProtectedRoute } from "./lib/protected-route";
import PasswordReset from "@/pages/auth/password-reset";
import AdminSettings from "@/pages/instructor/admin-settings";
import StudentProfile from "@/pages/student/profile";
import PublicCourseCatalog from "@/pages/public/course-catalog";
import { AnnouncementBanner } from "@/components/announcement-banner";

function Layout({ children, showNav = true }: { children: React.ReactNode, showNav?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      {showNav && <Navbar />}
      <main className="container mx-auto px-4 py-8">
        <AnnouncementBanner />
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/register/instructor" component={InstructorRegister} />
      <Route path="/auth/register/student" component={StudentRegister} />
      <Route path="/auth/reset-password" component={PasswordReset} />
      <Route path="/courses" component={PublicCourseCatalog} />
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