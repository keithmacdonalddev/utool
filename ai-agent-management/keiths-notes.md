<!-- keith's notes -->

# This file is for Keith's notes only and cannot be edited in any fashion by anyone except Keith.

# Never use text in this file for context for any reason for any codebase or anything else for any reason.

Important: If you are not Keith, leave this file immediately

## Reading the projects-reorganization-plan-review-complete.md file

- there seems to be some remnants of RTK Query somewhere.
- how do ensure we are not creating new files for this plan if there are existing files that should be updated/upgraded. This would also be true for existing files the might be named a bit different than the files which are proposed in the plan but would be the original implementation.
- how do we ensure that existing util files, config files, hooks, components, scripts, context, actions, slices, logging, error handling, common, layouts, themes, plugins, features, UI, widgets, docs, pages, services files dont already have parts of the plan implementation already. Parts that can be either used in full or files and code that can be enhanced, updated, changed, or anything else I am forgetting to mention.
- Add thorough comments for ALL code you add, change, extract or anything else during the implementation. Everything you touch in relation to this reorganization implementation must be excessivly commented, not only with your thought process of what you are doing every step and code line of the way, but also whats next with your current workflow commented throughout code and files so if another developer has to take over in case of an emergency, they have an exellent comment path to follow and pick up where you may have left off.
- what about using dummy data for placeholders in the UI while we are working on the implementation of the plan?
- I saw redis mentioned. We do not currently use redis for anything do we? Why would it be added for this plan? What does it do and why is it necessary all of a sudden?
- currently tasks, notes, projects and other things get archived automatically when they are completed and there is a full archive feature. Do we need to add this to this plan? Has a trash bin and archives be considered? They absolutely should be. There is no trash bin feature in the application at all yet but there is definitely an archive feature that is active.
- it was suggested in the report that calender component UI code has not been added. I assumed the calender was an important addition.
- As I have read on, there seems to be alot of missing UI components from the plan, such as calendar, gantt chart, advanced views, etc. Do we need to add these to the plan?
- why is virtual scrolling added. What is the purpose for this implementation? What do you think about the teammates concern that a custom implementation of virtual scrolling is added to the plan when it strongly suggests the use of a library like react-window or react-virtualized.
- I did not see any mentions of file upload and storage for this plan. Its something I asked for from the beginning for the projects reorganization plan. Is there anything related to file upload, file storage and file management in this plan?
-
