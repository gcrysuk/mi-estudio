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
import { Settings, RefreshCw, Calendar, Folder, Tag, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { getKanbanBoard, cambiarEstadoMovimiento } from '../../services/kanbanService'
import { useTheme } from '../../contexts/ThemeContext'

function formatFecha(fechaStr) {
  if (!fechaStr) return null
  const d = new Date(fechaStr)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function vencimientoClase(fechaStr, dark) {
  if (!fechaStr) return ''
  const now = new Date()
  const fecha = new Date(fechaStr)
  const diff = (fecha - now) / (1000 * 60 * 60 * 24)
  if (diff < 0) return dark ? 'text-red-400' : 'text-red-600'
  if (diff < 2) return dark ? 'text-orange-400' : 'text-orange-600'
  if (diff < 5) return dark ? 'text-yellow-400' : 'text-yellow-600'
  return dark ? 'text-green-400' : 'text-green-600'
}

function KanbanCard({ movimiento, isDragging }) {
  const { dark } = useTheme()
  const bg = isDragging
    ? dark ? 'bg-gray-600 shadow-xl' : 'bg-blue-50 shadow-xl'
    : dark ? 'bg-gray-700 hover:bg-gray-650' : 'bg-white hover:bg-gray-50'

  return (
    <div
      className={`rounded-lg p-3 mb-2 border ${
        dark ? 'border-gray-600' : 'border-gray-200'
      } ${bg} transition-colors cursor-grab active:cursor-grabbing select-none`}
    >
      <p className={`text-sm font-medium mb-1.5 leading-snug ${dark ? 'text-gray-100' : 'text-gray-800'}`}>
        {movimiento.titulo}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-1">
        {movimiento.carpeta_nombre && (
          <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            <Folder size={10} />
            {movimiento.carpeta_nombre}
          </span>
        )}
        {movimiento.tipo_nombre && (
          <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            <Tag size={10} />
            {movimiento.tipo_nombre}
          </span>
        )}
        {movimiento.fecha_vencimiento && (
          <span className={`flex items-center gap-1 text-xs font-medium ${vencimientoClase(movimiento.fecha_vencimiento, dark)}`}>
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
              : `${dark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-500'}`
          }`}>
            <UserCheck size={9} />
            {movimiento.es_responsable ? 'Asignado a mí' : movimiento.responsable_username}
          </span>
        )}
      </div>
    </div>
  )
}

function DraggableCard({ movimiento }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(movimiento.id),
    data: { movimiento },
  })

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <KanbanCard movimiento={movimiento} isDragging={false} />
    </div>
  )
}

function KanbanColumn({ columna }) {
  const { dark } = useTheme()
  const { setNodeRef, isOver } = useDroppable({ id: String(columna.estado.id) })
  const { estado, movimientos, total } = columna
  const esFinal = estado.es_final
  const titulo = esFinal ? `${estado.nombre} (${total})` : estado.nombre

  return (
    <div
      className={`flex-shrink-0 w-72 flex flex-col rounded-xl border transition-colors ${
        isOver
          ? dark ? 'border-blue-500 bg-gray-750' : 'border-blue-400 bg-blue-50'
          : dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-current border-opacity-10">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: estado.color }}
          />
          <span className={`font-semibold text-sm ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
            {titulo}
          </span>
        </div>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
          {movimientos.length}
        </span>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 p-2 overflow-y-auto min-h-[120px] max-h-[calc(100vh-220px)]">
        <SortableContext
          items={movimientos.map((m) => String(m.id))}
          strategy={verticalListSortingStrategy}
        >
          {movimientos.map((m) => (
            <DraggableCard key={m.id} movimiento={m} />
          ))}
        </SortableContext>
        {movimientos.length === 0 && (
          <div className={`flex items-center justify-center h-16 text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            Sin movimientos
          </div>
        )}
        {esFinal && total > movimientos.length && (
          <p className={`text-center text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            +{total - movimientos.length} más
          </p>
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
          const nuevos = col.estado.es_final
            ? [movActualizado, ...col.movimientos].slice(0, 10)
            : [movActualizado, ...col.movimientos]
          return { ...col, movimientos: nuevos, total: col.total + 1 }
        }
        return col
      })
    })

    try {
      await cambiarEstadoMovimiento(active.id, destinoEstadoId)
    } catch {
      toast.error('Error al mover el movimiento')
      cargarBoard()
    }
  }

  return (
    <div className={`flex flex-col h-full ${dark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Topbar */}
      <div className={`flex items-center justify-between px-6 py-3 border-b ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <h1 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>
          Tablero Kanban
        </h1>
        <div className="flex gap-2">
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
            <div className="flex gap-4 h-full items-start">
              {columnas.map((col) => (
                <KanbanColumn key={col.estado.id} columna={col} />
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
                <div className="w-72">
                  <KanbanCard movimiento={activeMovimiento} isDragging />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}
