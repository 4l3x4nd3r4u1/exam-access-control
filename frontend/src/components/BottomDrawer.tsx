import type { ReactNode } from 'react';

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
}

export function BottomDrawer({ isOpen, onClose, children, ariaLabel }: BottomDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="bottom-drawer-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="bottom-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}
