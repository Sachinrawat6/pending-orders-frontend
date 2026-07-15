import { NavLink, useLocation } from 'react-router-dom';
import {
  FiPackage,
  FiCamera,
  FiScissors,
  FiList,
  FiLogOut,
  FiUser,
  FiXCircle,
  FiMenu,
  FiX,
  FiTruck,
  FiGrid,
  FiEye,
  FiEdit,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

// Grouped navigation structure
const NAV_GROUPS = [
  {
    id: 'actions',
    label: 'Actions',
    icon: FiEdit,
    links: [
      { to: '/', label: 'Scan Order', icon: FiCamera, end: true },
      { to: '/pending-to-cutting', label: 'Move to Cutting / Cancel', icon: FiScissors },
      { to: '/ship-order', label: 'Ship Order', icon: FiTruck },
    ],
  },
  {
    id: 'view',
    label: 'View Records',
    icon: FiEye,
    links: [
      { to: '/pending', label: 'Pending Orders', icon: FiPackage },
      { to: '/ready-for-cutting', label: 'Ready for Cutting', icon: FiScissors },
      { to: '/cancel-requests', label: 'Cancel Requests', icon: FiXCircle },
      { to: '/shipped', label: 'Shipped', icon: FiTruck },
      { to: '/all-orders', label: 'All Orders', icon: FiList },
    ],
  },
];

// Mobile links (only these 3 will show on mobile)
const MOBILE_LINKS = [
  { to: '/', label: 'Scan Order', icon: FiCamera, end: true },
  { to: '/pending-to-cutting', label: 'Move to Cutting / Cancel', icon: FiScissors },
  { to: '/ship-order', label: 'Ship Order', icon: FiTruck },
];

const Sidebar = () => {
  const { employee, logout } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) setIsMobileOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  // Determine which links to show based on device
  const getVisibleLinks = () => {
    if (isDesktop) {
      return NAV_GROUPS;
    } else {
      // For mobile, return a single group with only the 3 links
      return [
        {
          id: 'mobile-actions',
          label: 'Actions',
          icon: FiEdit,
          links: MOBILE_LINKS,
        },
      ];
    }
  };

  const visibleGroups = getVisibleLinks();

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed right-4 top-2 z-50 rounded-lg bg-white p-2 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 md:hidden"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-slate-200/70 bg-white/95 shadow-xl backdrop-blur-xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200/60 ring-1 ring-white/20">
            <FiPackage className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <h1 className="font-display text-base font-semibold tracking-tight text-slate-900">
              Pending Orders
            </h1>
            <p className="text-xs font-medium text-slate-400">Qurvii Order Fulfilment</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleGroups.map((group) => (
            <div key={group.id} className="mb-6 last:mb-0">
              {/* Group Header */}
              <div className="mb-2 flex items-center gap-2 px-3">
                <group.icon className="h-3.5 w-3.5 text-slate-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </h2>
                <div className="flex-1 border-t border-slate-200/60" />
              </div>

              {/* Group Links */}
              <div className="space-y-1">
                {group.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <link.icon
                      aria-hidden="true"
                      className={`h-5 w-5 shrink-0 ${
                        location.pathname === link.to ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <span>{link.label}</span>
                    {location.pathname === link.to && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200/70 px-3 py-4">
          <div className="space-y-2">
            {employee && (
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200/60">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
                  <FiUser className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{employee.name}</p>
                  <p className="text-xs text-slate-500">#{employee.id}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <FiLogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content spacer - pushes content to the right on desktop */}
      <div className="md:ml-72" />
    </>
  );
};

export default Sidebar;
