
# Centsei Application Architecture & Overview

This document serves as a comprehensive reference for the architecture, features, and technology stack of the Centsei application. Its purpose is to provide a "source of truth" to ensure development consistency and prevent regressions.

---

### Core Purpose & User Goal

The primary goal of **Centsei** is to reframe personal finance from a chore into a practice of mindfulness and mastery. It's designed to be more than just a spreadsheet; it's a **"budgeting dojo"** where users can train their financial discipline, gain clarity, and achieve a sense of peace and control over their money.

The core philosophy is built on several key principles:

*   **Financial Awareness as a Practice:** By visualizing all income and expenses on a dynamic calendar, users develop an intuitive understanding of their cash flow. The act of tracking becomes a daily practice, much like a martial artist training in a dojo.
*   **Guidance over Judgment:** The AI "Sensei" is a key feature that embodies this principle. Instead of just showing raw numbers, the Sensei provides calm, contextual mantras and suggestions. It guides users with wisdom, not shame, helping them stay motivated and focused on their long-term goals.
*   **Mastery Through Consistency:** The app's features, like the "Dojo Journey" rank and "Budget Health Score," are designed to reward consistency and progress over time. Financial well-being isn't about one perfect month; it's about the discipline cultivated over the long term.
*   **Simplicity and Focus:** The interface is intentionally clean and focused on what matters most: your cash flow, your goals, and your progress. It avoids overwhelming you with excessive features, allowing for a calmer, more focused financial practice.

Ultimately, Centsei aims to empower users to become the "sensei" of their own finances—calm, confident, and in control.

---

### Tech Stack & Core Libraries

*   **Framework**: **Next.js** (using the App Router)
*   **Language**: **TypeScript**
*   **UI Components**: **ShadCN/UI** - A collection of accessible components built on Radix UI and Tailwind CSS. Key components used include `Dialog`, `Button`, `Card`, `Calendar`, `Select`, `Input`, and `Toast`.
*   **Styling**: **Tailwind CSS** for utility-first styling. The app's theme (colors, fonts) is configured in `tailwind.config.ts` and `src/app/globals.css`.
*   **AI/Generative**: **Genkit** (from Google) for defining and running AI flows, interfacing with Google's Gemini models.
*   **State Management**: A combination of standard React Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) and a custom `useLocalStorage` hook for local-only data persistence.
*   **Date & Time**: `date-fns` and `date-fns-tz` for all date manipulations, ensuring timezone correctness.
*   **Animation**: `gsap` for subtle animations, particularly in dialogs.

---

### Application Architecture & Routing

The application uses the Next.js App Router for its file-based routing system.

*   **`src/app/layout.tsx`**: The root layout for the entire application. It sets up the basic HTML structure, includes the `Inter` font, and wraps all pages with the `AuthProvider` and `ThemeProvider`.
*   **`src/app/page.tsx`**: The homepage, which is protected. It renders the main `CentseiDashboard` component. If a user is not logged in, they are redirected to the login page.
*   **`src/app/login/page.tsx`**: The login screen, providing options for Google Sign-In or guest access. Logic is managed by `use-login-page.ts` and the `AuthProvider`.
*   **`src/app/view/page.tsx`**: A special read-only route that displays a shared calendar. It reads data encoded in URL parameters and renders the `ViewOnlyCalendar` component.
*   **`src/app/api/sensei/route.ts`**: A server-side API route that acts as a secure backend for the "Sensei Says" AI feature.

---

### Core Features & File Breakdown

#### 1. Authentication & Data Persistence

*   **Firebase Integration (`src/lib/firebase.ts`)**: Configures the Firebase connection using environment variables. It gracefully handles missing variables by enabling a "local-only" mode where data is stored in the browser.
*   **Authentication (`src/components/auth-provider.tsx`)**: Manages the user's authentication state (Firebase user or guest). It protects app routes and provides user context to other components.
*   **Local Storage Hook (`src/hooks/use-local-storage.ts`)**: The primary mechanism for data persistence in "guest mode." It saves all user data (entries, goals, settings) to the browser's local storage. Data is synced with Firestore upon login.

#### 2. The Main Dashboard & Calendar

This is the central part of the application.

*   **`src/components/centsei-dashboard.tsx`**: The primary stateful component that acts as the application's orchestrator.
    *   Fetches and manages all financial data (entries, goals, birthdays).
    *   Handles all create, update, and delete operations.
    *   Manages the state of all dialogs (for new entries, settings, summaries).
    *   Calculates high-level financial data like weekly totals and the budget score.
*   **`src/components/centsei-calendar.tsx`**: The component that renders the main calendar grid.
    *   Receives all financial data as props from the dashboard.
    *   Uses `date-fns` to calculate and display the days.
    *   Maps over entries to display bills and income on the correct days.
    *   Handles all user interactions (clicks, drags, mobile taps, and long-presses) to provide an intuitive experience.
*   **`src/components/entry-dialog.tsx`**: The form for creating and editing financial entries. It uses `react-hook-form` and `zod` for robust validation. It also contains the logic for handling recurring entry updates.

#### 3. AI-Powered Features

*   **Genkit Flows (`src/ai/flows/`)**: Contains the definitions for our AI agents.
    *   **`sensei-says.ts`**: Defines a flow that takes the user's financial context (budget score, rank, net flow) and generates a short, context-aware financial mantra using the Gemini model.
    *   **`rollover-optimization.ts`**: Defines a flow that recommends a monthly rollover strategy based on the user's income and goals.
*   **AI Hook (`src/lib/sensei/useSenseiSays.ts`)**: A custom React hook providing a clean interface for the UI to interact with the "Sensei Says" AI. It handles API calls, caching, rate-limiting, and state management.
*   **UI (`src/components/sensei-says-ui.tsx`)**: The floating action button and card that display the AI-generated mantras.

#### 4. Financial Health & Goals

*   **Budget Score Logic (`src/lib/budget-score.ts`)**: A utility that calculates a "Budget Health Score" (0-100) based on spending-to-income ratio, savings rate, and debt management over the last 30 days. It also determines the user's "Rank" (e.g., Novice, Master).
*   **Dojo Journey Logic (`src/lib/dojo-journey.ts`)**: Calculates the user's martial arts-themed rank (e.g., "White Belt") based on their progress towards their primary savings goal.
*   **Dialogs**:
    *   `src/components/goals-dialog.tsx`: Allows users to set and track savings goals.
    *   `src/components/birthdays-dialog.tsx`: Allows users to add birthdays to improve financial forecasting.
    *   `src/components/enso-insights-dialog.tsx`: Provides charts and graphs visualizing cash flow, category spending, and savings balance.
    *   `src/components/monthly-summary-dialog.tsx`: A high-level overview of a selected month's finances.

### Styling & UI Conventions

*   **`src/app/globals.css`**: The main CSS file where Tailwind CSS layers are defined. It contains the HSL color variables for the application's light and dark themes (primary, background, accent colors, etc.), following the ShadCN convention.
*   **`tailwind.config.ts`**: The configuration file for Tailwind CSS, where custom fonts (`Inter`) and theme extensions are defined.
*   **`src/components/ui/`**: This directory holds all the base ShadCN components (Button, Card, etc.).
*   **Icons**: The `lucide-react` library is used for most icons to ensure a consistent, clean aesthetic.

This document outlines the current, stable state of the Centsei application. It should be used as the primary reference for all future development work.
