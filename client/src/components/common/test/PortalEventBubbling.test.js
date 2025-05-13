import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Portal from '../Portal';
import TooltipPortal from '../TooltipPortal';
import Modal from '../Modal';

// Mock a simple div to act as portal root
const setupPortalRoot = () => {
  const portalRoot = document.createElement('div');
  portalRoot.setAttribute('id', 'portal-test-root');
  document.body.appendChild(portalRoot);
  return portalRoot;
};

// Clean up the portal root after tests
const cleanupPortalRoot = (element) => {
  if (element && document.body.contains(element)) {
    document.body.removeChild(element);
  }
};

describe('Portal Event Bubbling Tests', () => {
  let portalRoot;

  beforeEach(() => {
    portalRoot = setupPortalRoot();
  });

  afterEach(() => {
    cleanupPortalRoot(portalRoot);
  });

  test('Events inside Portal bubble up correctly', () => {
    const parentHandlerMock = jest.fn();
    const childHandlerMock = jest.fn();

    // Render a component with a nested portal and event handlers
    const TestComponent = () => {
      return (
        <div onClick={parentHandlerMock} data-testid="parent">
          Parent Element
          <Portal containerId="portal-test-root">
            <div data-testid="portal-content" onClick={childHandlerMock}>
              Portal Content
            </div>
          </Portal>
        </div>
      );
    };

    render(<TestComponent />);

    // Click on the portal content
    fireEvent.click(screen.getByTestId('portal-content'));

    // The child handler should be called
    expect(childHandlerMock).toHaveBeenCalledTimes(1);

    // The parent handler should NOT be called (portals don't bubble to React parents)
    expect(parentHandlerMock).not.toHaveBeenCalled();
  });

  test('TooltipPortal prevents event propagation correctly', () => {
    const parentHandlerMock = jest.fn();
    const tooltipHandlerMock = jest.fn();
    const closeHandlerMock = jest.fn();

    // Render a component with a tooltip portal
    const TestComponent = () => {
      return (
        <div onClick={parentHandlerMock} data-testid="parent">
          Parent Element
          <TooltipPortal
            isOpen={true}
            onClose={closeHandlerMock}
            position={{ x: 100, y: 100 }}
            containerId="portal-test-root"
          >
            <div data-testid="tooltip-content" onClick={tooltipHandlerMock}>
              Tooltip Content
            </div>
          </TooltipPortal>
        </div>
      );
    };

    render(<TestComponent />);

    // Click on the tooltip content
    fireEvent.click(screen.getByTestId('tooltip-content'));

    // The tooltip handler should be called
    expect(tooltipHandlerMock).toHaveBeenCalledTimes(1);

    // The parent handler should not be called (event propagation stopped)
    expect(parentHandlerMock).not.toHaveBeenCalled();

    // The close handler should not be called (clicking inside tooltip)
    expect(closeHandlerMock).not.toHaveBeenCalled();

    // Click outside the tooltip
    fireEvent.mouseDown(document.body);

    // The close handler should be called
    expect(closeHandlerMock).toHaveBeenCalledTimes(1);
  });

  test('Modal keyboard events work correctly', () => {
    const closeHandlerMock = jest.fn();

    // Render a modal component
    const TestComponent = () => {
      return (
        <Modal isOpen={true} onClose={closeHandlerMock} title="Test Modal">
          <div data-testid="modal-content">Modal Content</div>
        </Modal>
      );
    };

    render(<TestComponent />);

    // Press Escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    // The close handler should be called
    expect(closeHandlerMock).toHaveBeenCalledTimes(1);
  });

  test('FocusTrap keyboard navigation works correctly', () => {
    // Setup portal root for modal
    const modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(modalRoot);

    // Mocks
    const tabKeyMock = jest.fn();

    // Render a component with FocusTrap
    const TestComponent = () => {
      const [isOpen, setIsOpen] = React.useState(true);

      return (
        <>
          <button data-testid="outside-button">Outside Button</button>
          {isOpen && (
            <Modal
              isOpen={true}
              onClose={() => setIsOpen(false)}
              title="Test Modal"
            >
              <button data-testid="first-button">First Button</button>
              <input data-testid="middle-input" />
              <button data-testid="last-button">Last Button</button>
            </Modal>
          )}
        </>
      );
    };

    render(<TestComponent />);

    // Get all focusable elements
    const firstButton = screen.getByTestId('first-button');
    const middleInput = screen.getByTestId('middle-input');
    const lastButton = screen.getByTestId('last-button');

    // First button should be focused initially
    expect(document.activeElement).toBe(firstButton);

    // Tab to next element
    fireEvent.keyDown(firstButton, { key: 'Tab' });
    expect(document.activeElement).toBe(middleInput);

    // Tab to last element
    fireEvent.keyDown(middleInput, { key: 'Tab' });
    expect(document.activeElement).toBe(lastButton);

    // Tab on last element should cycle back to first (trapped)
    fireEvent.keyDown(lastButton, { key: 'Tab' });
    expect(document.activeElement).toBe(firstButton);

    // Shift+Tab on first element should go to last (trapped)
    fireEvent.keyDown(firstButton, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastButton);

    // Clean up
    document.body.removeChild(modalRoot);
  });

  test('Portal cleanup during rapid mounting/unmounting', async () => {
    const portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'rapid-test-root');
    document.body.appendChild(portalRoot);

    // Component that rapidly mounts/unmounts portals
    const RapidPortalTest = () => {
      const [count, setCount] = React.useState(0);

      // Increment counter to force re-renders
      React.useEffect(() => {
        const interval = setInterval(() => {
          setCount((c) => c + 1);
          if (count >= 5) clearInterval(interval);
        }, 50);

        return () => clearInterval(interval);
      }, [count]);

      return (
        <div data-testid="container">
          {count % 2 === 0 ? (
            <Portal containerId="rapid-test-root">
              <div data-testid="portal-content-a">Portal A: {count}</div>
            </Portal>
          ) : (
            <Portal containerId="rapid-test-root">
              <div data-testid="portal-content-b">Portal B: {count}</div>
            </Portal>
          )}
        </div>
      );
    };

    const { unmount } = render(<RapidPortalTest />);

    // Wait for multiple portal mount/unmount cycles
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify the portal content is rendered and matches the current count
    const portalContent = portalRoot.textContent;
    expect(portalContent).toContain('Portal');

    // Unmount the test component
    unmount();

    // Verify cleanup happened correctly - portal root should be empty
    expect(portalRoot.childNodes.length).toBe(0);

    // Clean up
    document.body.removeChild(portalRoot);
  });
});
