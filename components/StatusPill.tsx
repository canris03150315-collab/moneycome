import React from 'react';

export const StatusPill: React.FC<{ className?: string; children: React.ReactNode }>=({ className='', children })=>{
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm ${className}`}>{children}</span>
  );
};
