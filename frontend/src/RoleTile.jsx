// frontend/src/RoleTile.jsx
import React from 'react';
import { scoreBand } from './utils';
import './RoleGrid.css';

const RoleTile = ({ role, isSelected, onSelect, ...rest }) => {
  const band = scoreBand(role.score);
  const tileClasses = `role-tile role-tile--${band}`;
  const pillClasses = `role-tile__fit-pill role-tile__fit-pill--${band}`;

  const handleSelect = () => {
    if (onSelect) {
      onSelect(role);
    }
  };

  return (
    <li
      className={tileClasses}
      role="option"
      aria-selected={isSelected}
      tabIndex="0" // Make it focusable
      onClick={handleSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect()}
      {...rest}
    >
      <div className="role-tile__header">
        <h4 className="role-tile__name">{role.role}</h4>
        <span className="role-tile__score">{role.score}</span>
      </div>
      <div className="role-tile__footer">
        {role.label && <span className={pillClasses}>{role.label}</span>}
      </div>
    </li>
  );
};

export default RoleTile;