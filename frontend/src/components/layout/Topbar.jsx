import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Moon, Sun, Plus, Menu, HelpCircle, ChevronDown, Lightbulb, BookOpen } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import PanelNotificaciones from '../notificaciones/PanelNotificaciones'
import useClickOutside from '../../hooks/useClickOutside'
import MovimientoForm from '../../pages/movimientos/MovimientoForm'
import { useHelp } from '../../contexts/HelpContext'
import HelpTip from '../HelpTip'
import { HELP } from '../../constants/helpTexts'

const Topbar = ({ onMobileMenuToggle, notif }) => {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { ayudaActiva, toggleAyuda } = useHelp()
  const { notificaciones, feed, count, marcarLeida, marcarLeidaFeed, marcarTodasLeidas } = notif
  const [panelOpen, setPanelOpen] = useState(false)
  const [helpMenuOpen, setHelpMenuOpen] = useState(false)
  const [showMovForm, setShowMovForm] = useState(false)

  const containerRef = useRef(null)
  useClickOutside(containerRef, useCallback(() => setPanelOpen(false), []))

  const helpMenuRef = useRef(null)
  useClickOutside(helpMenuRef, useCallback(() => setHelpMenuOpen(false), []))

  useEffect(() => {
    if (!panelOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPanelOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [panelOpen])

  useEffect(() => {
    if (!helpMenuOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setHelpMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [helpMenuOpen])

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
                feed={feed}
                onMarcarLeida={marcarLeida}
                onMarcarLeidaFeed={marcarLeidaFeed}
                onMarcarTodas={handleMarcarTodas}
                onClose={() => setPanelOpen(false)}
              />
            )}
          </div>

          {/* Ayuda: contextual + manual completo */}
          <div ref={helpMenuRef} className="relative">
            <button
              onClick={() => setHelpMenuOpen(prev => !prev)}
              title="Ayuda"
              aria-label="Ayuda"
              className={`flex items-center gap-0.5 p-2 rounded-lg transition-colors ${ayudaActiva ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <HelpCircle size={20} />
              <ChevronDown size={12} className={`transition-transform ${helpMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {helpMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface shadow-lg overflow-hidden z-30">
                <button
                  type="button"
                  onClick={() => { toggleAyuda(); setHelpMenuOpen(false) }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Lightbulb size={15} className="text-gray-400 flex-shrink-0" />
                    Ayuda contextual
                  </span>
                  <span className={`text-xs font-bold uppercase ${ayudaActiva ? 'text-green-500' : 'text-gray-400'}`}>
                    {ayudaActiva ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setHelpMenuOpen(false); navigate('/ayuda') }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <BookOpen size={15} className="text-gray-400 flex-shrink-0" />
                  Ver manual completo
                </button>
              </div>
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
