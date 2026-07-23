import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, HandCoins, Receipt, Users, MessageSquare, UserCircle } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/expenses', label: 'Gastos e Ingresos', icon: Receipt },
    { to: '/debts', label: 'Mis Préstamos', icon: HandCoins },
    { to: '/shared', label: 'Invitaciones / Amigos', icon: Users },
    { to: '/whatsapp', label: 'Bot WhatsApp', icon: MessageSquare },
    { to: '/profile', label: 'Mi Perfil', icon: UserCircle },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:block bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 p-4 transition-colors min-h-[calc(100vh-65px)]">
      <nav className="space-y-1.5 sticky top-20">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/15 to-indigo-500/15 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
