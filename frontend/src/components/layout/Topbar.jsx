import { useRef, useState, useCallback } from 'react'
import { Bell, Moon, Sun, Plus, Menu, HelpCircle } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import PanelNotificaciones from '../notificaciones/PanelNotificaciones'
import useClickOutside from '../../hooks/useClickOutside'
import MovimientoForm from '../../pages/movimientos/MovimientoForm'
import { useHelp } from '../../contexts/HelpContext'
import HelpTip from '../HelpTip'
import { HELP } from '../../constants/helpTexts'

const Topbar = ({ onMobileMenuToggle, notif }) => {
  const { theme, toggleTheme } = useTheme()
  const { ayudaActiva, toggleAyuda } = useHelp()
  const { notificaciones, notificacionesSistema, count, marcarLeida, marcarLeidaSistema, marcarTodasLeidas } = notif
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
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-center justify-between md:justify-end gap-3">
        {/* Hamburger — only on mobile */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Menú"
        >
          <Menu size={20} />
        </button>
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
            <HelpTip texto={HELP.campanita}>
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
            </HelpTip>

            {panelOpen && (
              <PanelNotificaciones
                notificaciones={notificaciones}
                notificacionesSistema={notificacionesSistema}
                onMarcarLeida={marcarLeida}
                onMarcarLeidaSistema={marcarLeidaSistema}
                onMarcarTodas={handleMarcarTodas}
                onClose={() => setPanelOpen(false)}
              />
            )}
          </div>

          {/* Toggle ayuda contextual */}
          <button
            onClick={toggleAyuda}
            title={ayudaActiva ? 'Desactivar ayuda contextual' : 'Activar ayuda contextual'}
            className={`p-2 rounded-lg transition-colors ${ayudaActiva ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <HelpCircle size={20} />
          </button>

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
