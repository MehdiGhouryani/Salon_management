# Implementation Plan - Super Admin Panel UX Streamlining & Decluttering

## User Request
- **User feedback**: The Super Admin panel is crowded and has weak UX ("پنل مدیریت کل خیلی شلوغه و UX ضعیفی داره").
- **Clarifying answers**: Almost all sections need simplification; prefers a simpler tabbed categorization with uncluttered cards ("دسته بندی تب بندی شده ساده تر با کارت های خلوت تر").

## Proposed Changes

### 1. Overview Dashboard (`src/components/views/OverviewView.tsx`)
- Simplify metric summary cards with generous padding, minimalist typography, and clear visual hierarchy.
- Group recent activity and system status into clean, uncluttered widgets with fewer redundant text elements.
- Ensure seamless light/dark mode adaptation.

### 2. Businesses Management (`src/components/views/BusinessesView.tsx`)
- Streamline search, filtering, and salon list cards.
- Remove redundant badge clutter and simplify action buttons for approving, editing, or viewing salons.
- Provide a clean tabbed/segmented view if necessary to separate active vs pending salons cleanly.

### 3. Users Management (`src/components/views/UsersView.tsx`)
- Clean up user tables and cards.
- Keep only core identity, role badges, and essential management actions.
- Remove redundant verbose descriptions.

### 4. Navigation & Header (`src/components/common/Sidebar.tsx` & `Header.tsx`)
- Clean up sidebar items and header status badges.
- Ensure an airy, modern, uncluttered administrative experience.

## Verification Plan
- Compile applet (`compile_applet`) and run linter (`lint_applet`) to ensure zero errors.
- Verify that all super admin views are uncluttered and responsive in both light and dark modes.
