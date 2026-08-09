import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable sidebar component with grouped navigation items.
 * Groups are collapsible (dropdown style) to reduce long scrolling;
 * the group containing the active route auto-expands.
 */
export function SidebarNavGroups({ groups, isActive, onItemClick }) {
  const location = useLocation();

  const computeOpen = () => {
    const open = {};
    groups.forEach((g, i) => {
      if (g.items.some(it => isActive(it.path))) open[i] = true;
    });
    return open;
  };

  const [openGroups, setOpenGroups] = useState(computeOpen);

  // Keep the active group expanded whenever the route changes
  useEffect(() => {
    setOpenGroups(prev => {
      const next = { ...prev };
      groups.forEach((g, i) => {
        if (g.items.some(it => isActive(it.path))) next[i] = true;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggle = (i) => setOpenGroups(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <nav className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch py-4 px-3 space-y-2">
      {groups.map((group, idx) => {
        const isOpen = !!openGroups[idx];
        return (
          <div key={idx}>
            {group.label && (
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase text-sidebar-foreground/50 hover:text-sidebar-foreground/70 transition-colors"
              >
                <span className="truncate">{group.label}</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            {isOpen && (
              <div className="space-y-1 mt-1">
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
            )}
          </div>
        );
      })}
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