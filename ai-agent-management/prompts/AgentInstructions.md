-- DO NOT UPDATE OR CHANGE THIS FILE IN ANY WAY --

# Instructions for Creating Comprehensive Code Review Request Documents

## Overview

This document provides guidelines for AI agents to create high-quality, comprehensive code review request documents. These documents should enable another AI agent to thoroughly understand a codebase issue without having direct access to the codebase itself.

## Output File

**IMPORTANT**: Always save your code review request document to a file named `TeammateReviewPrompt.md` in the project root directory. This standardized filename ensures consistency and makes it easy for other team members to locate review requests.

## Document Structure

Your code review request document should follow this structure:

1. **Title**: Clear, specific title describing the issue
2. **Project Overview**: Brief context about the project and the specific issue
3. **Current Implementation**: Detailed breakdown of relevant code
4. **Issues and Questions**: Specific problems to be addressed
5. **Request**: Clear instructions on what you're asking the reviewer to provide

## Guidelines for Each Section

### Title
- Make it specific to the technical issue (e.g., "Socket Implementation Review Request" rather than just "Code Review")
- Include the technology or framework if relevant (e.g., "Redux State Management Review Request")

### Project Overview
- Provide 2-3 sentences about the project's tech stack and purpose
- Clearly state the specific issue or feature that needs review
- Explain why this review is needed (e.g., "feature not working", "performance issues")
- Include any relevant context about deployment environment or constraints

Example:
```markdown
I'm working on a MERN stack application called uTool that has a notifications feature in the navbar. The notifications are supposed to be delivered in real-time using Socket.IO, but the socket connection has never worked properly. I need your help to review the current implementation and provide recommendations for fixing it.
```

### Current Implementation

This is the most critical section. For each relevant component:

1. **Use clear subsections** with descriptive headers
2. **Include complete, well-formatted code snippets** with syntax highlighting
3. **Provide context for each snippet** explaining its role in the system
4. **Include ALL relevant files** needed to understand the issue:
   - Server-side code
   - Client-side code
   - Configuration files
   - Database schemas (if relevant)
   - API endpoints
   - State management
5. **Show the complete flow** from end to end for the feature

Example structure:
```markdown
### Server-Side Implementation

#### Server Initialization (server.js)
```javascript
// Code snippet here with complete context
```

#### Controller Logic (userController.js)
```javascript
// Relevant controller methods
```

### Client-Side Implementation

#### API Service (api.js)
```javascript
// API call methods
```

#### Component (UserProfile.js)
```javascript
// Component implementation
```
```

### Issues and Questions

- List specific issues you've identified
- Include any error messages or unexpected behaviors
- Ask pointed questions about specific parts of the implementation
- Mention any attempted solutions that didn't work
- Include environment-specific details if relevant

Example:
```markdown
1. The Redux action dispatches correctly but the state doesn't update
2. The error only occurs in production, not in development
3. I've tried implementing solution X but encountered problem Y
4. Could the issue be related to the middleware configuration?
```

### Request

Be explicit about what you want the reviewer to provide:

- Analysis of specific issues
- Recommendations for improvements
- Code examples for implementation
- Best practices or patterns to follow
- Performance considerations

Example:
```markdown
Please review the code and provide:

1. An analysis of potential issues in the current Redux implementation
2. Recommendations for improving the state update logic
3. Suggestions for better error handling
4. Any best practices or patterns I should implement
5. Specific code changes that would help fix the issues
```

## Tips for Creating Effective Review Requests

1. **Be comprehensive**: Include all relevant code and context
2. **Be specific**: Focus on the particular issue rather than asking for general review
3. **Format code properly**: Use markdown code blocks with language specification
4. **Provide context**: Explain how components interact with each other
5. **Show the complete picture**: Include both client and server code if relevant
6. **Highlight pain points**: Draw attention to specific areas you suspect are problematic
7. **Include configuration**: Add relevant config files that might impact the issue

## Example Workflow

1. **Identify the issue**: Determine exactly what's not working
2. **Gather relevant code**: Collect all files involved in the feature
3. **Structure the document**: Follow the template above
4. **Add detailed code snippets**: Include complete, well-formatted code
5. **Formulate specific questions**: Ask targeted questions about implementation details
6. **Request specific feedback**: Clearly state what kind of help you need
7. **Save to TeammateReviewPrompt.md**: Always save your completed review request to this standardized filename

## Common Issues to Address

For different types of issues, focus on including:

### Performance Issues
- Rendering logic
- Data fetching patterns
- Caching implementation
- Database queries and indexes

### State Management Issues
- Action creators
- Reducers
- Middleware
- Store configuration
- Component connection to store

### API/Backend Issues
- Route definitions
- Controller logic
- Error handling
- Authentication flow
- Database operations

### UI/UX Issues
- Component hierarchy
- Event handling
- State updates
- Rendering optimization

## Final Checklist Before Saving to TeammateReviewPrompt.md

- [ ] All code snippets are properly formatted with syntax highlighting
- [ ] The complete feature flow is documented from end to end
- [ ] Specific issues and questions are clearly articulated
- [ ] The request section clearly states what feedback is needed
- [ ] All relevant configuration files are included
- [ ] The document follows the recommended structure

By following these guidelines, you'll create comprehensive review request documents that enable other AI agents to provide valuable, targeted feedback without having direct access to your codebase.
