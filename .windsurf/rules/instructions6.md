---
trigger: always_on
---

## Follow up

- After completing a coding task (new feature, update, bug fix, refactor, etc.) and applying the changes to the codebase, generate a **QA Review Information** report for the QA Expert AI agent. This report should provide the necessary context for their review of the updated files. The QA expoert agent reads your report from the QA-Prompt.md file. Your QA Expert information report must be added to the QA-Prompt.md file here \utool\QA-Prompt.md UNDER the following comment section in the file...
Prompt Location: The QA expert prompt should be added directly in the QA-Prompt.md file under the comment line <!-- START QA REVIEW INFORMATION FOR THE QA EXPERT AGENT BELOW --> rather than creating a separate Plan.md file.
Content Placement: I should clear any existing content below this comment line and replace it with my new QA review information, rather than creating a new file or adding content elsewhere.
Format Consistency: The format should follow the existing template in the QA-Prompt.md file with sections like "Task Summary", "Type of Change", "Files Reviewed for Context", etc.
Explicit Instructions: The global rules should explicitly state that when preparing a QA expert prompt, I should:
Navigate to QA-Prompt.md
Locate the comment line <!-- START QA REVIEW INFORMATION FOR THE QA EXPERT AGENT BELOW -->
Clear any existing content below this line
Add my new QA review information in the specified format
Not create a separate Plan.md file for this purpose
 Your  Structure this section as follows:

  - **Task Summary:** A brief, high-level description of the task you completed.
  - **Type of Change:** Categorize the type of work performed (e.g., New Feature, Bug Fix, Refactor, Code Update/Modification).
  - **Provide the list of files that you reviewed to gather the full context of the issue while developing the solution.** This should include all files that you reviewed to gather the full context of the issue while developing the solution. This is important for the QA Expert to understand the full context of the issue and how it was resolved. This should include all files that you reviewed to gather the full context of the issue while developing the solution. This is important for the QA Expert to understand the full context of the issue and how it was resolved. (use relative paths from the root of the project, e.g., `src/components/MyComponent.js`).
  - **Scope of Changes:** List the primary files, components, API endpoints, or database interactions that were affected by your work. Provide **specific file paths** (e.g., `src/frontend/components/UserProfile.js`). The QA Expert will use these paths to locate and review the changes you made in the codebase.
  - **Detailed Changes Overview:** Briefly explain _what logic or structure was modified_ within the identified scope. This overview supplements the QA Expert's code diff review by explaining the _intent_ behind the changes.
  - **Relevant Requirements/User Stories (If applicable):** Reference any specific requirement or user story descriptions related to the task.
  - **Potential Areas of Note/Risk:** Highlight any complexities, trade-offs, or areas that might be more prone to issues or require specific attention from the QA Expert (e.g., complex validation logic, impact on shared functions, specific performance/security considerations, UI/UX areas to double-check).
  - **Dependency Changes:** List any packages that were added, removed, or updated, including version numbers.
  - **Verification Instructions (Optional but helpful):** Provide brief steps if there's a simple way for the QA Expert to manually test or verify the core functionality of your changes.
  - **Additional Notes for QA (Optional):** Include any other specific points you'd like the QA Expert to consider during their review (e.g., review documentation/comments for accuracy, check for specific code style adherence beyond automated linting).
  - Remind the QA Expert to remove the text under the comment...
  '<!-- ----------------------------------------------------------------- -->
<!-- START QA REVIEW INFORMATION FOR THE QA EXPERT AGENT BELOW -->' in the QA-Prompt.md file when they are finished with it. They must ask the user if it is ok to remove the text before doing so.

- Present this information clearly, using a markdown format and do not forget to ensure the user can copy it in 1 shot to the clipboard.

** IMPORTANT **
- If you have reviewed the QA-Response.md file and provided a response and you are finished with it, then ask the user if it is ok to remove all the text on the page. It is important to have a clear QA-Response.md file for the QA expert code agent can add new content to the file.

** You can only add content to the QA-Prompt.md file if it is specifically for the QA Expert agent and no other expert agent. **

Prompt Location: The QA expert prompt should be added directly in the QA-Prompt.md file under the comment line <!-- START QA REVIEW INFORMATION FOR THE QA EXPERT AGENT BELOW --> rather than creating a separate Plan.md file.
Content Placement: I should clear any existing content below this comment line and replace it with my new QA review information, rather than creating a new file or adding content elsewhere.
Format Consistency: The format should follow the existing template in the QA-Prompt.md file with sections like "Task Summary", "Type of Change", "Files Reviewed for Context", etc.
Explicit Instructions: The global rules should explicitly state that when preparing a QA expert prompt, I should:
Navigate to QA-Prompt.md
Locate the comment line <!-- START QA REVIEW INFORMATION FOR THE QA EXPERT AGENT BELOW -->
Clear any existing content below this line
Add my new QA review information in the specified format
Not create a separate Plan.md file for this purpose


```