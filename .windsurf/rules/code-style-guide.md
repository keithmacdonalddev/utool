---
trigger: always_on
---

Okay, this is a good challenge! Condensing a detailed style guide while retaining its essence requires careful rephrasing and prioritizing. Here's an attempt to bring it under 6000 characters while keeping all critical details.

I'll focus on:

More concise phrasing.

Using bullet points more aggressively.

Reducing some of the explanatory "why" if the "what" is clear and standard.

Shortening examples or making them inline.

# Project Code Style Guide

## 1. Introduction
This guide details MERN project coding standards for readability, maintainability, consistency, and collaboration. Adherence ensures a clean, understandable, and extensible codebase.
We use **ESLint** for quality and **Prettier** for formatting. This guide complements them. Configure your editor for project ESLint/Prettier (`.eslintrc.js`, `.prettierrc.js`).

## 2. General Principles
- **Readability:** Clear, understandable code over cleverness.
- **Consistency:** Follow project patterns. Document/discuss new patterns.
- **KISS:** Prefer simple solutions.
- **DRY:** Avoid duplication. Use functions, components, constants, abstractions.
- **Comments:** Explain _why_ for complex logic, workarounds, decisions. Not the obvious (See Sec 7).

## 3. Formatting
- **Automation:** Prettier handles formatting. Run automatically (editor/hooks).
- **Configuration:** See `.prettierrc.js` for line length, quotes, semicolons, etc.
- **Overrides:** Don't fight Prettier. Discuss rule changes if needed.

## 4. Naming Conventions
- **General:** Descriptive, intention-revealing names. Avoid obscure abbreviations (standard ones like `id`, `db`, `req`, `res` are OK).
- **Variables & Functions:** `camelCase` (e.g., `userProfile`, `getUserData()`).
- **Constants:** `UPPER_SNAKE_CASE` for compile-time fixed values (e.g., `MAX_RETRIES`). `camelCase` for runtime-determined `const` (e.g., `const initialUsers = ...`).
- **React Components:** `PascalCase` for name & file (e.g., `UserProfile`, `UserProfile.js`).
- **CSS Modules Classes:** `camelCase` (e.g., `styles.primaryButton`).
- **Files:**
  - Components: `PascalCase.js`/`.jsx`
  - Hooks: `useCamelCase.js`
  - Utilities/Services/Config: `camelCase.js`
  - Stylesheets (CSS Modules): `ComponentName.module.css`
  - Backend (Models/Routes/Controllers): `camelCase.js` or `resourceName.js`
- **Booleans:** Prefix `is`, `has`, `should`, `can` (e.g., `isActive`, `hasPermission`).

## 5. JavaScript Practices
- **Declaration:** `const` default; `let` for reassignment. Avoid `var`.
- **ES6+:** Prefer modern syntax: Arrow Functions (`=>`), Template Literals (`` ` ``), Destructuring, Spread/Rest (`...`), `async/await` for promises.
- **Equality:** Strict `===` and `!==`.
- **Null/Undefined:** `null` for intentional absence. Avoid explicitly assigning `undefined`.
- **Error Handling:** `try...catch` for `async/await`. Throw `Error` objects (or custom extensions).
- **Modularity:** Small, single-responsibility functions/modules.

## 6. React Specifics
- **Components:**
  - Functional Components & Hooks. No class components.
  - Small, focused. Extract logic to custom hooks/utils.
  - Destructure props: `MyComponent({ userId, name })`.
- **Hooks:**
  - Rules of Hooks (top-level calls).
  - Accurate dependency arrays (`useEffect`, `useCallback`, `useMemo`). Use `eslint-plugin-react-hooks`.
  - Custom hooks (`use...`) for reusable stateful logic.
- **State Management:**
  - **Redux Toolkit (`@reduxjs/toolkit`):** Primary for shared/global/complex state.
    - Store: `configureStore`.
    - Slices: `createSlice` for reducers, actions, initial state (feature-based, e.g., `userSlice.js`).
    - Access: `useSelector` (use memoized selectors via `createSelector`).
    - Dispatch: `useDispatch`.
    - Async: `createAsyncThunk` for API calls.
  - **Local State:** `useState` for simple, component-local state (forms, toggles).
- **Styling:**
  - **Tailwind CSS:** Use utility classes directly in JSX.
    - Config: `tailwind.config.js` for themes, plugins.
    - Reusability: Prefer reusable React components over excessive `@apply`. Use `@apply` sparingly.
    - Global: `index.css` for base/preflight, global imports.
    - Organization: Consider `prettier-plugin-tailwindcss` for class sorting.

## 7. Node.js / Express Specifics
- **API Design:**
  - RESTful principles (HTTP verbs, resource URLs).
  - Standard HTTP status codes.
  - Consistent JSON responses (e.g., `{ success, data/error }`).
- **Routing & Controllers:**
  - `express.Router()` by resource.
  - Thin routes; logic in controllers/services.
- **Middleware:**
  - For cross-cutting concerns (auth, log, validate, error handling).
  - Call `next()` or send response.
- **Error Handling:**
  - Centralized error middleware (defined last).
  - Catch async errors (e.g., `express-async-errors` or `try...catch` + `next(error)`).
  - Log errors.
- **Mongoose/Database:**
  - Clear schemas + validation.
  - `async/await` for DB ops.
  - Select only necessary fields (`.select(...)`).
  - Consider indexes for queried fields.

## 8. Comments
- **Purpose:** Explain _why_, not _what_ (code explains _what_). Document complex logic, workarounds, gotchas.
- **JSDoc:** For functions, classes, complex types (esp. shared utils, API endpoints).
  ```javascript
  /**
   * Calculates total price with tax.
   * @param {number} basePrice - Price before tax.
   * @param {number} taxRate - Tax rate (e.g., 0.05 for 5%).
   * @returns {number} Total price with tax.
   */
  function calculateTotalPrice(basePrice, taxRate) { /* ... */ }

Inline: // for short, non-obvious line/block explanations. Concise.
TODO/FIXME: // TODO: for plans, // FIXME: for known issues (add context/ticket #).
9. Dependencies
Management: Use npm. Commit package-lock.json or yarn.lock.
Adding: Check existing first. Evaluate size, maintenance, security.

Removing: Regularly remove unused dependencies.

10. Git & Version Control
Commits: Conventional Commits (e.g., feat: ..., fix: ...).
Branching: Consistent strategy (e.