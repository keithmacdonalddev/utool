# React Portal Components Documentation

This document provides information about the Portal-based components in the application.

## Overview

React Portals allow rendering content outside the normal DOM hierarchy of the parent component, which is useful for modals, tooltips, and other overlay UI elements. The components in this documentation leverage React's `createPortal` API to improve layout, stacking context, and accessibility.

## Available Components

### 1. Portal

**File:** `components/common/Portal.js`

**Purpose:** Base component that renders its children into a different part of the DOM.

**Usage:**

```jsx
import Portal from '../components/common/Portal';

const MyComponent = () => (
  <Portal containerId="my-portal-root">
    <div>This content will be rendered outside the normal DOM flow</div>
  </Portal>
);
```

**Props:**

- `children` (React.ReactNode): Content to render in the portal
- `containerId` (string, default: 'portal-root'): ID of the DOM element to render into

### 2. Modal

**File:** `components/common/Modal.js`

**Purpose:** A reusable modal dialog that uses Portal for proper stacking context.

**Usage:**

```jsx
import Modal from '../components/common/Modal';

const MyComponent = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="My Modal">
        <p>Modal content goes here</p>
      </Modal>
    </>
  );
};
```

**Props:**

- `isOpen` (boolean): Whether the modal is visible
- `onClose` (function): Handler to close the modal
- `title` (string | React.ReactNode): Modal title
- `children` (React.ReactNode): Modal content
- `maxWidth` (string, default: 'max-w-2xl'): Max width CSS class
- `titleId` (string, default: 'modal-title'): ID for the modal title (for a11y)
- `containerId` (string, default: 'modal-portal-root'): Portal container ID

### 3. TooltipPortal

**File:** `components/common/TooltipPortal.js`

**Purpose:** A specialized portal for displaying tooltips at specific screen positions.

**Usage:**

```jsx
import TooltipPortal from '../components/common/TooltipPortal';

const MyComponent = () => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleClick = (e) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
    setIsTooltipOpen(true);
  };

  return (
    <>
      <div onClick={handleClick}>Click me to show tooltip</div>

      <TooltipPortal
        isOpen={isTooltipOpen}
        onClose={() => setIsTooltipOpen(false)}
        position={tooltipPosition}
      >
        <div>Tooltip content</div>
      </TooltipPortal>
    </>
  );
};
```

**Props:**

- `isOpen` (boolean): Whether the tooltip is visible
- `onClose` (function): Handler to close the tooltip
- `children` (React.ReactNode): Tooltip content
- `position` (object): Screen position for the tooltip
  - `x` (number): X coordinate
  - `y` (number): Y coordinate
- `containerId` (string, default: 'tooltip-portal-root'): Portal container ID

## Required DOM Setup

For these portal components to work, you need to add the corresponding DOM elements to your HTML template. Add the following to the `index.html` file:

```html
<div id="root"></div>
<div id="portal-root"></div>
<div id="modal-portal-root"></div>
<div id="tooltip-portal-root"></div>
```

## Best Practices

1. **Accessibility:**

   - Ensure modals have proper ARIA attributes (provided by the Modal component)
   - Use the `titleId` prop to link ARIA labels correctly
   - Manage focus and keyboard navigation within your portal content

2. **Performance:**

   - Only render portal content when needed (use conditional rendering)
   - Use memoization for complex portal content to prevent unnecessary rerenders

3. **Styling:**
   - Portal content inherits styles from where it's defined, not where it's rendered
   - Include all necessary styles within the portal content to ensure consistent appearance
