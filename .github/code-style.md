# Project Code Style Guide

## 1. Introduction

This document outlines the coding standards, conventions, and best practices to be followed in this MERN (MongoDB, Express, React, Node.js) project. The goal is to improve code readability, maintainability, consistency, and collaboration among developers.

Adherence to this guide helps ensure that the codebase remains clean, understandable, and easier to debug and extend over time.

We primarily rely on **ESLint** for code quality rules and **Prettier** for code formatting. This guide complements those tools by providing context, explaining choices, and covering higher-level conventions. Ensure your editor is configured to use the project's ESLint and Prettier configurations (`.eslintrc.js`, `.prettierrc.js`, or similar).


## 2. General Principles

- **Readability:** Write code that is easy for other developers (and your future self) to understand. Prioritize clarity over cleverness.
- **Consistency:** Follow the established patterns and conventions within the project. If you introduce a new pattern, document it or discuss it with the team.
- **KISS (Keep It Simple, Stupid):** Prefer simple solutions over complex ones whenever possible.
- **DRY (Don't Repeat Yourself):** Avoid duplicating code. Use functions, components, constants, and abstractions to reuse logic.
- **Comments:** Write meaningful comments to explain the _why_ behind complex logic, workarounds, or important decisions. Don't comment on the obvious. (See Section 7).

## 3. Formatting

- **Automation:** Code formatting is primarily handled by **Prettier**. Ensure it's run automatically (e.g., via editor integration or pre-commit hooks).
- **Configuration:** Refer to the `.prettierrc.js` (or equivalent) file for specific formatting rules (e.g., line length, quote style, semicolon usage, trailing commas).
- **Manual Overrides:** Avoid manually formatting code in ways that conflict with Prettier. If Prettier formats something undesirably, discuss adjusting the rules rather than fighting the tool.

## 4. Naming Conventions

- **General:** Use descriptive and intention-revealing names. Avoid abbreviations unless they are widely understood (e.g., `id`, `db`, `req`, `res`).
- **Variables & Functions:** Use `camelCase`.
  - Example: `let userProfile;`, `function getUserData() {}`
- **Constants:** Use `UPPER_SNAKE_CASE` for constants whose values are fixed and known at compile time (e.g., configuration constants). Use `camelCase` for other variables declared with `const` whose values might be determined at runtime but don't change after assignment.
  - Example: `const MAX_RETRIES = 3;`, `const initialUsers = await fetchUsers();`
- **React Components:** Use `PascalCase` for component names (both function and file names).
  - Example: `function UserProfile() {}`, file: `UserProfile.js` or `UserProfile.jsx`
- **CSS Modules Classes:** Use `camelCase`.
  - Example: `styles.primaryButton`, `styles.userNameInput`
- **Files:**
  - Components: `PascalCase.js` or `PascalCase.jsx` (e.g., `UserProfile.js`)
  - Hooks: `useCamelCase.js` (e.g., `useFetchData.js`)
  - Utilities/Services/Configuration: `camelCase.js` (e.g., `apiClient.js`, `validationUtils.js`)
  - Stylesheets (CSS Modules): `ComponentName.module.css` (e.g., `UserProfile.module.css`)
  - Backend Models/Routes/Controllers: `camelCase.js` or `resourceName.js` (e.g., `user.model.js`, `auth.routes.js`, `product.controller.js`)
- **Boolean Variables:** Prefix with `is`, `has`, `should`, `can`, etc.
  - Example: `let isActive = true;`, `const hasPermission = checkPermissions();`

## 5. JavaScript Practices

- **Variable Declaration:** Use `const` by default. Use `let` only when a variable needs to be reassigned. Avoid `var`.
- **ES6+ Features:** Prefer modern syntax:
  - Arrow Functions (`=>`) for callbacks and shorter functions. Use implicit return for simple expressions if it enhances readability.
  - Template Literals (backticks `` ` ``) for string interpolation.
  - Destructuring Assignment for objects and arrays.
  - Spread (`...`) and Rest (`...`) operators.
  - `async/await` for handling promises. Avoid raw `.then()`/`.catch()` chains unless necessary for specific patterns (like `Promise.allSettled` handling).
- **Strict Equality:** Use strict equality (`===` and `!==`) instead of abstract equality (`==` and `!=`).
- **Null vs Undefined:** Be deliberate. Use `null` to indicate an intentional absence of a value. `undefined` typically means a variable hasn't been assigned. Avoid explicitly assigning `undefined`.
- **Error Handling:**
  - Use `try...catch` blocks for `async/await` operations that can fail (e.g., API calls, file system operations).
  - Throw `Error` objects (or custom error classes extending `Error`).
  - See backend/frontend specific sections for more detail.
- **Modularity:** Keep functions and modules small and focused on a single responsibility.

## 6. React Specifics

- **Components:**
  - Use Functional Components and Hooks. Avoid class components.
  - Keep components small and focused. Extract logic into custom hooks or utility functions.
  - Destructure props: `function MyComponent({ userId, name }) {...}`
- **Hooks:**
  - Follow the Rules of Hooks (call them at the top level, not inside loops/conditions).
  - Provide accurate dependency arrays for `useEffect`, `useCallback`, `useMemo`. Use ESLint plugins (`eslint-plugin-react-hooks`) to help enforce this.
  - Extract reusable stateful logic into custom hooks (`use...`).
- **State Management:**
  - **Redux Toolkit:** Use **Redux Toolkit (`@reduxjs/toolkit`)** as the primary solution for managing shared, global, or complex application state.
    - **Store Setup:** Use `configureStore` for setting up the Redux store.
    - **Slices:** Define state logic using `createSlice`, which combines reducers, action creators, and initial state definitions. Organize slices logically, often by feature (e.g., `features/users/userSlice.js`).
    - **Accessing State:** Use the `useSelector` hook to read data from the store. Create specific, memoized selectors (using `createSelector` from `reselect`, often integrated within slices) to optimize performance.
    - **Dispatching Actions:** Use the `useDispatch` hook to dispatch actions generated by your slices.
    - **Async Logic:** Use `createAsyncThunk` for handling asynchronous operations like API calls.
  - **Local State:** Use the `useState` hook for simple, component-local state that doesn't need to be shared across the application (e.g., form input values, toggle states).
- **Styling:**
  - **Tailwind CSS:** Use **Tailwind CSS** for styling. Apply utility classes directly within the JSX markup.
    - Example: `className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700"`
  - **Configuration:** Customize Tailwind via the `tailwind.config.js` file (e.g., extending theme colors, spacing, fonts; adding plugins).
  - **Reusability:** For complex or frequently reused sets of utility classes, prefer creating reusable React components over using Tailwind's `@apply` directive excessively. Use `@apply` sparingly in global CSS files for complex base component styles if component abstraction isn't practical.
  - **Global Styles:** Use a global CSS file (`index.css`, `global.css`, etc.) for Tailwind's base/preflight styles, global font imports, or minimal base element styling.
  - **Organization:** Consider using tools like `prettier-plugin-tailwindcss` to automatically sort Tailwind classes for consistency.

## 7. Node.js / Express Specifics

- **API Design:**
  - Follow RESTful principles (use appropriate HTTP verbs, resource-based URLs).
  - Use standard HTTP status codes correctly (e.g., 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).
  - Return consistent JSON response structures (e.g., `{ success: boolean, data: ..., message: ... }` or `{ success: boolean, error: { code: ..., message: ... } }`).
- **Routing & Controllers:**
  - Use `express.Router()` to organize routes by resource.
  - Keep route handlers thin; delegate business logic to controller functions or service layers.
  - Example: `routes/userRoutes.js` -> `controllers/userController.js` -> `services/userService.js` (optional)
- **Middleware:**
  - Use middleware for cross-cutting concerns (authentication, logging, input validation, error handling).
  - Ensure middleware functions call `next()` or send a response.
- **Error Handling:**
  - Use a centralized error handling middleware (defined last in the middleware chain).
  - Catch errors in async route handlers/middleware (e.g., using `try...catch` and `next(error)` or a wrapper like `express-async-errors`).
  - Log errors appropriately.
- **Mongoose/Database:**
  - Define clear schemas with validation.
  - Use `async/await` for all database operations.
  - Select only necessary fields from the database (`.select('field1 field2')`).
  - Consider adding indexes for frequently queried fields.

## 8. Comments

- **Purpose:** Explain _why_ something is done, not _what_ it does (the code should explain the _what_). Document complex algorithms, business logic, workarounds, or potential gotchas.
- **JSDoc:** Use JSDoc comments for functions, classes, and complex types, especially for shared utility functions or API endpoints.
  ```javascript
  /**
   * Calculates the total price including tax.
   * @param {number} basePrice - The price before tax.
   * @param {number} taxRate - The tax rate as a decimal (e.g., 0.05 for 5%).
   * @returns {number} The total price including tax.
   */
  function calculateTotalPrice(basePrice, taxRate) {
    // Ensure tax rate is not negative
    const validTaxRate = Math.max(0, taxRate);
    return basePrice * (1 + validTaxRate);
  }
  ```
- **Inline Comments:** Use `//` for short explanations of specific lines or blocks of code where the intent isn't immediately obvious. Keep them concise.
- **TODO/FIXME:** Use `// TODO:` for planned enhancements or `// FIXME:` for known issues that need fixing, optionally adding context or a ticket number.

## 9. Dependencies

- **Management:** Use `npm` consistently . Commit `package-lock.json` or `yarn.lock`.
- **Adding Dependencies:** Before adding a new dependency, check if existing dependencies can fulfill the need. Consider the library's size, maintenance status, and security vulnerabilities.
- **Removing Dependencies:** Regularly review and remove unused dependencies.

## 10. Git & Version Control

- **Commit Messages:** Follow the Conventional Commits specification (https://www.conventionalcommits.org/). This helps automate changelog generation and makes history easier to understand.
  - Example: `feat: add user login endpoint`, `fix: correct calculation error in pricing module`, `refactor: simplify data fetching logic`, `docs: update code style guide`
- **Branching:** Use a consistent branching strategy (e.g., Gitflow, GitHub Flow). Typically, features are developed on separate branches and merged via Pull Requests.
- **Pull Requests:** Provide clear descriptions in Pull Requests, explaining the changes and linking to relevant issues/tickets. Code reviews are encouraged.

---

_This guide is a living document and may be updated as the project evolves or new best practices emerge. Please discuss any proposed changes with the team._
