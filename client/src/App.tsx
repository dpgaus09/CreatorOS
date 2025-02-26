import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import Navbar from "@/components/navbar";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import InstructorDashboard from "@/pages/instructor/dashboard";
import CreateCourse from "@/pages/instructor/create-course";
import StudentDashboard from "@/pages/student/dashboard";
import CourseView from "@/pages/student/course-view";
import CourseEditor from "@/pages/instructor/course-editor";
import StudentsList from "@/pages/instructor/students-list";
import { ProtectedRoute } from "./lib/protected-route";

function Layout({ children, showNav = true }: { children: React.ReactNode, showNav?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      {showNav && <Navbar />}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;