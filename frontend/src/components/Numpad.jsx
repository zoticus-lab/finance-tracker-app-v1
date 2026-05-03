import React, { useState } from 'react';
import { Delete } from 'lucide-react';

export default function Numpad({ onChange, value = '0' }) {
  const displayValue = value === '0' ? '0' : value;

  const handleNumClick = (num) => {
    const newValue = displayValue === '0' ? String(num) : displayValue + String(num);
    onChange(newValue);
  };

  const handleDecimal = () => {
    if (!displayValue.includes('.')) {
      onChange(displayValue + '.');
    }
  };

  const handleBackspace = () => {
    const newValue = displayValue.slice(0, -1) || '0';
    onChange(newValue);
  };

  const handleClear = () => {
    onChange('0');
  };

  const numpadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'Back'],
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {numpadButtons.map((row, rowIdx) => (
        <React.Fragment key={rowIdx}>
          {row.map((btn) => (
            <button
              key={btn}
              type="button"
              onClick={() => {
                if (btn === 'Back') {
                  handleBackspace();
                } else if (btn === '.') {
                  handleDecimal();
                } else {
                  handleNumClick(btn);
                }
              }}
              className={`p-4 rounded-lg font-semibold text-lg transition-all active:scale-95 ${
                btn === 'Back'
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {btn === 'Back' ? <Delete size={20} /> : btn}
            </button>
          ))}
        </React.Fragment>
      ))}
      <button
        type="button"
        onClick={handleClear}
        className="col-span-3 p-3 rounded-lg bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-all text-sm"
      >
        Clear
      </button>
    </div>
  );
}
