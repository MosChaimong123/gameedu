# Implementation Plan: Dashboard Overhaul

## Objective
Transform the current basic dashboard into a dynamic, gamified, and user-centric hub. The new dashboard will prioritize quick actions, visualize user progress (gamification), and provide easy access to recent content.

## Design Philosophy
- **Gamified:** Highlight user level, stats, and daily goals.
- **Action-Oriented:** "Create" and "Host" actions should be one click away.
- **Personalized:** Show the user's name, avatar (Blook), and recent activity.
- **Aesthetic:** Use vivid gradients, glassmorphism effects, and clean typography.

## Proposed Layout
A 2-column layout (responsive to 1-column on mobile):
- **Left Column (Main Content - 66%):**
    - **Hero Section:** Welcome message + Quick Stats summary.
    - **Quick Actions Grid:** Large, colorful cards for core tasks (Create Set, Discover, Join Game).
    - **Recent Activity:** List of recently modified or played sets.
- **Right Column (Sidebar - 33%):**
    - **Profile Card:** detailed user level, XP bar, and current Blook.
    - **Daily Quests:** Checklist of daily tasks to earn rewards.
    - **News / Updates:** Compact list of platform announcements.

## Key Components

### 1. `DashboardHero`
- **Content:** "Welcome back, {User}!", motivational subtext.
- **Visual:** Gradient background with subtle patterns.

### 2. `QuickActions`
- Grid of buttons:
    - **Create Set:** (Purple/Pink gradient, Plus Icon)
    - **Host Game:** (Orange/Yellow gradient, Play Icon)
    - **Join Game:** (Blue/Cyan gradient, Gamepad Icon)

### 3. `StatsOverview` & `ProfileCard`
- Display:
    - **Level:** Current User Level (e.g., Lvl 5).
    - **XP:** Progress bar to next level.
    - **Sets Created:** Counter.
    - **Games Hosted:** Counter.
    - **Tokens:** Currency display.

### 4. `RecentActivity`
- A list or grid of `SetCard`s filtered by "Last Edited" or "Last Played".
- Fallback: "You haven't created any sets yet. Start now!"

### 5. `DailyQuests`
- List of 3 randomized daily tasks.
- Visual: Checkbox style with rewards (e.g., "+50 Tokens").
- Example: "Host a classic game", "Create a set with 10 questions".

## Technical Steps

1.  **Update `src/app/dashboard/page.tsx`**:
    - Refactor layout to use `div.grid.grid-cols-12`.
    - Implement `Hero` section.
    - Implement `QuickActions` section.
2.  **Create New Components** (in `src/components/dashboard/`):
    - `profile-card.tsx`: For the right sidebar stats.
    - `quest-list.tsx`: For daily challenges.
    - `recent-sets.tsx`: Fetch and display recent sets (using mocked data or real API if available).
3.  **Integrate Mock/Real Data**:
    - Use `useUser` or similar context if available, otherwise mock "Level" and "XP" for now as placeholders for future backend integration.
    - Fetch "My Sets" count from real API.

## Task List
- [ ] Create `components/dashboard` directory.
- [ ] Implement `ProfileCard` (Right sidebar).
- [ ] Implement `QuestList` (Right sidebar).
- [ ] Implement `QuickActions` (Main content).
- [ ] Refactor `DashboardPage` layout.
- [ ] Connect `RecentActivity` to real user sets (sorted by updated_at).
- [ ] Add animations (framer-motion or CSS transitions) for entry.
