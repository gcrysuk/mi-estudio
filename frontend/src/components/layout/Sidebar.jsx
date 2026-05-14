import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  ClipboardList,
  Building2,
  Tags,
  Calendar,
  LogOut,
} from 'lucide-react'
import useAuthStore from '../../stores/authStore'

const Sidebar = () => {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/personas', icon: Users, label: 'Personas' },
    { to: '/movimientos', icon: ClipboardList, label: 'Movimientos' },
    { to: '/carpetas', icon: FolderOpen, label: 'Carpetas' },
    { to: '/organismos', icon: Building2, label: 'Organismos' },
    { to: '/tipos', icon: Tags, label: 'Tipos' },
    { to: '/calendario', icon: Calendar, label: 'Calendario' },
  ]

  return (
    <div className="w-52 bg-gray-900 text-white flex flex-col h-full"> {/* w-64 → w-52 */}
      <div className="p-4 border-b border-gray-800"> {/* p-5 → p-4 */}
        <h1 className="text-xl font-bold text-accent">⚖️ ME</h1> {/* Texto más corto */}
      </div>
      
      <nav className="flex-1 p-3 space-y-1"> {/* p-4 → p-3 */}
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${ /* px-4 py-3 → px-3 py-2, text-sm */
                isActive 
                  ? 'bg-accent text-white' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`
            }
          >
            <item.icon size={18} /> {/* 20 → 18 */}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-3 border-t border-gray-800">
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
      </div>
    </div>
  )
}

export default Sidebar
