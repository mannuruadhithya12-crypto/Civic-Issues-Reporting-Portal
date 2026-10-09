import React from 'react';

const Button = ({ children, variant = 'primary', className = '', size = 'md', ...props }) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'var(--font-weight-medium)',
    borderRadius: 'var(--radius-md)',
    transition: 'all var(--transition-fast)',
    cursor: 'pointer',
    border: '1px solid transparent',
  };

  const variants = {
    primary: {
      backgroundColor: 'var(--color-primary-600)',
      color: '#fff',
    },
    secondary: {
      backgroundColor: 'var(--color-neutral-100)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)',
    },
    danger: {
      backgroundColor: 'var(--color-danger)',
      color: '#fff',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--color-primary-600)',
      border: '1px solid var(--color-primary-600)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
    }
  };

  const sizes = {
    sm: { padding: 'var(--spacing-1) var(--spacing-2)', fontSize: 'var(--font-size-sm)' },
    md: { padding: 'var(--spacing-2) var(--spacing-4)', fontSize: 'var(--font-size-base)' },
    lg: { padding: 'var(--spacing-3) var(--spacing-6)', fontSize: 'var(--font-size-lg)' },
  };

  const styles = {
    ...baseStyle,
    ...variants[variant],
    ...sizes[size]
  };

  return (
    <button style={styles} className={className} {...props}>
      {children}
    </button>
  );
};

export default Button;
