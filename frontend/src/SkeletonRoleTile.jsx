// frontend/src/SkeletonRoleTile.jsx
import React from 'react';
import './RoleGrid.css';

const SkeletonRoleTile = () => (
  <div className="skeleton-role-tile" aria-hidden="true">
    <div className="skeleton-role-tile__line skeleton-role-tile__line--md"></div>
    <div className="skeleton-role-tile__line skeleton-role-tile__line--sm"></div>
    <div className="skeleton-role-tile__line skeleton-role-tile__line--sm" style={{ width: '80%' }}></div>
    <div className="skeleton-role-tile__footer">
      <div className="skeleton-role-tile__line skeleton-role-tile__line--pill"></div>
    </div>
  </div>
);

export default SkeletonRoleTile;
