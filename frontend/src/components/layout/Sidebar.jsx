import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  ClipboardList,
  Building2,
  Tags,
  Calendar,
  Trash2,
  LogOut,
  PanelLeftOpen,
  PanelLeftClose,
  Kanban,
  LayoutList,
  ShieldCheck,
  UserCircle,
  BarChart3,
  Mail,
} from 'lucide-react'
import useAuthStore from '../../stores/authStore'

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/kanban',      icon: Kanban,          label: 'Kanban'       },
  { to: '/resumen',     icon: LayoutList,      label: 'Resumen'      },
  { to: '/personas',    icon: Users,           label: 'Personas'     },
  { to: '/movimientos', icon: ClipboardList,   label: 'Movimientos'  },
  { to: '/carpetas',    icon: FolderOpen,      label: 'Carpetas'     },
  { to: '/organismos',  icon: Building2,       label: 'Organismos'   },
  { to: '/tipos',       icon: Tags,            label: 'Tipos'        },
  { to: '/calendario',  icon: Calendar,        label: 'Calendario'   },
  { to: '/informes',    icon: BarChart3,       label: 'Informes'     },
  { to: '/notificaciones-mev', icon: Mail,      label: 'Notif. MEV'  },
  { to: '/papelera',    icon: Trash2,          label: 'Papelera'     },
]

const Sidebar = ({ mobileOpen = false, onClose, mevPendientesCount = 0 }) => {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(
    () => localStorage.getItem('sidebar_pinned') === 'true'
  )

  const isExpanded = mobileOpen || pinned || hovered

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const togglePin = () => {
    const next = !pinned
    setPinned(next)
    localStorage.setItem('sidebar_pinned', String(next))
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`bg-gray-900 text-white flex flex-col overflow-hidden transition-all duration-200
        fixed inset-y-0 left-0 z-40 h-full
        md:relative md:z-auto md:flex-shrink-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isExpanded ? 'w-60' : 'w-16'}`}
    >
      {/* Header / Logo */}
      <div className="flex items-center justify-between px-3 border-b border-gray-800 h-[57px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-accent font-bold text-xl flex-shrink-0 leading-none">⚖️</span>
          {isExpanded && (
            <span className="font-bold text-accent text-sm whitespace-nowrap tracking-wide">
              MI ESTUDIO
            </span>
          )}
        </div>
        {isExpanded && (
          <>
            <button
              onClick={togglePin}
              title={pinned ? 'Desanclar sidebar' : 'Anclar sidebar'}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0 ml-1 hidden md:block"
            >
              {pinned ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
            {/* Close button on mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0 ml-1 md:hidden"
              >
                <PanelLeftClose size={15} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-hidden">
        {navItems.map(({ to, icon: Icon, label }) => {
          const badgeCount = to === '/notificaciones-mev' ? mevPendientesCount : 0
          return (
            <NavLink
              key={to}
              to={to}
              title={!isExpanded ? label : undefined}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2.5 mx-2 rounded-lg transition-colors text-sm ${
                  isExpanded ? 'px-3' : 'px-0 justify-center'
                } ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <span className="relative flex-shrink-0">
                <Icon size={18} />
                {badgeCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </span>
              {isExpanded && (
                <span className={`whitespace-nowrap ${badgeCount > 0 ? 'font-bold' : ''}`}>{label}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-3 space-y-1">
        {/* Perfil */}
        <NavLink
          to="/perfil"
          title={!isExpanded ? 'Mi perfil' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 py-1.5 mx-0 rounded-lg transition-colors text-xs ${
              isExpanded ? 'px-2' : 'px-0 justify-center'
            } ${isActive ? 'bg-accent text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
          }
        >
          <UserCircle size={16} className="flex-shrink-0" />
          {isExpanded && <span className="whitespace-nowrap">Mi perfil</span>}
        </NavLink>

        {/* Administración — solo superadmin */}
        {user?.is_superuser && (
          <NavLink
            to="/admin/usuarios"
            title={!isExpanded ? 'Administración' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 py-1.5 mx-0 rounded-lg transition-colors text-xs ${
                isExpanded ? 'px-2' : 'px-0 justify-center'
              } ${isActive ? 'bg-accent text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
            }
          >
            <ShieldCheck size={16} className="flex-shrink-0" />
            {isExpanded && <span className="whitespace-nowrap">Administración</span>}
          </NavLink>
        )}

        {/* Avatar + logout */}
        {isExpanded ? (
          <div className="flex items-center gap-2 pt-1">
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">
                {user?.username?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="text-xs flex-1 min-w-0">
              <p className="font-medium truncate">{user?.username ?? 'Admin'}</p>
              <p className="text-gray-400 truncate">{user?.email ?? ''}</p>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0">
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 pt-1">
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center" title={user?.username ?? 'Admin'}>
              <span className="text-white font-bold text-xs">{user?.username?.[0]?.toUpperCase() ?? 'A'}</span>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
