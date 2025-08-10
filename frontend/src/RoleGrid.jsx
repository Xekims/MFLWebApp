// frontend/src/RoleGrid.jsx
import React, { useState, useEffect, useRef } from 'react';
import RoleTile from './RoleTile';
import SkeletonRoleTile from './SkeletonRoleTile';
import './RoleGrid.css';

const RoleGrid = ({ roles, isLoading, selectedTier, onSelect }) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const gridRef = useRef(null);

  useEffect(() => {
    setActiveIndex(-1); // Reset on role change
  }, [roles]);

  const handleKeyDown = (event) => {
    if (!gridRef.current) return;
    const items = Array.from(gridRef.current.querySelectorAll('[role="option"]'));
    if (items.length === 0) return;

    let newIndex = activeIndex;

    switch (event.key) {
      case 'ArrowRight':
        newIndex = (activeIndex + 1) % items.length;
        break;
      case 'ArrowLeft':
        newIndex = (activeIndex - 1 + items.length) % items.length;
        break;
      case 'ArrowDown':
        // This is a simplified grid nav; for more complex grids, this logic would be more involved
        const cols = getComputedStyle(gridRef.current).gridTemplateColumns.split(' ').length;
        newIndex = Math.min(items.length - 1, activeIndex + cols);
        break;
      case 'ArrowUp':
        const colsUp = getComputedStyle(gridRef.current).gridTemplateColumns.split(' ').length;
        newIndex = Math.max(0, activeIndex - colsUp);
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        if (activeIndex !== -1 && onSelect) {
          event.preventDefault();
          onSelect(roles[activeIndex]);
        }
        return; // Don't update focus
      default:
        return;
    }

    event.preventDefault();
    setActiveIndex(newIndex);
    items[newIndex]?.focus();
  };

  if (isLoading) {
    return (
      <div className="role-grid" aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonRoleTile key={i} />)}
      </div>
    );
  }

  if (!roles || roles.length === 0) {
    return (
      <div className="role-grid">
        <div className="role-grid__empty-state" role="status" aria-live="polite">
          No positive roles found for the {selectedTier} tier. Try another tier.
        </div>
      </div>
    );
  }

  return (
    <ul
      className="role-grid"
      role="listbox"
      aria-label="Player Roles"
      tabIndex={0} // Make the container focusable to catch key events
      ref={gridRef}
      onKeyDown={handleKeyDown}
    >
      {roles.map((role, index) => (
        <RoleTile
          key={role.role}
          role={role}
          isSelected={index === activeIndex}
          onSelect={() => onSelect && onSelect(role)}
          id={`role-tile-${index}`} // For aria-activedescendant if needed later
        />
      ))}
    </ul>
  );
};

export default RoleGrid;
