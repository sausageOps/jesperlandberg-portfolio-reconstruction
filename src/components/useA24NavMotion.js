import { useEffect, useRef, useState } from 'react';

const WORDS = ['Projecting', 'Developing', 'Splicing', 'Rewinding', 'Spooling', 'Threading', 'Screening', 'Printing'];
const isReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDock = () => window.matchMedia('(max-width: 991px)').matches;

/** Navbar-only adaptation of the capture's loading/reveal timeline. */
export default function useA24NavMotion(loading, routeKey, hidden = false) {
  const [phase, setPhase] = useState(() => (isReduced() ? 'idle' : 'initial-hidden'));
  const [word, setWord] = useState('Projecting');
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const initialDone = useRef(isReduced());
  const initialStarted = useRef(performance.now());
  const previousRoute = useRef(routeKey);
  const previousHidden = useRef(hidden);
  const wordIndex = useRef(isReduced() ? -1 : 0);
  const routeBusy = useRef(false);
  const initialFinishing = useRef(false);
  const timers = useRef(new Set());
  const schedule = (fn, delay) => {
    const timer = window.setTimeout(() => { timers.current.delete(timer); fn(); }, delay);
    timers.current.add(timer);
    return timer;
  };
  const clearTimers = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current.clear();
  };

  useEffect(() => {
    if (!initialDone.current) {
      // Reference: first A24 beat after 0.8s; final reveal follows its 2.85s
      // minimum plus the 0.45s set-off and 0.15s navigation delay.
      schedule(() => {
        setPhase('initial-reveal');
        // Keep the reveal visible even if a busy main thread delayed the first beat.
        schedule(() => setMinimumElapsed(true), Math.max(2650, 3450 - (performance.now() - initialStarted.current)));
      }, 800);
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (event) => {
      if (event.matches && !initialDone.current) {
        clearTimers();
        initialDone.current = true;
        routeBusy.current = false;
        setPhase('idle');
      }
    };
    media.addEventListener('change', onMotionChange);
    return () => { media.removeEventListener('change', onMotionChange); clearTimers(); };
  }, []);

  useEffect(() => {
    if (initialDone.current || initialFinishing.current || loading || !minimumElapsed) return;
    initialFinishing.current = true;
    setPhase('exit-loading');
    schedule(() => setPhase('reveal-items'), 400);
    schedule(() => {
      initialDone.current = true;
      initialFinishing.current = false;
      setPhase('idle');
    }, 400 + (isDock() ? 340 : 50) + 700 + 100);
  }, [loading, minimumElapsed]);

  useEffect(() => {
    const previous = previousRoute.current;
    const wasHidden = previousHidden.current;
    previousRoute.current = routeKey;
    previousHidden.current = hidden;
    // Project panels cover the portfolio rather than starting a nav transition.
    // Reset an in-flight nav transition while hidden so it returns cleanly.
    if (hidden) {
      if (initialDone.current) {
        clearTimers();
        routeBusy.current = false;
        setPhase('idle');
      }
      return;
    }
    if (wasHidden) {
      // A closing project panel hands the navigation back: replay the site's own
      // reveal from the top - the compact intro (logo + loading word, dock slides
      // up), then the word leaves and the bar expands into its full idle state as
      // the items and the active dot arrive. Same phases and same 0.4s beats as
      // the boot tail in the effect above; nothing here is a separate animation.
      if (!initialDone.current) return;
      clearTimers();
      if (isReduced()) {
        routeBusy.current = false;
        setPhase('idle');
        return;
      }
      wordIndex.current = (wordIndex.current + 1) % WORDS.length;
      setWord(WORDS[wordIndex.current]);
      routeBusy.current = true;
      setPhase('initial-reveal');
      schedule(() => setPhase('exit-loading'), 400);
      schedule(() => setPhase('reveal-items'), 800);
      schedule(() => {
        routeBusy.current = false;
        setPhase('idle');
      }, 800 + (isDock() ? 340 : 50) + 700 + 100);
      return;
    }
    if (previous === routeKey || !initialDone.current || routeBusy.current) return;

    clearTimers();
    if (!routeBusy.current) {
      wordIndex.current = (wordIndex.current + 1) % WORDS.length;
      setWord(WORDS[wordIndex.current]);
    }
    routeBusy.current = true;
    if (isReduced()) {
      setPhase('loading');
    } else {
      setPhase('exit-items');
      // 3 navigation items exit over .4s with a .05s stagger, then .05s gap.
      schedule(() => setPhase('enter-loading'), 550);
      schedule(() => setPhase('loading'), 1250);
    }
    // The local router commits synchronously; the source waits at least 1.6s
    // from showing and at least 0.6s after the destination is ready.
    schedule(() => setPhase('exit-loading'), 1600);
    schedule(() => setPhase('reveal-items'), isReduced() ? 1600 : 2000);
    schedule(() => {
      routeBusy.current = false;
      setPhase('idle');
    }, isReduced() ? 1600 : 2000 + (isDock() ? 340 : 50) + 700 + 100);
  }, [routeKey, hidden]);

  return { phase, word, busy: phase !== 'idle', booting: !initialDone.current };
}
