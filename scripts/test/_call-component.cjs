'use strict';

// Test-only helper — NOT part of the shipped site.
//
// WHY: react-dom/server (what the other tests render through) never runs
// effects and cannot set state, and this repo carries no DOM (no jsdom). The
// admin users page keeps its handlers (openGrantModal, onGrantScans, ...) as
// closures INSIDE the page component, so the only way to drive the REAL
// handlers — not a copy of them — is to call the component function itself
// under a stand-in hook dispatcher:
//
//   - useState returns a preset value per hook position (so the test can say
//     "the page has loaded these users and window X is open") and a setter
//     that only RECORDS what it was called with;
//   - useEffect / useLayoutEffect do nothing; useMemo / useCallback run the
//     function; useContext returns undefined (so useToast falls back to its
//     no-op object — the test replaces that module's export anyway).
//
// What comes back is the element tree the component returned. Handlers are
// reached through the elements' props (an <ActionBtn onClick>, a window's
// onConfirm), called, and what they did is read from the recorded setters and
// from the fakes the test installed. React's own renderer is not involved, so
// this proves what the handlers DO, not how React schedules the re-render.
//
// The positions of the state hooks are the test's contract with the page: the
// test asserts the declared order from the source, so reordering them fails
// loudly instead of silently feeding a value to the wrong hook.

const React = require('react');

const DISPATCHER_HOLDER = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;

/** Call a function component with `props`; `states` maps hook position -> value. */
function callComponent(Comp, props, states = {}) {
  const setters = [];
  let position = 0;
  const dispatcher = {
    useState(init) {
      const at = position++;
      const value = at in states ? states[at] : typeof init === 'function' ? init() : init;
      const record = { calls: [] };
      setters[at] = record;
      return [value, (v) => record.calls.push(v)];
    },
    useEffect() {},
    useLayoutEffect() {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (init) => ({ current: init }),
    useContext: () => undefined,
  };
  const previous = DISPATCHER_HOLDER.current;
  DISPATCHER_HOLDER.current = dispatcher;
  try {
    return { tree: Comp(props), setters };
  } finally {
    DISPATCHER_HOLDER.current = previous;
  }
}

/** Every element in `node` (any prop that holds elements or arrays of them) matching `pred`. */
function findAll(node, pred, out = []) {
  if (Array.isArray(node)) {
    node.forEach((n) => findAll(n, pred, out));
    return out;
  }
  if (!React.isValidElement(node)) return out;
  if (pred(node)) out.push(node);
  for (const v of Object.values(node.props || {})) {
    if (Array.isArray(v) || React.isValidElement(v)) findAll(v, pred, out);
  }
  return out;
}

module.exports = { callComponent, findAll };
