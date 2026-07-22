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
  FiEye,
  FiEdit,
  FiBarChart2,
  FiRepeat,
  FiSend,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useOrdersOverview } from '../context/OrdersOverviewContext';
import { useState, useEffect } from 'react';
import { FaQrcode } from 'react-icons/fa';

const QR_CODE_LINK = 'https://sachinrawat6.github.io/QrCode';

// Grouped navigation structure with colors
const NAV_GROUPS = [
  {
    id: 'store',
    label: 'Store Menu',
    icon: FiEdit,
    bgColor: 'bg-blue-50/80 border-blue-200/50',
    headerColor: 'text-blue-700',
    linkActiveColor: 'bg-blue-100 text-blue-700 ring-blue-200',
    linkHoverColor: 'hover:bg-blue-50/70',
    defaultOpen: true, // Store menu default open
    links: [
      { to: '/', label: 'Scan Order', icon: FiCamera, end: true },
      { to: '/store-scan', label: 'Store Scan', icon: FiSend },
      { to: '/pending', label: 'Pending Orders', icon: FiPackage, countKey: 'pending' },
      {
        to: '/ready-for-cutting',
        label: 'Ready for Cutting',
        icon: FiScissors,
        countKey: 'readyForCutting',
      },
      { to: QR_CODE_LINK, label: 'Generate QrCode', icon: FaQrcode },
    ],
  },
  {
    id: 'operation',
    label: 'Operations Menu',
    icon: FiEdit,
    bgColor: 'bg-emerald-50/80 border-emerald-200/50',
    headerColor: 'text-emerald-700',
    linkActiveColor: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    linkHoverColor: 'hover:bg-emerald-50/70',
    defaultOpen: false,
    links: [
      { to: '/ship-order', label: 'Ship Order', icon: FiTruck },
      {
        to: '/ready-for-process',
        label: 'Ready for Process',
        icon: FiRepeat,
        countKey: 'readyForProcess',
      },
    ],
  },
  {
    id: 'customer_service',
    label: 'Customer Service',
    icon: FiEdit,
    bgColor: 'bg-orange-50/80 border-orange-200/50',
    headerColor: 'text-orange-700',
    linkActiveColor: 'bg-orange-100 text-orange-700 ring-orange-200',
    linkHoverColor: 'hover:bg-orange-50/70',
    defaultOpen: false,
    links: [{ to: '/pending', label: 'Pending Orders', icon: FiPackage, countKey: 'pending' }],
  },
  {
    id: 'view',
    label: 'View Records',
    icon: FiEye,
    bgColor: 'bg-purple-50/80 border-purple-200/50',
    headerColor: 'text-purple-700',
    linkActiveColor: 'bg-purple-100 text-purple-700 ring-purple-200',
    linkHoverColor: 'hover:bg-purple-50/70',
    defaultOpen: false,
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: FiBarChart2 },
      {
        to: '/cancel-requests',
        label: 'Cancel Requests',
        icon: FiXCircle,
        countKey: 'cancelRequested',
      },
      { to: '/shipped', label: 'Shipped', icon: FiTruck, countKey: 'shipped' },
      { to: '/all-orders', label: 'All Orders', icon: FiList, countKey: 'orders' },
    ],
  },
];

// Mobile links (only these 3 will show on mobile)
const MOBILE_LINKS = [
  { to: '/', label: 'Scan Order', icon: FiCamera, end: true },
  { to: '/pending-to-cutting', label: 'Move to Cutting / Cancel', icon: FiScissors },
  { to: '/ship-order', label: 'Ship Order', icon: FiTruck },
];

