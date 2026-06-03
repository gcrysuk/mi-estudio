import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { getKanbanConfig, saveKanbanConfig, getEstadosActivos } from '../../services/kanbanService'
import { useTheme } from '../../contexts/ThemeContext'

function SortableEstado({ estado, visible, onToggle }) {
  const { dark } = useTheme()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(estado.id) })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border mb-2 ${
        dark
          ? 'bg-gray-800 border-gray-700 text-gray-200'
          : 'bg-white border-gray-200 text-gray-700'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className={`cursor-grab active:cursor-grabbing ${dark ? 'text-gray-500' : 'text-gray-400'}`}
      >
        <GripVertical size={16} />
      </button>

      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: estado.color }}
      />

      <span className="flex-1 text-sm font-medium">{estado.nombre}</span>

      {estado.es_final && (
        <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
          final
        </span>
      )}

      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={visible}
          onChange={() => onToggle(estado.id)}
          className="w-4 h-4 accent-blue-500 cursor-pointer"
        />
        <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          {visible ? 'Visible' : 'Oculto'}
        </span>
      </label>
    </div>
  )
}

export default function KanbanConfigPage() {
  const { dark } = useTheme()
  const navigate = useNavigate()

  const handleVolver = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/kanban')
  }
  const [allEstados, setAllEstados] = useState([])
  const [visiblesIds, setVisiblesIds] = useState(new Set())
  const [orden, setOrden] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    async function cargar() {
      try {
        const [configRes, estadosRes] = await Promise.all([
          getKanbanConfig(),
          getEstadosActivos(),
        ])
        const { estados_visibles, orden_columnas } = configRes.data
        const todosEstados = estadosRes.data || []

        const visiblesSet = new Set((estados_visibles || []).map((e) => e.id))
        const ordenIds = orden_columnas?.length
          ? orden_columnas.map(String)
          : todosEstados.map((e) => String(e.id))

        // Agregar al final estados que existen pero no están en el orden guardado
        const ordenFinal = [...ordenIds]
        todosEstados.forEach((e) => {
          if (!ordenFinal.includes(String(e.id))) ordenFinal.push(String(e.id))
        })

        setAllEstados(todosEstados)
        setVisiblesIds(visiblesSet)
        setOrden(ordenFinal)
      } catch {
        toast.error('Error al cargar la configuración')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  // Reconstruct ordered list for display (all estados in order, even non-visible ones)
  const estadosOrdenados = [
    ...orden.map((id) => allEstados.find((e) => String(e.id) === id)).filter(Boolean),
    ...allEstados.filter((e) => !orden.includes(String(e.id))),
  ]

  function handleToggle(estadoId) {
    setVisiblesIds((prev) => {
      const next = new Set(prev)
      if (next.has(estadoId)) next.delete(estadoId)
      else next.add(estadoId)
      return next
    })
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setOrden((prev) => {
      const oldIdx = prev.indexOf(active.id)
      const newIdx = prev.indexOf(over.id)
      if (oldIdx === -1 || newIdx === -1) return prev
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  async function handleGuardar() {
    setSaving(true)
    try {
      const estadosVisiblesIds = allEstados
        .filter((e) => visiblesIds.has(e.id))
        .map((e) => e.id)

      await saveKanbanConfig({
        estados_visibles_ids: estadosVisiblesIds,
        orden_columnas: orden.map(Number),
      })
      toast.success('Configuración guardada')
      handleVolver()
    } catch {
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`min-h-full ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`px-6 py-4 border-b flex items-center gap-3 ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <button
          onClick={handleVolver}
          className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>
          Configurar Tablero Kanban
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <p className={`text-sm mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          Activá o desactivá columnas y arrastrá para reordenarlas.
        </p>

        {loading ? (
          <div className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Cargando...</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={orden}
              strategy={verticalListSortingStrategy}
            >
              {estadosOrdenados.map((estado) => (
                <SortableEstado
                  key={estado.id}
                  estado={estado}
                  visible={visiblesIds.has(estado.id)}
                  onToggle={handleToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        <button
          onClick={handleGuardar}
          disabled={saving || loading}
          className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
