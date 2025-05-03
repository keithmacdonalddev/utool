# Data Fetching Hooks for Efficient API Usage

This directory contains custom React hooks that implement intelligent caching to prevent redundant API calls. These hooks help solve the issue of too many duplicate requests being made to the server.

## Problem Solved

The server logs showed many redundant requests for the same resources (projects, tasks, weather) within very short time frames. This happens when multiple components all try to fetch the same data independently rather than sharing data through the Redux store.

## How the Caching System Works

Our caching system works on these core principles:

1. **Timestamp Tracking**: Every data fetch operation is timestamped in the Redux store.

2. **Cache Validation**: Before making an API call, the system checks if:

   - Data exists in the cache
   - The cached data's timestamp is within the specified cache timeout period

3. **Conditional Fetching**:

   - If the cache is valid: Use the cached data without making an API call
   - If the cache is stale or empty: Make an API call to fetch fresh data

4. **Cache Invalidation**:

   - Automatic: Cache is invalidated when it exceeds its timeout period
   - Manual: Using the `refetch` function with `true` parameter to force refresh
   - Data changes: When data is created, updated, or deleted, related caches are automatically refreshed

5. **Redux Integration**:
   - The system uses the existing Redux store structure to track timestamps
   - No additional dependencies or storage mechanisms required

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Component     │─────│  Custom Hook    │─────│   Redux Store   │
│                 │     │  with Caching   │     │  with Timestamp │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │    ▲                      ▲
                              │    │                      │
                              ▼    │                      │
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │   API Request   │─────│ Server Response │
                        │   (If needed)   │     │                 │
                        │                 │     │                 │
                        └─────────────────┘     └─────────────────┘
```

## Available Hooks

### 1. `useDataFetching`

This is the base hook that implements the intelligent caching mechanism. It works with existing Redux stores to:

- Track when data was last fetched
- Only fetch new data when necessary (cache expired or forced refresh)
- Provide a consistent interface for components

```jsx
import { useDataFetching } from '../hooks/useDataFetching';
import { getProjects } from '../features/projects/projectSlice';

function MyComponent() {
  const selectProjects = (state) => state.projects.projects;
  const selectLastFetched = (state) => state.projects.lastFetched;
  const selectIsLoading = (state) => state.projects.isLoading;
  const selectError = (state) =>
    state.projects.isError ? state.projects.message : null;

  const { data, isLoading, error, refetch } = useDataFetching({
    fetchAction: getProjects,
    selectData: selectProjects,
    selectLastFetched: selectLastFetched,
    selectIsLoading: selectIsLoading,
    selectError: selectError,
    dependencies: [], // Dependencies that trigger refetch
    fetchParams: {}, // Parameters to pass to the fetch action
    cacheTimeout: 5 * 60 * 1000, // Cache timeout in milliseconds
    skipInitialFetch: false, // Skip initial fetch on mount
  });

  // Use data, handle loading and error states
}
```

### 2. `useProjects`

A specialized hook for efficiently loading projects. It prevents redundant API calls by using the caching system in Redux.

```jsx
import { useProjects } from '../hooks/useProjects';

function ProjectList() {
  const { projects, isLoading, error, refetchProjects } = useProjects({
    // Custom cache timeout in milliseconds (default is 5 minutes)
    cacheTimeout: 3 * 60 * 1000, // 3 minutes
    // Skip initial fetch if you want manual control
    skipInitialFetch: false,
  });

  // Force a refresh when user clicks refresh button
  const handleRefresh = () => {
    refetchProjects();
  };

  if (isLoading) return <div>Loading projects...</div>;
  if (error) return <div>Error loading projects: {error}</div>;

  return (
    <div>
      <button onClick={handleRefresh}>Refresh Projects</button>
      {projects.map((project) => (
        <div key={project._id}>{project.name}</div>
      ))}
    </div>
  );
}
```

### 3. `useProjectTasks`

A specialized hook for efficiently loading tasks for a specific project. It prevents redundant API calls by checking if the cache is still valid before making requests.

```jsx
import { useProjectTasks } from '../hooks/useProjectTasks';