const Sidebar = ({ collapsed, onToggleCollapsed }) => {
  const { employee, logout } = useAuth();
  const { pending, readyForCutting, readyForProcess, cancelRequested, shipped, orders } =
    useOrdersOverview();
  const counts = {
    pending: pending.length,
    readyForCutting: readyForCutting.length,
    readyForProcess: readyForProcess.length,
    cancelRequested: cancelRequested.length,
    shipped: shipped.length,
    orders: orders.length,
  };
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // State for open/closed groups
  const [openGroups, setOpenGroups] = useState(() => {
    // Initialize with defaultOpen values
    const initial = {};
    NAV_GROUPS.forEach((group) => {
      initial[group.id] = group.defaultOpen || false;
    });
    return initial;
  });

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

  // Toggle group open/close
  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Determine which links to show based on device
  const getVisibleLinks = () => {
    if (isDesktop) {
      return NAV_GROUPS;
    } else {
      return [
        {
          id: 'mobile-actions',
          label: 'Actions',
          icon: FiEdit,
          bgColor: 'bg-slate-50/80 border-slate-200/50',
          headerColor: 'text-slate-700',
          linkActiveColor: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
          linkHoverColor: 'hover:bg-slate-100',
          defaultOpen: true,
          links: MOBILE_LINKS,
        },
      ];
    }
  };

  const visibleGroups = getVisibleLinks();
  const hideOnCollapse = collapsed ? 'md:hidden' : '';

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
        style={isDesktop ? { width: collapsed ? '5rem' : '18rem' } : undefined}
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-slate-200/70 bg-white/95 shadow-xl backdrop-blur-xl transition-[transform,width] duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Desktop collapse/expand toggle */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-8 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition hover:bg-slate-50 hover:text-indigo-600 md:flex"
        >
          {collapsed ? (
            <FiChevronRight className="h-3.5 w-3.5" />
          ) : (
            <FiChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Header */}
        <div
          className={`flex items-center gap-3 border-b border-slate-200/70 px-5 py-5 ${
            collapsed ? 'md:justify-center md:px-0' : ''
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200/60 ring-1 ring-white/20">
            <FiPackage className="h-5 w-5" />
          </div>
          <div className={`flex flex-col leading-tight ${hideOnCollapse}`}>
            <h1 className="font-display text-base font-semibold tracking-tight text-slate-900">
              Pending Orders
            </h1>
            <p className="text-xs font-medium text-slate-400">Qurvii Order Fulfilment</p>
          </div>
        </div>

        {/* Navigation - Hide scrollbar but keep scroll functionality */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
          {visibleGroups.map((group, index) => {
            const isOpen = openGroups[group.id] !== undefined ? openGroups[group.id] : false;

            return (
              <div
                key={group.id}
                className={` last:mb-0 ${
                  index < visibleGroups.length - 1 ? 'pb-3 border-b border-slate-200/50' : ''
                }`}
              >
                {/* Group Container with Background Color */}
                <div
                  className={`rounded-xl p-3 transition-all duration-200 ${
                    group.bgColor || 'bg-slate-50/50'
                  } border ${collapsed ? 'md:p-2' : ''}`}
                >
                  {/* Group Header - Clickable to toggle */}
                  <div
                    className={`flex items-center gap-2 px-2 cursor-pointer select-none ${
                      collapsed ? 'md:justify-center md:px-0' : ''
                    }`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <group.icon
                      className={`h-3.5 w-3.5 ${group.headerColor || 'text-slate-500'}`}
                    />
                    <h2
                      className={`text-xs font-semibold uppercase tracking-wider flex-1 ${
                        group.headerColor || 'text-slate-500'
                      } ${hideOnCollapse}`}
                    >
                      {group.label}
                    </h2>

                    {/* Toggle Icon - Only show when not collapsed */}
                    {!collapsed && (
                      <span className={`${group.headerColor || 'text-slate-500'}`}>
                        {isOpen ? (
                          <FiChevronUp className="h-4 w-4" />
                        ) : (
                          <FiChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    )}

                    {/* Show count badge on header when collapsed */}
                    {collapsed && (
                      <span className="ml-auto text-xs font-semibold text-slate-500 md:block hidden">
                        {group.links.length}
                      </span>
                    )}
                  </div>

                  {/* Divider line */}
                  {!collapsed && isOpen && (
                    <div
                      className={`my-2 border-t ${group.headerColor?.replace('text', 'border') || 'border-slate-200'} opacity-30`}
                    />
                  )}

                  {/* Group Links - Toggle visibility */}
                  {!collapsed && isOpen && (
                    <div className="space-y-1 mt-1">
                      {group.links.map((link) => (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          target={link.to === QR_CODE_LINK ? '_blank' : ''}
                          end={link.end}
                          title={collapsed ? link.label : undefined}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                              collapsed ? 'md:justify-center md:px-0' : ''
                            } ${
                              isActive
                                ? group.linkActiveColor ||
                                  'bg-indigo-100 text-indigo-700 ring-indigo-200'
                                : `text-slate-600 ${group.linkHoverColor || 'hover:bg-slate-50'} hover:text-slate-900`
                            } ${isActive ? 'ring-1' : ''}`
                          }
                        >
                          <link.icon
                            aria-hidden="true"
                            className={`h-5 w-5 shrink-0 ${
                              location.pathname === link.to ? 'text-current' : 'text-slate-400'
                            }`}
                          />
                          <span className={hideOnCollapse}>{link.label}</span>
                          {link.countKey ? (
                            <span
                              className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${hideOnCollapse} ${
                                location.pathname === link.to
                                  ? 'bg-white/70 text-current'
                                  : 'bg-white/80 text-slate-500'
                              }`}
                            >
                              {counts[link.countKey] ?? 0}
                            </span>
                          ) : (
                            location.pathname === link.to && (
                              <span
                                className={`ml-auto h-1.5 w-1.5 rounded-full bg-current ${hideOnCollapse}`}
                              />
                            )
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200/70 px-3 py-4">
          <div className="space-y-2">
            {employee && (
              <div
                className={`flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200/60 ${
                  collapsed ? 'md:justify-center md:px-2' : ''
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
                  <FiUser className="h-4 w-4" />
                </span>
                <div className={`min-w-0 flex-1 ${hideOnCollapse}`}>
                  <p className="truncate text-sm font-medium text-slate-700">{employee.name}</p>
                  <p className="text-xs text-slate-500">#{employee.id}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              title={collapsed ? 'Logout' : undefined}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
            >
              <FiLogOut className="h-4 w-4" />
              <span className={hideOnCollapse}>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
