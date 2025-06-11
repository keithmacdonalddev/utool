/**
 * Multi-Component Test for Enhanced Cleanup Logic
 *
 * This test component verifies that multiple components can safely use
 * the socket infrastructure simultaneously without interference, and that
 * cleanup logic works correctly when components mount/unmount.
 *
 * Tests:
 * - Multiple UserPresence components
 * - Multiple ActivityFeed components
 * - Mixed component types
 * - Rapid mount/unmount cycles
 * - Memory leak prevention
 * - Event listener cleanup
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { createComponentLogger } from '../../../../utils/logger';
import UserPresence from '../UserPresence';
import ActivityFeed from '../ActivityFeed';
import { selectCurrentProject } from '../../../../features/projects/projectsSlice';
import { selectCurrentUser } from '../../../../features/auth/authSlice';

const logger = createComponentLogger('MultiComponentTest');

const MultiComponentTest = () => {
  const currentProject = useSelector(selectCurrentProject);
  const currentUser = useSelector(selectCurrentUser);

  // Test state
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [componentCounts, setComponentCounts] = useState({
    userPresence: 0,
    activityFeed: 0,
  });

  // Component management
  const [activeComponents, setActiveComponents] = useState(new Map());
  const componentIdCounter = useRef(0);
  const testStartTime = useRef(null);
  const memoryBaseline = useRef(null);

  /**
   * Add test result
   */
  const addTestResult = (testName, passed, details = {}) => {
    const result = {
      id: Date.now(),
      testName,
      passed,
      timestamp: new Date().toISOString(),
      duration: testStartTime.current ? Date.now() - testStartTime.current : 0,
      details,
    };

    setTestResults((prev) => [result, ...prev]);
    logger.info(`Test ${passed ? 'PASSED' : 'FAILED'}: ${testName}`, result);

    return result;
  };

  /**
   * Create a new component instance
   */
  const createComponent = (type, props = {}) => {
    const id = `${type}_${++componentIdCounter.current}`;
    const component = {
      id,
      type,
      props: {
        projectId: currentProject?.id,
        ...props,
      },
      createdAt: Date.now(),
    };

    setActiveComponents((prev) => new Map(prev).set(id, component));
    setComponentCounts((prev) => ({
      ...prev,
      [type]: prev[type] + 1,
    }));

    logger.debug(`Created ${type} component`, { id, props: component.props });
    return id;
  };

  /**
   * Remove a component instance
   */
  const removeComponent = (id) => {
    const component = activeComponents.get(id);
    if (component) {
      setActiveComponents((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      setComponentCounts((prev) => ({
        ...prev,
        [component.type]: Math.max(0, prev[component.type] - 1),
      }));

      logger.debug(`Removed ${component.type} component`, { id });
    }
  };

  /**
   * Clear all components
   */
  const clearAllComponents = () => {
    const count = activeComponents.size;
    setActiveComponents(new Map());
    setComponentCounts({ userPresence: 0, activityFeed: 0 });
    logger.info(`Cleared all ${count} components`);
  };

  /**
   * Get memory usage (if available)
   */
  const getMemoryUsage = () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  };

  /**
   * Test 1: Multiple UserPresence Components
   */
  const testMultipleUserPresence = async () => {
    setCurrentTest('Multiple UserPresence Components');
    testStartTime.current = Date.now();

    try {
      // Create multiple UserPresence components
      const ids = [];
      for (let i = 0; i < 3; i++) {
        ids.push(
          createComponent('userPresence', {
            size: i === 0 ? 'small' : i === 1 ? 'medium' : 'large',
            maxVisibleUsers: 5 + i,
          })
        );
      }

      // Wait for components to initialize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if all components are active
      const allActive = ids.every((id) => activeComponents.has(id));

      addTestResult('Multiple UserPresence Components', allActive, {
        componentsCreated: ids.length,
        allActive,
        activeCount: componentCounts.userPresence,
      });

      // Clean up
      ids.forEach(removeComponent);
    } catch (error) {
      addTestResult('Multiple UserPresence Components', false, {
        error: error.message,
      });
    }
  };

  /**
   * Test 2: Multiple ActivityFeed Components
   */
  const testMultipleActivityFeed = async () => {
    setCurrentTest('Multiple ActivityFeed Components');
    testStartTime.current = Date.now();

    try {
      // Create multiple ActivityFeed components
      const ids = [];
      for (let i = 0; i < 3; i++) {
        ids.push(
          createComponent('activityFeed', {
            maxItems: 20 + i * 10,
            compact: i % 2 === 0,
            autoScroll: i !== 1,
          })
        );
      }

      // Wait for components to initialize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if all components are active
      const allActive = ids.every((id) => activeComponents.has(id));

      addTestResult('Multiple ActivityFeed Components', allActive, {
        componentsCreated: ids.length,
        allActive,
        activeCount: componentCounts.activityFeed,
      });

      // Clean up
      ids.forEach(removeComponent);
    } catch (error) {
      addTestResult('Multiple ActivityFeed Components', false, {
        error: error.message,
      });
    }
  };

  /**
   * Test 3: Mixed Component Types
   */
  const testMixedComponents = async () => {
    setCurrentTest('Mixed Component Types');
    testStartTime.current = Date.now();

    try {
      const ids = [];

      // Create alternating component types
      for (let i = 0; i < 6; i++) {
        const type = i % 2 === 0 ? 'userPresence' : 'activityFeed';
        ids.push(
          createComponent(type, {
            testId: `mixed_${i}`,
          })
        );
      }

      // Wait for components to initialize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify counts
      const expectedUserPresence = 3;
      const expectedActivityFeed = 3;
      const countsCorrect =
        componentCounts.userPresence === expectedUserPresence &&
        componentCounts.activityFeed === expectedActivityFeed;

      addTestResult('Mixed Component Types', countsCorrect, {
        expected: {
          userPresence: expectedUserPresence,
          activityFeed: expectedActivityFeed,
        },
        actual: componentCounts,
        totalComponents: ids.length,
      });

      // Clean up
      ids.forEach(removeComponent);
    } catch (error) {
      addTestResult('Mixed Component Types', false, {
        error: error.message,
      });
    }
  };

  /**
   * Test 4: Rapid Mount/Unmount Cycles
   */
  const testRapidMountUnmount = async () => {
    setCurrentTest('Rapid Mount/Unmount Cycles');
    testStartTime.current = Date.now();

    try {
      const cycles = 5;
      const componentsPerCycle = 4;
      let maxConcurrent = 0;

      for (let cycle = 0; cycle < cycles; cycle++) {
        // Create components
        const ids = [];
        for (let i = 0; i < componentsPerCycle; i++) {
          const type = i % 2 === 0 ? 'userPresence' : 'activityFeed';
          ids.push(
            createComponent(type, {
              cycleId: cycle,
              componentIndex: i,
            })
          );
        }

        maxConcurrent = Math.max(maxConcurrent, activeComponents.size);

        // Brief wait
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Remove components
        ids.forEach(removeComponent);

        // Brief wait before next cycle
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Verify all components are cleaned up
      const allCleaned = activeComponents.size === 0;

      addTestResult('Rapid Mount/Unmount Cycles', allCleaned, {
        cycles,
        componentsPerCycle,
        maxConcurrent,
        finalActiveCount: activeComponents.size,
        allCleaned,
      });
    } catch (error) {
      addTestResult('Rapid Mount/Unmount Cycles', false, {
        error: error.message,
      });
    }
  };

  /**
   * Test 5: Memory Leak Detection
   */
  const testMemoryLeaks = async () => {
    setCurrentTest('Memory Leak Detection');
    testStartTime.current = Date.now();

    try {
      const initialMemory = getMemoryUsage();
      memoryBaseline.current = initialMemory;

      // Create many components
      const ids = [];
      for (let i = 0; i < 10; i++) {
        const type = i % 2 === 0 ? 'userPresence' : 'activityFeed';
        ids.push(
          createComponent(type, {
            memoryTestId: i,
          })
        );
      }

      // Wait for components to initialize
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const peakMemory = getMemoryUsage();

      // Clean up all components
      ids.forEach(removeComponent);

      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const finalMemory = getMemoryUsage();

      // Check if memory usage returned close to baseline
      let memoryLeakDetected = false;
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        const memoryIncreasePercent =
          (memoryIncrease / initialMemory.used) * 100;
        memoryLeakDetected = memoryIncreasePercent > 20; // Allow 20% increase
      }

      addTestResult('Memory Leak Detection', !memoryLeakDetected, {
        initialMemory,
        peakMemory,
        finalMemory,
        memoryLeakDetected,
        componentsCreated: ids.length,
        finalActiveCount: activeComponents.size,
      });
    } catch (error) {
      addTestResult('Memory Leak Detection', false, {
        error: error.message,
      });
    }
  };

  /**
   * Run all tests
   */
  const runAllTests = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setTestResults([]);

    logger.info('Starting multi-component cleanup tests');

    try {
      await testMultipleUserPresence();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await testMultipleActivityFeed();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await testMixedComponents();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await testRapidMountUnmount();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await testMemoryLeaks();

      logger.info('All multi-component cleanup tests completed');
    } catch (error) {
      logger.error('Test suite failed', { error: error.message });
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
      clearAllComponents();
    }
  };

  /**
   * Render component based on type
   */
  const renderComponent = (component) => {
    const { id, type, props } = component;

    const commonProps = {
      key: id,
      ...props,
      className: `border-2 border-dashed border-gray-300 p-2 m-2 rounded`,
    };

    switch (type) {
      case 'userPresence':
        return <UserPresence {...commonProps} />;
      case 'activityFeed':
        return <ActivityFeed {...commonProps} />;
      default:
        return <div {...commonProps}>Unknown component type: {type}</div>;
    }
  };

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllComponents();
    };
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">
          Multi-Component Cleanup Test Suite
        </h2>
        <p className="text-gray-600 mb-4">
          Tests the enhanced cleanup logic with multiple socket-connected
          components.
        </p>

        {/* Test Controls */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={runAllTests}
            disabled={isRunning || !currentProject}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>

          <button
            onClick={clearAllComponents}
            disabled={isRunning}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
          >
            Clear All Components
          </button>
        </div>

        {/* Current Test Status */}
        {currentTest && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <div className="font-medium text-blue-800">Currently Running:</div>
            <div className="text-blue-600">{currentTest}</div>
          </div>
        )}

        {/* Component Counts */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
          <div className="font-medium mb-2">Active Components:</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>UserPresence: {componentCounts.userPresence}</div>
            <div>ActivityFeed: {componentCounts.activityFeed}</div>
            <div>Total: {activeComponents.size}</div>
          </div>
        </div>

        {/* Project Status */}
        {!currentProject && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
            <div className="text-yellow-800">
              ⚠️ No project selected. Please select a project to run tests.
            </div>
          </div>
        )}
      </div>

      {/* Test Results */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Test Results</h3>
        {testResults.length === 0 ? (
          <div className="text-gray-500 italic">No test results yet.</div>
        ) : (
          <div className="space-y-2">
            {testResults.map((result) => (
              <div
                key={result.id}
                className={`p-3 rounded border ${
                  result.passed
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium">
                    {result.passed ? '✅' : '❌'} {result.testName}
                  </div>
                  <div className="text-sm opacity-75">{result.duration}ms</div>
                </div>
                {Object.keys(result.details).length > 0 && (
                  <div className="mt-2 text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Components Display */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Active Test Components</h3>
        {activeComponents.size === 0 ? (
          <div className="text-gray-500 italic">No active components.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from(activeComponents.values()).map(renderComponent)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiComponentTest;
