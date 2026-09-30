import React from 'react';

// One row in the live queue "board". highlight=true flashes amber when this
// row belongs to the token that was just called.
export default function TokenRow({ position, tokenNumber, name, highlight }) {
  return (
    <div className={`board-row ${highlight ? 'bg-amber/10' : ''}`}>
      <div className="flex items-center gap-4">
        <span className="board-number text-slate w-8">{String(position).padStart(2, '0')}</span>
        <span className="text-offwhite">{name}</span>
      </div>
      <span className={`board-number ${highlight ? 'text-amber' : 'text-offwhite'}`}>
        #{tokenNumber}
      </span>
    </div>
  );
}
