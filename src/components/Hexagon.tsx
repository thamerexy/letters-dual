import React from 'react';
import './Hexagon.css';

interface HexagonProps {
  letter: string;
  owner?: 'none' | 'team1' | 'team2';
  onClick?: () => void;
}

export const Hexagon: React.FC<HexagonProps> = ({ letter, owner = 'none', onClick }) => {
  return (
    <div className="hexagon-wrapper" onClick={onClick}>
      <div className={`hexagon owner-${owner}`}>
        <span className="hexagon-inner">{letter}</span>
      </div>
    </div>
  );
};
