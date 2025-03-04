
# LearnBruh Learning Management System

A comprehensive learning management system for instructors and students.

## For Clients: Getting Your Own Copy

To get your own copy of the LearnBruh LMS:

1. Create a Replit account if you don't already have one
2. Request an invite from your vendor to join their Replit Team
3. Once on the team, use the "Fork" button at the top of this Repl
4. Follow the on-screen instructions to create your own copy
5. Your data and users will be separate from other instances

This process gives you a complete, independent copy of the LearnBruh LMS that you can customize and manage.

## Quick Start for New Users

To get started with your own copy of LearnBruh LMS:

1. Click the "Fork" button at the top of this template
2. Wait for your copy to be created and dependencies to install
3. Click the "Run" button to start the application
4. Configure your database settings (see Database Setup below)

## Database Setup

This application uses PostgreSQL. When running in your own Replit environment:

1. The database should be automatically provisioned for you
2. If needed, you can manage your database through the Replit Database tab

## Authentication

The system provides three distinct URLs for authentication:

- `/auth/register/instructor` - For instructor registration
- `/auth/register/student` - For student registration  
- `/auth/login` - Unified login page for both instructors and students
- `/auth/reset-password` - Password reset page for both instructors and students

## Public Access

- `/courses` - Public course catalog that displays all published courses without requiring authentication

## Features

- Role-based authentication (instructors and students)
- Course creation and management
- Lesson modules with various content types
- Student enrollment and progress tracking
- Responsive design for desktop and mobile
- Accessibility features including high contrast mode and text-to-speech
- Public course catalog for non-authenticated users

## Customization

To customize the LMS for your organization:

1. Update the LMS name and branding through the Admin Settings
2. Customize the theme colors in `theme.json` if desired
3. Add your own logo through the Admin Settings panel

## Technical Details

### Prerequisites

- Node.js (automatically provided by Replit)
- PostgreSQL (automatically provided by Replit)

### For Developers

If you want to modify the codebase:

1. Frontend code is in the `/client` directory
2. Backend API is in the `/server` directory
3. Shared types and schemas are in the `/shared` directory

To run the development server locally:
```
npm run dev
```

Access the application at the URL shown in your Replit environment.
