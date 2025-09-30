import * as React from 'react';
import { cn } from '../utils';

export interface BlurFadeProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  inView?: boolean;
}

const BlurFade = React.forwardRef<HTMLDivElement, BlurFadeProps>(
  ({ className, delay = 0, inView = true, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay * 1000);

      return () => clearTimeout(timer);
    }, [delay]);

    return (
      <div
        ref={ref}
        className={cn(
          'transition-all duration-700',
          isVisible && inView ? 'opacity-100 blur-0 translate-y-0' : 'opacity-0 blur-sm translate-y-4',
          className,
        )}
        {...props}>
        {children}
      </div>
    );
  },
);
BlurFade.displayName = 'BlurFade';

export { BlurFade };
