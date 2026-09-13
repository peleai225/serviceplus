import React from 'react';

export type OperatorId = 'wave' | 'orange' | 'mtn' | 'moov';

interface Operator {
  id: OperatorId;
  name: string;
  logo: string;
  color: string;
  bgLight: string;
}

const OPERATORS: Operator[] = [
  {
    id: 'wave',
    name: 'Wave',
    logo: '/logos/wave.png',
    color: '#1AC8ED',
    bgLight: 'bg-sky-50',
  },
  {
    id: 'orange',
    name: 'Orange Money',
    logo: '/logos/orange.png',
    color: '#FF6600',
    bgLight: 'bg-orange-50',
  },
  {
    id: 'mtn',
    name: 'MTN MoMo',
    logo: '/logos/mtn.png',
    color: '#FFCC00',
    bgLight: 'bg-yellow-50',
  },
  {
    id: 'moov',
    name: 'Moov Money',
    logo: '/logos/moov.png',
    color: '#0072BC',
    bgLight: 'bg-blue-50',
  },
];

interface OperatorSelectorProps {
  selected: OperatorId;
  onChange: (id: OperatorId) => void;
  className?: string;
}

const OperatorSelector: React.FC<OperatorSelectorProps> = ({ selected, onChange, className = '' }) => {
  return (
    <div className={`grid grid-cols-2 gap-2.5 ${className}`}>
      {OPERATORS.map((op) => {
        const isSelected = selected === op.id;
        return (
          <button
            key={op.id}
            type="button"
            onClick={() => onChange(op.id)}
            className={`
              relative flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all duration-200
              ${isSelected ? 'bg-white scale-[1.02]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}
            `}
            style={isSelected ? { borderColor: op.color, boxShadow: `0 4px 14px ${op.color}33` } : {}}
          >
            <img
              src={op.logo}
              alt={op.name}
              className="h-8 w-auto max-w-[90px] object-contain"
            />
            {isSelected && (
              <div
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: op.color }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default OperatorSelector;
export { OPERATORS };
