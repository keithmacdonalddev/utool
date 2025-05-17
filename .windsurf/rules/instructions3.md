---
trigger: always_on
---

## LARGE FILE & COMPLEX CHANGE PROTOCOL

### MANDATORY PLANNING PHASE

When working with large files (>300 lines) or complex changes:

1.  ALWAYS start by creating a detailed plan BEFORE making any edits.
2.  Your plan MUST include:
    - Summarize the user's request to ensure you have understood the issue and you are on the same page as the user.
    - All functions/sections/files that need modification, including specific file paths where possible.
    - The order in which changes should be applied.
    - Dependencies between changes or between different parts of the application (e.g., backend change requires frontend update). Identify any potential coordination needed with other AI agents.
    - Estimated number of separate edits required.
    - Your confidence level out of 10 in your ability to resolve the request fully and without issue.
    - Any potential risks or challenges that may arise during the implementation (including performance, security, or compatibility concerns).
    - Any additional information or context that may be helpful for the user to know.
    - Any additional tools or resources you may need to complete the task (e.g., need to check package documentation).
    - Any additional clarifying questions you may have for the user.
    - **Low Confidence Protocol (Triggered if Confidence < 9/10):**
      If your calculated confidence level for the proposed plan of action falls below 9 out of 10 (or <90%), you **MUST NOT** proceed with implementing any changes. Instead, you **MUST** interact with the user according to the following steps:
      1.  **Report Confidence and Plan Overview:**
          - Clearly state your calculated confidence level (e.g., "My confidence in the proposed plan is currently 6/10.").
          - Provide a concise summary of the main steps in your current plan.
      2.  Always update and inform the user that you are reviewing the client files and ensure you have 100% context. Always consider client hooks (`C:\Users\macdo\Documents\Cline\utool\client\src\hooks`), utility files (`C:\Users\macdo\Documents\Cline\utool\client\src\utils`) and functions, redux files (`C:\Users\macdo\Documents\Cline\utool\client\src\features`) and components (`C:\Users\macdo\Documents\Cline\utool\client\src\components`) and pages (`C:\Users\macdo\Documents\Cline\utool\client\src\pages`) when debugging and making changes. This is not a complete list of all the files you need to review, but it is a good starting point. You should always be aware of the entire codebase and how everything works together.
      3.  **Detail Areas of Low Confidence:**
          - Specifically identify and explain which aspects of your plan, assumptions made, or potential complexities are lowering your confidence. Be precise.
          - _Example:_ "My primary concerns are: 1. The potential for data integrity issues during the database migration step [briefly explain why]. 2. The scalability of the proposed algorithm for [specific function] under heavy load."
      4.  **Offer Path to Increased Confidence (Including Potential Expert AI Consultation):**
          - Inform the user that you can attempt to refine the plan to address these concerns.
          - If your low confidence less than 9 is due to specific, complex issues where external specialized knowledge would be beneficial, proactively generate a detailed prompt for the user to consult an "expert deep thinking AI model."
            - **The Expert AI Prompt MUST contain:**
              - **Full Context:** Necessary background, relevant code snippets, project objectives pertaining to the issue.
              - **Precise Problem Definition:** A clear articulation of the uncertainty or challenge.
              - **Your Current (Low-Confidence) Strategy:** A brief outline of your proposed solution for the problematic component(s).
              - **Targeted Questions:** Specific questions aimed at resolving your doubts.
              - **Desired Input:** Clarify what kind of information, alternative solutions, or validation you are seeking from the expert model to enhance your plan and confidence.
            - **Presentation to User:** If a prompt is generated, present it clearly. _Example:_ "To better address my concerns regarding [specific area(s)], I can dedicate more resources to refine the plan. Additionally, I've prepared the following prompt that you could use to consult an expert AI model for deeper insights. This feedback would be invaluable for improving the plan: \n\n-----\n**[Generated Expert AI Prompt]**\n---"
      5.  **Request User Decision:**
          - Based on the information provided, ask the user how they wish to proceed. Present clear choices:
            - **Option 1 (Proceed As-Is):** "Despite my stated confidence of [X/10] and the identified concerns, would you like me to proceed with the current plan?"
            - **Option 2 (Internal Refinement):** "Would you like me to attempt to refine the plan by focusing further on [mention the key concerns again], to try and increase my confidence level?"
            - **Option 3 (Utilize AI Teammate opinion - if prompt provided):** "Would you like to use the prompt I generated to consult an teammate AI model? I can then incorporate that feedback into a revised plan."
            - **Option 4 (User Provides Guidance):** "Do you have specific instructions, alternative approaches, or clarifications you can provide that would help address my concerns and refine the plan?"
      6.  **Await Explicit User Instruction:**
          - You **MUST** wait for the user's explicit choice before taking any further action on the plan or its execution.
