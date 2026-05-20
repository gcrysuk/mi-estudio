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
} from 'lucide-react'
import useAuthStore from '../../stores/authStore'

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/personas',    icon: Users,           label: 'Personas'     },
  { to: '/movimientos', icon: ClipboardList,   label: 'Movimientos'  },
  { to: '/carpetas',    icon: FolderOpen,      label: 'Carpetas'     },
  { to: '/organismos',  icon: Building2,       label: 'Organismos'   },
  { to: '/tipos',       icon: Tags,            label: 'Tipos'        },
  { to: '/calendario',  icon: Calendar,        label: 'Calendario'   },
  { to: '/papelera',    icon: Trash2,          label: 'Papelera'     },
]

const Sidebar = () => {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(
    () => localStorage.getItem('sidebar_pinned') === 'true'
  )

  const isExpanded = pinned || hovered

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
      className={`flex-shrink-0 bg-gray-900 text-white flex flex-col h-full overflow-hidden transition-all duration-200 ${
        isExpanded ? 'w-60' : 'w-16'
      }`}
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
          <button
            onClick={togglePin}
            title={pinned ? 'Desanclar sidebar' : 'Anclar sidebar'}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0 ml-1"
          >
            {pinned ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={!isExpanded ? label : undefined}
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
            <Icon size={18} className="flex-shrink-0" />
            {isExpanded && (
              <span className="whitespace-nowrap">{label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-3">
        {isExpanded ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {user?.username?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="text-xs flex-1 min-w-0">
              <p className="font-medium truncate">{user?.username ?? 'Admin'}</p>
              <p className="text-gray-400 truncate">{user?.email ?? ''}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full bg-accent flex items-center justify-center"
              title={user?.username ?? 'Admin'}
            >
              <span className="text-white font-bold text-sm">
                {user?.username?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
