import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  ListTodo,
  Building2,
  Tags,
  Calendar,
} from 'lucide-react'

const Sidebar = () => {
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/personas', icon: Users, label: 'Personas' },
    { to: '/carpetas', icon: FolderOpen, label: 'Carpetas' },
    { to: '/movimientos', icon: ListTodo, label: 'Resumen' },
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
      
      <div className="p-3 border-t border-gray-800"> {/* p-4 → p-3 */}
        <div className="flex items-center gap-2"> {/* gap-3 → gap-2 */}
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center"> {/* w-10 h-10 → w-8 h-8 */}
            <span className="text-white font-bold text-sm">A</span> {/* text-sm */}
          </div>
          <div className="text-xs"> {/* text-xs */}
            <p className="font-medium">Admin</p>
            <p className="text-gray-400 truncate max-w-[100px]">admin@estudio.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
