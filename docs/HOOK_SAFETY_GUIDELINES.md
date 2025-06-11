# Hook Safety Guidelines

## 🚨 Critical Patterns to Avoid Infinite Loops

### 1. **State Dependencies in useCallback/useEffect**

❌ **DANGEROUS:**

```javascript
const saveData = useCallback(
  (data) => {
    localStorage.setItem('key', JSON.stringify(data));
    setLastSaved(Date.now()); // This triggers re-render!
  },
  [state, setLastSaved]
); // 'state' in deps causes recreation on every state change
```

✅ **SAFE:**

```javascript
const stateRef = useStateRef(state);
const saveData = useCallback((data) => {
  localStorage.setItem('key', JSON.stringify(data));
  // Defer state update to prevent immediate re-render
  setTimeout(() => setLastSaved(Date.now()), 0);
}, []); // Empty deps - stable function
```

### 2. **Synchronous State Updates During Renders**

❌ **DANGEROUS:**

```javascript
const updateState = (newState) => {
  setState(newState);
  setLastUpdated(Date.now()); // Immediate state update during render cycle
  debouncedSave(newState); // Could trigger more updates
};
```

✅ **SAFE:**

```javascript
const updateState = useStableCallback((newState) => {
  setState(newState);
  // Defer secondary state updates
  setTimeout(() => setLastUpdated(Date.now()), 0);
  debouncedSave(newState);
}, []);
```

### 3. **Object/Array Recreation in Dependencies**

❌ **DANGEROUS:**

```javascript
const config = { timeout: 5000, retries: 3 }; // Recreated every render
useEffect(() => {
  fetchData(config);
}, [config]); // Runs on every render!
```

✅ **SAFE:**

```javascript
const config = useMemo(() => ({ timeout: 5000, retries: 3 }), []);
// OR
const config = useRef({ timeout: 5000, retries: 3 }).current;
```

## 🛡️ Required Safety Patterns

### 1. **Use Circuit Breakers for Persistence**

```javascript
import { useSafeDebounce } from '../utils/hookSafety';

const debouncedSave = useSafeDebounce(saveToStorage, 300, {
  maxCalls: 10,
  resetPeriod: 1000,
});
```

### 2. **Implement Loop Detection in Development**

```javascript
import { useRenderLoopDetection } from '../utils/hookSafety';

const MyComponent = () => {
  useRenderLoopDetection('MyComponent', 10);
  // ... component logic
};
```

### 3. **Use Safe Effects for Cleanup**

```javascript
import { useSafeEffect } from '../utils/hookSafety';

useSafeEffect(
  () => {
    // Setup logic
    return () => {
      // Cleanup logic (protected from StrictMode issues)
    };
  },
  [deps],
  { strictModeSafe: true, name: 'ComponentCleanup' }
);
```

## 📋 Mandatory Checklist for New Hooks

### Before Creating a Custom Hook:

- [ ] **Circuit Breaker**: Does it include loop detection for rapid operations?
- [ ] **Stable References**: Are callbacks and objects properly memoized?
- [ ] **State Dependencies**: Are state variables removed from useCallback/useEffect deps?
- [ ] **Async State Updates**: Are setState calls deferred when triggered by other state changes?
- [ ] **Development Logging**: Does it include debugging utilities for loop detection?

### Before Using localStorage/sessionStorage:

- [ ] **Debouncing**: Is writing debounced to prevent rapid saves?
- [ ] **Error Handling**: Are JSON parse/stringify errors caught?
- [ ] **Loop Protection**: Is there protection against save loops?
- [ ] **Cleanup**: Are timers/intervals properly cleared?

### Before Adding useEffect Dependencies:

- [ ] **Object Stability**: Are objects/arrays memoized or stable?
- [ ] **State References**: Can state be accessed via ref instead of dependency?
- [ ] **Callback Stability**: Are callbacks wrapped with useStableCallback?
- [ ] **Cleanup Safety**: Is cleanup protected from StrictMode issues?

## 🔧 Global Enforcement Tools

### 1. **ESLint Rules** (Add to .eslintrc.js)

```javascript
{
  "rules": {
    // Prevent common hook pitfalls
    "react-hooks/exhaustive-deps": ["error", {
      "additionalHooks": "useSafeEffect|useStableCallback"
    }],

    // Custom rules to enforce patterns
    "no-state-in-callback-deps": "error", // Custom rule to detect state in useCallback deps
    "require-circuit-breaker": "error" // Custom rule for persistence hooks
  }
}
```

### 2. **Development Monitoring**

Add to your main App component:

```javascript
import { useRenderLoopDetection } from './utils/hookSafety';

function App() {
  useRenderLoopDetection('App', 5);

  // Global error boundary for hook safety
  useEffect(() => {
    const handleError = (event) => {
      if (event.error?.message?.includes('Maximum update depth')) {
        console.error('🚨 INFINITE LOOP DETECTED GLOBALLY:', event.error);
        // Could send to error tracking service
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // ... rest of app
}
```

### 3. **Testing Requirements**

Every custom hook must include tests for:

```javascript
describe('MyCustomHook', () => {
  it('should not cause infinite loops with rapid updates', async () => {
    const { result } = renderHook(() => useMyHook());

    // Trigger rapid updates
    for (let i = 0; i < 20; i++) {
      act(() => {
        result.current.updateState({ value: i });
      });
    }

    // Should not have crashed or triggered circuit breaker
    expect(result.current.error).toBeFalsy();
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('INFINITE LOOP DETECTED')
    );
  });
});
```

## 🚨 Emergency Response Plan

### If Infinite Loop Detected in Production:

1. **Immediate**: Component-level circuit breaker activates (5-second cooldown)
2. **Short-term**: Error tracking notifies developers
3. **Investigation**: Check recent hook modifications for patterns above
4. **Resolution**: Apply appropriate safety pattern from this guide

### Common Root Causes:

1. **State in useCallback deps** → Use `useStateRef` pattern
2. **Synchronous setState during renders** → Use `setTimeout` deferral
3. **Object recreation in deps** → Use `useMemo` or `useRef`
4. **Cleanup timing issues** → Use `useSafeEffect`
5. **Missing debouncing** → Use `useSafeDebounce`

## 📚 Examples by Use Case

### Persistence Hooks

```javascript
// See client/src/hooks/useLocalStoragePersistence.js for full implementation
// Key patterns: circuit breaker, deferred setState, stable callbacks
```

### Data Fetching Hooks

```javascript
const useDataFetching = (url, options = {}) => {
  const optionsRef = useRef(options);
  const stableOptions = useMemo(() => optionsRef.current, []);

  const fetchData = useStableCallback(async () => {
    // fetch logic
  }, [url]);

  // ... rest of hook
};
```

### Form State Hooks

```javascript
const useFormState = (initialState) => {
  const [state, setState] = useState(initialState);
  const stateRef = useStateRef(state);

  const updateField = useStableCallback((field, value) => {
    setState((prev) => ({ ...prev, [field]: value }));
    // Deferred validation
    setTimeout(() => validateField(field, value), 0);
  }, []);

  // ... rest of hook
};
```

---

**Remember: Prevention is easier than debugging infinite loops in production! 🛡️**
