import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { Settings, RefreshCw, Calendar, Folder, Tag, UserCheck, Plus, Edit2, Search, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getKanbanBoard, cambiarEstadoMovimiento } from '../../services/kanbanService'
import MovimientoForm from '../movimientos/MovimientoForm'
import { useTheme } from '../../contexts/ThemeContext'

function formatFecha(fechaStr) {
  if (!fechaStr) return null
  const d = new Date(fechaStr)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function vencimientoClase(fechaStr) {
  if (!fechaStr) return ''
  const now = new Date()
  const fecha = new Date(fechaStr)
  const diff = (fecha - now) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'text-red-600 dark:text-red-400'
  if (diff < 2) return 'text-orange-600 dark:text-orange-400'
  if (diff < 5) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

function KanbanCard({ movimiento, isDragging, onEdit }) {
  return (
    <div
      className={`group relative rounded-lg p-3 mb-2 border border-gray-200 dark:border-gray-600 transition-colors cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? 'bg-blue-50 dark:bg-gray-600 shadow-xl'
          : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
      }`}
    >
      {!isDragging && onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(movimiento) }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-500"
          title="Editar movimiento"
        >
          <Edit2 size={13} />
        </button>
      )}
      <p className="text-sm font-medium mb-1.5 leading-snug pr-5 text-gray-800 dark:text-gray-100" title={movimiento.titulo}>
        {movimiento.titulo}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-1">
        {movimiento.carpeta_nombre && (
          <span title={movimiento.carpeta_nombre} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
            <Folder size={10} />
            {movimiento.carpeta_nombre}
          </span>
        )}
        {movimiento.tipo_nombre && (
          <span title={movimiento.tipo_nombre} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
            <Tag size={10} />
            {movimiento.tipo_nombre}
          </span>
        )}
        {movimiento.fecha_vencimiento && (
          <span className={`flex items-center gap-1 text-xs font-medium ${vencimientoClase(movimiento.fecha_vencimiento)}`}>
            <Calendar size={10} />
            {formatFecha(movimiento.fecha_vencimiento)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        {movimiento.estado_color ? (
          <span
            className="inline-block px-2 py-0.5 rounded-full text-white text-xs font-medium"
            style={{ backgroundColor: movimiento.estado_color }}
          >
            {movimiento.estado_nombre}
          </span>
        ) : <span />}
        {movimiento.responsable_username && (
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
            movimiento.es_responsable
              ? 'bg-accent/15 text-accent'
              : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
          }`}>
            <UserCheck size={9} />
            {movimiento.es_responsable ? 'Asignado a mí' : movimiento.responsable_username}
          </span>
        )}
      </div>
    </div>
  )
}

function DraggableCard({ movimiento, onEdit }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(movimiento.id),
    data: { movimiento },
  })

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <KanbanCard movimiento={movimiento} isDragging={false} onEdit={onEdit} />
    </div>
  )
}

function KanbanColumn({ columna, onNuevoMovimiento, onEditMovimiento, busqueda }) {
  const { dark } = useTheme()
  const { setNodeRef, isOver } = useDroppable({ id: String(columna.estado.id) })
  const { estado, movimientos } = columna

  const q = busqueda?.toLowerCase() || ''
  const visibles = q
    ? movimientos.filter(m =>
        m.titulo?.toLowerCase().includes(q) ||
        m.carpeta_nombre?.toLowerCase().includes(q) ||
        m.responsable_username?.toLowerCase().includes(q)
      )
    : movimientos

  return (
    <div
      className={`flex-shrink-0 w-56 flex flex-col rounded-xl border transition-colors ${
        isOver
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-gray-700'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-current border-opacity-10">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: estado.color }}
          />
          <span className="font-semibold text-sm truncate text-gray-700 dark:text-gray-200">
            {estado.nombre}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {visibles.length}
          </span>
          <button
            onClick={() => onNuevoMovimiento(estado.id)}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
            title={`Nuevo movimiento en ${estado.nombre}`}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 min-h-[120px] overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 220px)' }}
      >
        <SortableContext
          items={movimientos.map((m) => String(m.id))}
          strategy={verticalListSortingStrategy}
        >
          {visibles.map((m) => (
            <DraggableCard key={m.id} movimiento={m} onEdit={onEditMovimiento} />
          ))}
        </SortableContext>
        {visibles.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-gray-400 dark:text-gray-500">
            {q ? 'Sin resultados' : 'Sin movimientos'}
          </div>
        )}
      </div>

    </div>
  )
}

export default function KanbanPage() {
  const { dark } = useTheme()
  const navigate = useNavigate()
  const [columnas, setColumnas] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeMovimiento, setActiveMovimiento] = useState(null)
  const [nuevoMovEstado, setNuevoMovEstado] = useState(null)
  const [editingMovimiento, setEditingMovimiento] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const ZOOM_STEP = 0.1
  const ZOOM_MIN = 0.5
  const ZOOM_MAX = 1.5
  const [zoom, setZoom] = useState(() => parseFloat(localStorage.getItem('kanban-zoom') || '1'))
  useEffect(() => { localStorage.setItem('kanban-zoom', zoom.toString()) }, [zoom])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const cargarBoard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getKanbanBoard()
      setColumnas(res.data.columnas)
    } catch {
      toast.error('Error al cargar el tablero')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarBoard() }, [cargarBoard])

  function findColumnaDeMovimiento(movId) {
    return columnas.find((col) => col.movimientos.some((m) => String(m.id) === movId))
  }

  function handleDragStart({ active }) {
    const col = findColumnaDeMovimiento(active.id)
    if (!col) return
    const mov = col.movimientos.find((m) => String(m.id) === active.id)
    setActiveMovimiento(mov)
  }

  async function handleDragEnd({ active, over }) {
    setActiveMovimiento(null)
    if (!over) return

    const origenCol = findColumnaDeMovimiento(active.id)
    const destinoEstadoId = over.id

    if (!origenCol || String(origenCol.estado.id) === destinoEstadoId) return

    // Optimistic update
    setColumnas((prev) => {
      const movimiento = origenCol.movimientos.find((m) => String(m.id) === active.id)
      const destinoCol = prev.find((c) => String(c.estado.id) === destinoEstadoId)
      if (!movimiento || !destinoCol) return prev

      const nuevoEstado = destinoCol.estado
      const movActualizado = {
        ...movimiento,
        estado: nuevoEstado.id,
        estado_nombre: nuevoEstado.nombre,
        estado_color: nuevoEstado.color,
      }

      return prev.map((col) => {
        if (col.estado.id === origenCol.estado.id) {
          return {
            ...col,
            movimientos: col.movimientos.filter((m) => String(m.id) !== active.id),
            total: col.total - 1,
          }
        }
        if (String(col.estado.id) === destinoEstadoId) {
          const nuevos = [movActualizado, ...col.movimientos]
          return { ...col, movimientos: nuevos, total: col.total + 1 }
        }
        return col
      })
    })

    try {
      await cambiarEstadoMovimiento(active.id, destinoEstadoId)
    } catch (error) {
      if (!error._403handled) {
        toast.error('Error al mover el movimiento')
      }
      cargarBoard() // siempre revertir el optimistic update
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-wrap border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className={`text-lg font-bold flex-shrink-0 ${dark ? 'text-white' : 'text-gray-800'}`}>
          Tablero Kanban
        </h1>

        {/* Buscador */}
        <div className={`relative flex items-center w-56 flex-shrink-0`}>
          <Search size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar movimientos..."
            className={`w-full pl-7 pr-7 py-1.5 rounded-lg text-xs border-none focus:outline-none focus:ring-1 focus:ring-accent ${
              dark ? 'bg-gray-700 text-gray-200 placeholder-gray-500' : 'bg-gray-100 text-gray-700 placeholder-gray-400'
            }`}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex gap-2 ml-auto items-center">
          {/* Zoom */}
          <div className={`flex items-center gap-0.5 border rounded-lg px-1.5 py-1 ${dark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
            <button onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(1)))} className="p-0.5 hover:text-accent transition-colors" title="Reducir">
              <ZoomOut size={14} />
            </button>
            <span className="text-xs w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(1)))} className="p-0.5 hover:text-accent transition-colors" title="Ampliar">
              <ZoomIn size={14} />
            </button>
            <button onClick={() => setZoom(1)} className="p-0.5 hover:text-accent transition-colors" title="Restablecer (100%)">
              <RotateCcw size={13} />
            </button>
          </div>

          <button
            onClick={cargarBoard}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
          <button
            onClick={() => navigate('/kanban/config')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-accent text-white hover:opacity-90 transition-opacity"
          >
            <Settings size={14} />
            Configurar
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Cargando tablero...</div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div
              className="flex gap-4 h-full items-start"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: `${100 / zoom}%`,
                transition: 'transform 0.15s ease',
              }}
            >
              {columnas.map((col) => (
                <KanbanColumn key={col.estado.id} columna={col} onNuevoMovimiento={setNuevoMovEstado} onEditMovimiento={setEditingMovimiento} busqueda={busqueda} />
              ))}
              {columnas.length === 0 && (
                <div className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No hay columnas configuradas.{' '}
                  <button onClick={() => navigate('/kanban/config')} className="text-accent underline">
                    Configurar tablero
                  </button>
                </div>
              )}
            </div>

            <DragOverlay>
              {activeMovimiento && (
                <div className="w-56">
                  <KanbanCard movimiento={activeMovimiento} isDragging />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {nuevoMovEstado !== null && (
        <MovimientoForm
          estadoInicial={nuevoMovEstado}
          onClose={() => setNuevoMovEstado(null)}
          onSave={() => { setNuevoMovEstado(null); cargarBoard() }}
        />
      )}

      {editingMovimiento && (
        <MovimientoForm
          movimiento={editingMovimiento}
          carpetaId={editingMovimiento.carpeta}
          carpetaNombre={editingMovimiento.carpeta_nombre}
          onClose={() => setEditingMovimiento(null)}
          onSave={() => { setEditingMovimiento(null); cargarBoard() }}
        />
      )}
    </div>
  )
}
