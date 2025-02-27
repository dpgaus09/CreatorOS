
# LearnBruh Learning Management System

A comprehensive learning management system for instructors and students.

## Authentication

The system provides three distinct URLs for authentication:

- `/auth/register/instructor` - For instructor registration
- `/auth/register/student` - For student registration  
- `/auth/login` - Unified login page for both instructors and students

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Access the application at http://localhost:5000

## Features

- Role-based authentication (instructors and students)
- Course creation and management
- Lesson modules with various content types
- Student enrollment and progress tracking
- Responsive design for desktop and mobile
