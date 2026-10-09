import React from 'react';

const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: { width: '16px', height: '16px', borderWidth: '2px' },
    md: { width: '24px', height: '24px', borderWidth: '3px' },
    lg: { width: '36px', height: '36px', borderWidth: '4px' },
  };

  const style = {
    ...sizes[size],
    borderStyle: 'solid',
    borderColor: 'var(--color-neutral-200)',
    borderTopColor: 'var(--color-primary-600)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block'
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={style} className={className} />
    </>
  );
};

export default Spinner;
