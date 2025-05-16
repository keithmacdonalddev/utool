## Implementation Progress for Guest User Functionality

### Completed Features

#### Hooks

- ✅ `useProjects.js` - Supports guest users
- ✅ `useProjectTasks.js` - Supports guest users
- ✅ `useRecentTasks.js` - Supports guest users
- ✅ `useNotes.js` - Supports guest users
- ✅ `useBookmarks.js` - Supports guest users
- ✅ `useFriends.js` - Now supports guest users

#### Slices

- ✅ `projectSlice.js` - Handles guest CRUD operations
- ✅ `taskSlice.js` - Handles guest CRUD operations
- ✅ `noteSlice.js` - Handles guest CRUD operations
- ✅ `bookmarkSlice.js` - Handles guest CRUD operations
- ✅ `friendSlice.js` - Now handles guest CRUD operations

#### Other

- ✅ `guestSandboxSlice.js` - Added support for friends
- ✅ `authSlice.js` - Added initialization of sample friends data for guest users
- ✅ `testGuestMode.js` - Created utility to test guest mode functionality

### Testing

- ✅ Verified that useProjects works in guest mode
- ✅ Verified that useNotes works in guest mode
- ✅ Verified that useBookmarks works in guest mode
- 🔄 Testing useFriends in guest mode

### Next Steps

1. Test full CRUD functionality for friends in guest mode
2. Verify that useFriends errors are resolved in guest mode
3. Add guest sandbox support for additional features if needed
4. Add more comprehensive test utilities
   npm install uuid

````
- **Verification:** Ensure `uuid` is added to `client/package.json`.

**Step 2: Create `guestSandboxSlice.js` ✅ (COMPLETED)**

- **Location:** `client/src/features/guestSandbox/guestSandboxSlice.js`
- **Content:** File has been created with all required functionality:
- Initial state for different entity types (tasks, projects, notes, etc.)
- CRUD reducers for managing guest data
- Helper selectors for accessing guest data
- Reset functionality for clearing guest data on logout

**Step 3: Integrate `guestSandboxSlice` into the Root Reducer ✅ (COMPLETED)**

- **File:** `client/src/app/store.js`
- **Action:** `guestSandboxReducer` has been imported and added to the `reducer` object in `configureStore`.

**Step 4: Modify `authSlice.js` for Logout Reset ✅ (COMPLETED)**

- The `logoutUser` thunk has been updated to dispatch the `resetGuestSandbox` action.
- Additionally, the implementation includes handling for guest user login/logout.

---

**Phase 2: Pilot Feature Implementation (Example: Tasks)**

**Step 5a: Modify Task Thunks ✅ (COMPLETED)**

- **File:** `client/src/features/tasks/taskSlice.js`
- The following thunks have been modified to support guest users:
- `createTask` - Creates tasks in the guest sandbox for guest users
- `getTasksForProject` - Returns tasks from the guest sandbox for guest users
- `updateTask` - Updates tasks in the guest sandbox for guest users
- `deleteTask` - Deletes tasks from the guest sandbox for guest users

**Step 5b: Update UI Component Selectors ✅ (PARTIALLY COMPLETED)**

- **File(s):** Components that display tasks (e.g., `TaskList.js`, `DashboardPage.js`)
- **Action:** Need to modify `useSelector` to conditionally select tasks from `state.guestSandbox.tasks` or `state.tasks.items`.
- **Example Implementation Needed:**

