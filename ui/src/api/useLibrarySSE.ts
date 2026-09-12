 
import { useEffect, useRef } from 'react';

function base(): string {
  return `http://127.0.0.1:${(window as any).__ECHO_PORT__ ?? 8000}`;
}

 
const SCOPE_TO_EVENTS: Record<string, string[]> = {
  library:  ['echo:library-changed'],
  webcomps: ['echo:webcomps-changed'],
  comps: ['echo:comps-changed'],
  
  timeline: ['echo:timeline-changed', 'echo:tracks-changed'],
  effects:  ['echo:effects-changed'],
  masks: ['echo:masks-changed'],
  transitions: ['echo:transition-changed'],
  render:   ['echo:render-now'],      
 
  agent_resume: ['echo:agent-resume'],
 
  project:  ['echo:library-changed', 'echo:webcomps-changed', 'echo:comps-changed',
             'echo:tracks-changed', 'echo:timeline-changed'],
 
  all: ['echo:library-changed', 'echo:webcomps-changed', 'echo:comps-changed',
             'echo:timeline-changed', 'echo:tracks-changed',
             'echo:effects-changed', 'echo:masks-changed', 'echo:transition-changed'],
};

export function useLibrarySSE(): void {
  const esRef = useRef<EventSource | null>(null);
  const retryMs = useRef(500);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let dead = false;

    function connect() {
      if (dead) return;
      const url = `${base()}/events`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener('connected', () => {
        retryMs.current = 500;
      });

 
      const scopes = Object.keys(SCOPE_TO_EVENTS);
      for (const scope of scopes) {
        if (scope === 'agent_resume') continue;  
        es.addEventListener(scope, () => {
          for (const eventName of SCOPE_TO_EVENTS[scope]) {
            window.dispatchEvent(new CustomEvent(eventName));
          }
        });
      }

    
      es.addEventListener('agent_resume', (e: Event) => {
        try {
          const msg = e as MessageEvent;
          const data = JSON.parse(msg.data);
          window.dispatchEvent(new CustomEvent('echo:agent-resume', { detail: data }));
        } catch {   }
      });
 
      es.addEventListener('job', (e: Event) => {
        try {
          const msg = e as MessageEvent;
          const data = JSON.parse(msg.data);
          window.dispatchEvent(new CustomEvent('echo:job-update', { detail: data }));
        } catch {  }
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!dead) {
          const delay = retryMs.current;
          retryMs.current = Math.min(delay * 2, 15_000);  
          timer.current = setTimeout(connect, delay);
        }
      };
    }

    
    if ((window as any).__ECHO_PORT__) {
      connect();
    } else {
      const onPort = () => connect();
      window.addEventListener('echo:port', onPort, { once: true });
      return () => {
        dead = true;
        window.removeEventListener('echo:port', onPort);
        esRef.current?.close();
        if (timer.current) clearTimeout(timer.current);
      };
    }

    return () => {
      dead = true;
      esRef.current?.close();
      esRef.current = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
}
