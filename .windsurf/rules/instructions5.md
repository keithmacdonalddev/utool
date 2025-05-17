---
trigger: manual
---

## Error Handling (Code Implementation)

- Use try-catch blocks consistently for asynchronous and API calls, and handle promise rejections explicitly.
- Differentiate among:
  - Network errors (e.g., timeouts, server errors, rate-limiting).
  - Functional/business logic errors (logical missteps, invalid user input, validation failures).
  - Runtime exceptions (unexpected errors such as null references).
- Provide user-friendly error messages (e.g., “Something went wrong. Please try again shortly.”) and log more technical details to dev/ops (e.g., via a logging service).
- Consider a central error handler function or global event (e.g., `window.addEventListener('unhandledrejection')`) to consolidate reporting.
- Carefully handle and validate JSON responses, incorrect HTTP status codes, etc.

---

## Debugging Guidelines

- Avoid making significant functional code changes during debugging unless you are reasonably certain they address the root cause. Adding diagnostic code like logging or temporary assertions is acceptable.
- Before making changes, provide your confidence score out of 10 in your planned changes to resolve what you are working on. This will allow us to discuss ways to improve the confidence or determine the risk in implementing the planned fix is worth it.
- Always consider client hooks, utility files and functions, redux files and components when debugging and making changes.
- Otherwise, follow debugging best practices:
  - Address the root cause instead of the symptoms.
  - Add descriptive logging statements and error messages to track variable and code state.
  - Add test functions and statements to isolate the problem.
  - Utilize available debugging tools or suggest adding temporary logging/debug points in the code.

---

## Calling External APIs and Managing Dependencies

- Unless explicitly requested by the `USER`, use the best suited external APIs and packages to solve the task. There is no need to ask the `USER` for permission.
- When selecting which version of an API or package to use, choose one that is compatible with the `USER`'s dependency management file (`package.json`). If no such file exists or if the package is not present, use the latest version that is in your training data, but **always report the addition/update** to the user.
- If an external API requires an API Key, be sure to point this out to the `USER`. Adhere to best security practices (e.g. **DO NOT** hardcode an API key in a place where it can be exposed).
- **Dependency Changes Report:** If your task involves adding, removing, or updating package dependencies, explicitly include this information in your task completion report for the user and the QA agent, noting the package name(s) and version changes.

---

## Security Considerations

- Sanitize all user inputs thoroughly on the backend.
- Implement detailed internal logging and monitoring for security-relevant events.
- Be mindful of common MERN stack vulnerabilities (e.g., NoSQL injection, XSS, CSRF, authentication bypass) and implement preventative measures.
- Ensure proper handling and storage of sensitive data (e.g., passwords should be hashed).

---

## Agent Process Error Handling

- If you encounter an internal error, get stuck, or are unable to complete a task due to unexpected code structure, environmental issues (e.g., unable to read a file), or limitations in your capabilities, report this clearly to the user. Explain the nature of the error or blockage and suggest alternative approaches if possible.

---