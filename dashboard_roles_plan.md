# Dashboard Design Plan by Role

This document outlines the dashboard designs for three distinct user roles: **Admin**, **Teacher**, and **Student**. Each dashboard is tailored to the specific needs and goals of that user type.

---

## 1. Student Dashboard (Current Implementation)
**Goal:** Engagement, Gamification, and Active Learning.
The current dashboard we just built is primarily focused on the **Student/General User** experience.

### Key Features:
-   **Gamification Center:**
    -   **Level & XP Bar:** Visual progress to encourage consistent usage.
    -   **Daily Quests:** "Play 3 games", "Host a game", etc. to drive daily retention.
    -   **Avatar (Blook):** Personalization.
-   **Quick Actions:**
    -   **Join Game:** primary action for students entering a class code.
    -   **Discover:** Find games to play solo.
    -   **Host Game:** (Optional for students, but good for peer study groups).
-   **Recent Activity:** Easily jump back into recent study sets.
-   **News/Updates:** New game modes or shop items.

### Layout:
-   **Vibrant & Playful:** High saturation colors, gradients, rounded corners.
-   **2-Column Layout:** Main content (Actions) + Sidebar (Gamification).

---

## 2. Teacher Dashboard (Instruction & Management)
**Goal:** Classroom Management, Content Creation, and Performance Tracking.
Teachers need a more "Control Center" vibe—less about gamification for themselves, more about managing *others'* gamification.

### Key Features:
-   **Classroom Overview (Hero Section):**
    -   "Active Classes" count.
    -   "Pending Assignments" summary.
    -   "Recent Reports" quick link.
-   **Quick Actions (Teacher Focused):**
    -   **Create Question Set:** Prominent button (the core task).
    -   **Host Live Game:** Launch a session immediately.
    -   **Assign Homework:** Set deadlines for asynchronous play.
    -   **View Reports:** Quick access to post-game analytics.
-   **My Library (Center Stage):**
    -   List of created Question Sets with "Edit", "Host", "Share" buttons directly visible.
    -   Folder organization system.
-   **Student Progress (Sidebar):**
    -   Notifications like "John D. completed Homework A".
    -   "Needs Attention" list (students struggling with low scores).

### Layout:
-   **Clean & Professional:** White/Light Gray background, clearer typography.
-   **Data-Dense:** Comparison charts or tables might replace large flashy banners.
-   **3-Column or Dashboard Grid:** Sidebar for Navigation (Classes, Library, Reports), Main Area for Content.

---

## 3. Admin Dashboard (System Oversight)
**Goal:** System Health, User Management, and Moderation.
Admins need to see the "Big Picture" and handle issues.

### Key Features:
-   **System Stats (Hero Cards):**
    -   "Total Users" (New today).
    -   "Active Games Now".
    -   "Total Question Sets".
    -   "Server Load / Status".
-   **User Management:**
    -   Search bar to find users by Email/ID.
    -   Action table: Edit Role, Suspend User, Reset Password.
-   **Content Moderation:**
    -   "Flagged Sets": List of content reported by users (for profanity, etc.).
    -   Approve/Reject actions.
-   **Announcements:**
    -   Tool to post "News" that shows up on Student/Teacher dashboards.

### Layout:
-   **Utility Focused:** High contrast, dense tables.
-   **Side Navigation:** Fixed sidebar with "Users", "Content", "Settings", "Analytics".
-   **Dashboard Widgets:** Charts showing growth trends (Users over time).

---

## Summary of Differences

| Feature | Student | Teacher | Admin |
| :--- | :--- | :--- | :--- |
| **Primary Color** | Purple/Indigo (Fun) | Blue/Teal (Trust/Pro) | Slate/Dark (Serious) |
| **Hero Section** | Gamification (XP/Level) | Interaction (Active Classes) | Analytics (Stats) |
| **Main Action** | Join/Play Game | Create/Host Game | Manage Users |
| **Secondary Action** | Customize Avatar | View Reports | Review Reports |
