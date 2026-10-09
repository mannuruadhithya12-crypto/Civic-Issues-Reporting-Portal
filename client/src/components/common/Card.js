import React from 'react';

const Card = ({ children, className = '', noPadding = false, ...props }) => {
  return (
    <div
      className={`bg-surface rounded-lg shadow-sm border border-light ${noPadding ? '' : 'p-4'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
