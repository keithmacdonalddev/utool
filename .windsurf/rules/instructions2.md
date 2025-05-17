---
trigger: always_on
---

## Comments

Generate comprehensive, high-quality comments throughout the code.

- Use JSDoc-style comments for functions, classes, components, and complex logic blocks.
- **Focus on explaining the _why_ behind the code**, not just a simple description of _what_ it does.
- **Comment as if you are teaching someone who has never coded before.** The comments should be clear and detailed enough for a beginner to understand the logic and purpose as if they were an expert.
- Ensure comments explain complex concepts, edge cases, and dependencies.

**Example of detailed commenting for complex logic (like React Hooks):**

```javascript
  useEffect(() => {
    // The custom hooks (useProjects, useProjectTasks, useFriends)
    // are expected to handle their own data fetching, caching,
    // and background refresh logic based on the provided 'id'
    // and their internal configurations.
    // This means we don't usually need to manually trigger fetches here
    // unless there's a very specific page-level requirement.

    // This page-level useEffect is now primarily for cleaning up
    // global state (like `currentProject` in Redux) when this specific
    // project details view is no longer active (either unmounted
    // or the 'id' prop changes, indicating a switch to a different project
    // or navigating away).

    if (!id) {
      // If there's no ID available when this effect runs,
      // it might mean the component mounted without the required ID,
      // or the ID became undefined during the component's lifecycle.
      // In such cases, we should immediately reset any state related
      // to a previous project context to avoid displaying stale data.
      console.log('ProjectDetailsPage: No ID provided. Resetting project state.');
      dispatch(resetProjectStatus());
      return; // Exit the effect early if there's no ID to work with.
    }

    // --- Data Fetching handled by custom hooks ---
    // We are intentionally *not* manually calling data fetching functions here
    // like `WorkspaceProjectDetails(id)` because the `useProjects`, `useProjectTasks`,
    // etc., hooks are designed to react to the `id` dependency themselves.
    // This keeps the data fetching concerns within the specialized hooks
    // and the UI component focused on presentation and state management coordination.
    // If you needed a manual refetch based on a user action *within* this component,
    // you would handle that separately (e.g., in an event handler).

    // --- Cleanup Function ---
    return () => {
      // This is the cleanup phase of the useEffect hook.
      // This function runs automatically before the effect runs again
      // (if the dependencies change) and when the component unmounts.
      // It's crucial for preventing memory leaks and cleaning up subscriptions,
      // timers, or, as in this case, global application state tied to the
      // *previous* render's context (the project ID that is no longer current).
      console.log(`ProjectDetailsPage: Running cleanup for previous ID or unmount.`);
      // Resetting the global project status state ensures that when
      // the user navigates away from this project's details or switches
      // to a different project, the application's state accurately reflects
      // that there is no current project being viewed, or it prepares for
      // the state of the *new* project ID.
      dispatch(resetProjectStatus());
    };

  }, [id, dispatch]); // Dependencies Array:
  // This array tells React when to re-run this effect.
  // - `id`: The effect should re-run if the project ID changes, so cleanup
  //   for the old ID runs, and any logic dependent on the new ID would run (though
  //   in this specific example, the *effect's main logic* mostly relies on
  //   the custom hooks reacting to `id`). The cleanup function *definitely*
  //   needs `id` to be in the dependencies because it relates to the context
  //   (the project ID) that the effect was running for.
  // - `dispatch`: The `dispatch` function from Redux (or similar context)
  //   is stable and usually doesn't change, but it's a good practice to include
  //   it if used inside the effect or its cleanup function, especially in
  //   older React versions or specific contexts, to satisfy the `exhaustive-deps`
  //   ESLint rule. Modern React often guarantees `dispatch` is stable.