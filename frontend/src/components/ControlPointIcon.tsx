type IconName = 'back' | 'search' | 'room' | 'exam' | 'chevron' | 'ban' | 'clock' | 'type' | 'status' | 'term' | 'down' | 'check';

export function ControlPointIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    back: <path d="M20 12H4m6-6-6 6 6 6" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    room: <><path d="M3 21h18M5 21V7h14v14M9 7V3h6v4M10 21v-5h4v5" /><path d="M8 11h1m6 0h1" /></>,
    exam: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    ban: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    type: <><path d="m3 8 9-5 9 5-9 5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    status: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
    term: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 11h18" /></>,
    down: <path d="m6 9 6 6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg className="cp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
