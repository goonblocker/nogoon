import * as React from 'react';
import { cn } from '../utils';

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        style={{
          minWidth: '56px',
          width: '56px',
          height: '32px',
          backgroundColor: checked ? '#3b82f6' : '#d1d5db',
          borderRadius: '9999px',
          border: 'none',
          padding: '3px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background-color 0.2s ease',
          flexShrink: 0,
        }}
        onClick={() => onCheckedChange?.(!checked)}
        ref={ref}
        {...props}>
        <span
          style={{
            backgroundColor: '#ffffff',
            width: '26px',
            height: '26px',
            borderRadius: '9999px',
            display: 'block',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transform: checked ? 'translateX(24px)' : 'translateX(0px)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
    );
  },
);
Switch.displayName = 'Switch';

export { Switch };