function TaskList({ projectId }) {
  const { tasks, isLoading, error, refetchTasks } = useProjectTasks(projectId, {
    // Custom cache timeout (default is 5 minutes)
    cacheTimeout: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) return <div>Loading tasks...</div>;
  if (error) return <div>Error loading tasks: {error}</div>;

  return (
    <div>
      <button onClick={refetchTasks}>Refresh Tasks</button>
      {tasks.map((task) => (
        <div key={task._id}>{task.title}</div>
      ))}
    </div>
  );
}
```

### 4. `useRecentTasks`

A specialized hook for efficiently loading recent tasks across multiple projects. It prevents redundant API calls by using the caching system in Redux.

```jsx
import { useRecentTasks } from '../hooks/useRecentTasks';

function RecentTasks() {
  const { tasks, isLoading, error, refetchTasks } = useRecentTasks();

  if (isLoading) return <div>Loading recent tasks...</div>;
  if (error) return <div>Error loading tasks: {error}</div>;

  return (
    <div>
      <h2>Recent Tasks</h2>
      {tasks.map((task) => (
        <div key={task._id}>
          {task.title} - {task.projectName}
        </div>
      ))}
    </div>
  );
}
```

## Guidelines for Cache Timeouts

Different types of data have different optimal cache timeouts based on how frequently they change and their importance to user experience. Here are recommended timeouts:

| Data Type                   | Recommended Timeout       | Reasoning                               |
| --------------------------- | ------------------------- | --------------------------------------- |
| Project Structure           | 5-10 minutes              | Projects structure changes infrequently |
| Task Lists                  | 2-3 minutes               | Tasks change more frequently            |
| Recent Tasks                | 1-2 minutes               | Most active data in the system          |
| User Data                   | 10-15 minutes             | User profiles rarely change             |
| Static Reference Data       | 30+ minutes               | Reference data changes very rarely      |
| Real-time Data (chat, etc.) | No cache or 10-30 seconds | Requires near real-time updates         |

### Specific Recommendations:

1. **Projects List**: 5 minutes (`5 * 60 * 1000`)

   ```jsx
   useProjects({ cacheTimeout: 5 * 60 * 1000 });
   ```

2. **Project Details**: 5 minutes (`5 * 60 * 1000`)

   ```jsx
   useProjects({
     selector: (state) => state.projects.currentProject,
     actionCreator: 'getProject',
     actionParams: projectId,
     cacheTimeout: 5 * 60 * 1000,
   });
   ```

3. **Project Tasks**: 2 minutes (`2 * 60 * 1000`)

   ```jsx
   useProjectTasks(projectId, { cacheTimeout: 2 * 60 * 1000 });
   ```

4. **Recent Tasks**: 2 minutes (`2 * 60 * 1000`)

   ```jsx
   useRecentTasks({ cacheTimeout: 2 * 60 * 1000 });
   ```

5. **User Profile**: 15 minutes (`15 * 60 * 1000`)
   ```jsx
   useProfile({ cacheTimeout: 15 * 60 * 1000 });
   ```

## When to Use Each Hook

| Hook              | When to Use                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `useDataFetching` | For custom data fetching needs not covered by specialized hooks              |
| `useProjects`     | For components that display project lists or individual project details      |
| `useProjectTasks` | For components that display tasks within a specific project                  |
| `useRecentTasks`  | For dashboard widgets or overview components that show tasks across projects |

### Decision Guide:

1. **Use specialized hooks first**: If a specialized hook exists for your data type, use it instead of `useDataFetching` directly.

2. **For displaying projects**:

   - Project lists, project cards, project dropdowns → `useProjects()`
   - Single project details → `useProjects({ selector: state => state.projects.currentProject })`

3. **For displaying tasks**:

   - Tasks within a specific project → `useProjectTasks(projectId)`
   - Tasks across multiple projects → `useRecentTasks()`

4. **For custom data needs**:
   - Create a new specialized hook that uses `useDataFetching` internally
   - Or use `useDataFetching` directly with custom selectors

## Best Practices

### Component Implementation

1. **Always handle loading and error states** in your components:

   ```jsx
   if (isLoading) return <LoadingSpinner />;
   if (error) return <ErrorMessage message={error} />;
   ```

2. **Add a refresh button** for user-initiated refreshes:

   ```jsx
   <button onClick={() => refetchTasks(true)}>Refresh Data</button>
   ```

3. **Use appropriate dependencies** in custom hooks:

   ```jsx
   // Will re-fetch when projectId changes
   useProjectTasks(projectId, { dependencies: [projectId] });
   ```

4. **Force refresh after data mutations**:

   ```jsx
   const handleCreateTask = async (taskData) => {
     await dispatch(createTask(taskData));
     refetchTasks(true); // Force refresh after creating a task
   };
   ```

5. **Pre-fetch data** in parent components for better UX:
   ```jsx
   // In a layout component that wraps multiple pages
   useProjects({ skipInitialFetch: false }); // Pre-fetch projects
   ```

### Cache Management

1. **Use shorter cache timeouts for frequently changing data**
2. **Use longer cache timeouts for static or reference data**
3. **Force refresh after data mutations** (create, update, delete)
4. **Consider component hierarchy** when setting up caching (parent vs. child components)

## Troubleshooting

### Common Issues

1. **Data not refreshing after updates**:

   - Ensure you're calling the refetch function with `true` parameter after mutations
   - Check that the Redux slice is properly updating the timestamp when data changes

2. **Multiple components causing duplicate fetches**:

   - Verify components are using the same hook instance
   - Consider lifting state to a common ancestor component

3. **Cache timeout seems ignored**:

   - Check that the Redux slice has proper timestamp tracking
   - Verify the timestamp is being updated correctly in the Redux reducer

4. **Performance issues**:
   - Use memoized selectors to prevent unnecessary re-renders
   - Ensure dependencies array is properly specified

### Debugging Tips

1. **Add logging** to track caching behavior:

   ```jsx
   const { data, isLoading, error, refetch } = useDataFetching({
     ...config,
     onCacheHit: () => console.log('Using cached data'),
     onCacheMiss: () => console.log('Fetching fresh data'),
   });
   ```

2. **Use Redux DevTools** to inspect state changes and timestamps

3. **Monitor API calls** in browser dev tools network tab to verify caching is working

## Benefits

1. **Reduced server load**: Prevents redundant API calls by using cached data when appropriate
2. **Improved performance**: Less network traffic and faster UI rendering
3. **Simplified components**: Clean interface for data fetching that handles loading and error states
4. **Consistent caching**: Standardized caching behavior across the application

## Implementation Notes

- Cache timeout is configurable per hook usage
- Components can force a refresh when needed
- Each hook leverages existing Redux state for efficient data management
