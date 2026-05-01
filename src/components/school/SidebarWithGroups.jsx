import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Reusable sidebar component with grouped navigation items
 */
export function SidebarNavGroups({ groups, isActive, onItemClick }) {
  return (
    <nav className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch py-4 px-3 space-y-4">
      {groups.map((group, idx) => (
        <div key={idx}>
          {group.label && (
            <h3 className="px-3 py-2 text-xs font-semibold uppercase text-sidebar-foreground/50 truncate">
              {group.label}
            </h3>
          )}
          <div className="space-y-1">
            {group.items.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
                  isActive(item.path)
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-xs bg-red-500 text-white rounded-full px-2 py-0.5 flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/**
 * Get mobile bottom navigation items (top 5 most important + more)
 */
export function getMobileNavItems(groups) {
  const allItems = [];
  groups.forEach(g => allItems.push(...g.items));
  return allItems.slice(0, 5);
}