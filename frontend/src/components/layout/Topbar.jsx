import { useRef, useState, useCallback } from 'react'
import { Bell, Moon, Sun, Plus } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useNotificaciones } from '../../hooks/useNotificaciones'
import PanelNotificaciones from '../notificaciones/PanelNotificaciones'
import useClickOutside from '../../hooks/useClickOutside'
import MovimientoForm from '../../pages/movimientos/MovimientoForm'

const Topbar = () => {
  const { theme, toggleTheme } = useTheme()
  const { notificaciones, count, marcarLeida, marcarTodasLeidas } = useNotificaciones()
  const [panelOpen, setPanelOpen] = useState(false)
  const [showMovForm, setShowMovForm] = useState(false)

  const containerRef = useRef(null)
  useClickOutside(containerRef, useCallback(() => setPanelOpen(false), []))

  const handleMarcarTodas = async () => {
    await marcarTodasLeidas()
    setPanelOpen(false)
  }

  return (
    <>
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-4">

          {/* Nuevo Movimiento */}
          <button
            onClick={() => setShowMovForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase"
          >
            <Plus size={14} />
            Nuevo Movimiento
          </button>

          {/* Campana con badge y panel */}
          <div ref={containerRef} className="relative">
            <button
              onClick={() => setPanelOpen(prev => !prev)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Notificaciones"
            >
              <Bell size={20} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>

            {panelOpen && (
              <PanelNotificaciones
                notificaciones={notificaciones}
                onMarcarLeida={marcarLeida}
                onMarcarTodas={handleMarcarTodas}
                onClose={() => setPanelOpen(false)}
              />
            )}
          </div>

          {/* Tema */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

        </div>
      </div>
    </header>

    {showMovForm && (
      <MovimientoForm
        onClose={() => setShowMovForm(false)}
        onSave={() => {
          setShowMovForm(false)
          window.dispatchEvent(new CustomEvent('movimiento-guardado'))
        }}
      />
    )}
  </>
  )
}

export default Topbar
