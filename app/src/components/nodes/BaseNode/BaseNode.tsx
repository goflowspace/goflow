import {HTMLAttributes, forwardRef, memo} from 'react';

import cls from 'classnames';

const BaseNode = memo(
  forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & {selected?: boolean}>(({className, selected, ...props}, ref) => (
    <div
      ref={ref}
      className={cls('relative rounded-md border bg-card p-5 text-card-foreground', className, selected ? 'border-muted-foreground shadow-lg' : '', 'hover:ring-1')}
      tabIndex={0}
      {...props}
    />
  ))
);

BaseNode.displayName = 'BaseNode';
export default BaseNode;
