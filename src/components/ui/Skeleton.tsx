import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  animate = true,
  className = '',
  style,
  ...props
}) => {
  const variantClasses = {
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
    text: 'rounded-md h-4 my-1',
  };

  const animationClass = animate ? 'animate-pulse' : '';

  return (
    <div
      aria-hidden="true"
      className={`bg-[var(--bg-elevated)] border border-[var(--border-subtle)] ${variantClasses[variant]} ${animationClass} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};
