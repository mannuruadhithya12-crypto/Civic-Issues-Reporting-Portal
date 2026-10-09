import React from 'react';

const Badge = ({ children, variant = 'neutral', className = '' }) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 'var(--spacing-1) var(--spacing-2)',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  };

  const variants = {
    success: { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' },
    warning: { backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
    danger: { backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
    info: { backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' },
    neutral: { backgroundColor: 'var(--color-neutral-200)', color: 'var(--text-secondary)' },
  };

  const style = { ...baseStyle, ...variants[variant] };

  return (
    <span style={style} className={className}>
      {children}
    </span>
  );
};

export default Badge;
