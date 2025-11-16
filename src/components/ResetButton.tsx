import React from 'react';

interface ResetButtonProps {
  text: string;
  onClick: () => void;
  className?: string;
}

const ResetButton: React.FC<ResetButtonProps> = ({ text, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`bg-[#e2b714] hover:bg-[#f4d03f] text-[#323437] font-bold rounded transition duration-300 ${className}`}
    >
      {text}
    </button>
  );
};

export default ResetButton;