```javascript
const { user, isGuest } = useSelector((state) => state.auth);
const tasksFromSandbox = useSelector((state) => state.guestSandbox.tasks);
const tasksFromApi = useSelector((state) => state.tasks.items); // Adjust path as per your taskSlice

const tasksToDisplay = isGuest ? tasksFromSandbox : tasksFromApi;
````

**Step 5c: UI Interaction & Forms ❌ (INCOMPLETE)**

- Ensure forms for creating/editing tasks correctly dispatch to the modified thunks.
- The thunks have been modified, but UI components need to be checked to ensure they work correctly with guest data.

---

**Phase 3: Expansion and Testing**

**Step 6: Replicate for Other Features ✅ (PARTIALLY COMPLETED)**

- Apply the pattern from Step 5 to other core features:
  - Projects (`projectSlice.js`, project-related components) ✅ (COMPLETED)
  - Notes (`noteSlice.js`, note-related components) ✅ (COMPLETED)
  - Bookmarks (`bookmarkSlice.js`, bookmark-related components) ✅ (COMPLETED)
  - Quick Tasks, Project Notes, etc. ❌ (INCOMPLETE)

**Step 7: Comprehensive Testing Strategy ❌ (INCOMPLETE)**

- **Guest User Workflow:** Needs to be tested
- **Regular User Workflow (Regression Testing):** Needs to be tested
- **Transition Testing:** Needs to be tested

---

**Current Status and Next Steps:**

1. The core infrastructure for the guest sandbox has been implemented, including:

   - The `guestSandboxSlice` reducer
   - Integration with the root store
   - Auth slice modifications for guest login/logout
   - Task thunk modifications

2. Recent progress:

   - **Custom hooks updated for guest support:**
     - `useProjectTasks.js` - Updated to fetch tasks from guest sandbox for guest users
     - `useRecentTasks.js` - Updated to fetch recent tasks from guest sandbox for guest users
     - `useProjects.js` - Already had guest support for fetching project data from guest sandbox
     - `useNotes.js` - Updated to fetch notes from guest sandbox for guest users
     - `useBookmarks.js` - Created new hook to fetch bookmarks from guest sandbox for guest users
   - **Redux slices updated for guest support:**
     - `taskSlice.js` - Updated CRUD thunks to support guest users
     - `projectSlice.js` - Updated CRUD thunks to support guest users
     - `noteSlice.js` - Updated CRUD thunks to support guest users
     - `bookmarkSlice.js` - Updated CRUD thunks to support guest users
   - These hooks and thunks ensure that components using them automatically get the correct data source based on the user's guest status

3. The following items still need to be completed:

   - Check if any direct component selectors need to be updated (most should be covered by the hooks)
   - Verify UI interaction and forms work correctly with guest data
   - Conduct comprehensive testing

4. Priority for next steps:
   - Test the full CRUD workflow for tasks, projects, notes, and bookmarks as a guest user
   - Look for any remaining features that need guest support (Quick Tasks, Project Notes, etc.)
   - Update the Plan.md with progress on each step

---

**Request for Review and Suggestions:**

Dear AI Teammate,

Please review this plan for implementing guest user functionality using the "Guest Sandbox Slice" approach. I'm particularly interested in your feedback on:

1.  **Edge Cases & Interactions:** Are there any specific feature interactions or edge cases (e.g., data relationships between different types of items created by a guest, like a task within a guest-created project) that this plan might not fully address or that need special consideration within the `guestSandboxSlice`?
2.  **`guestSandboxSlice` Design:** Is the proposed structure for the `guestSandboxSlice` (actions, reducers, state shape) optimal and flexible enough for various data types? Any suggestions for improvement?
3.  **Performance:** Do you foresee any potential performance implications with storing potentially numerous guest-generated items in a single Redux slice, especially for UI rendering or selector computations?
4.  **Selector Logic:** Are there more elegant or efficient ways to handle the conditional selector logic in UI components (Step 5b)?
5.  **Thunk Return Values for Guests:** When a thunk handles a guest action (e.g., `createTask`), it currently dispatches to the sandbox and returns a simple object like `{ _isGuestCreation: true }`. Should it attempt to return the newly "created" guest item (with its temporary ID) from the sandbox state for immediate use, or is relying on components to re-select sufficient?
6.  **Overall Robustness:** Any other concerns or suggestions to make this implementation more robust, maintainable, or easier to test?

Thank you for your review and insights!
