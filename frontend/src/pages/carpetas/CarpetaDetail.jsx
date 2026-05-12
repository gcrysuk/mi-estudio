import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../services/api'

const CarpetaDetail = () => {
  const { id } = useParams()
  const [carpeta, setCarpeta] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [carpetaRes, movimientosRes] = await Promise.all([
          api.get(`/carpetas/${id}/`),
          api.get(`/movimientos/?carpeta=${id}`)
        ])
        setCarpeta(carpetaRes.data)
        setMovimientos(movimientosRes.data)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return <div>Cargando...</div>
  if (!carpeta) return <div>No encontrada</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{carpeta.caratula}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-500 mb-2">N° Expediente</h3>
          <p className="text-xl font-semibold">{carpeta.numero_expediente}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-500 mb-2">Estado</h3>
          <p className="text-xl font-semibold">{carpeta.estado}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-500 mb-2">Cliente</h3>
          <p className="text-xl font-semibold">{carpeta.persona_nombre || 'Sin asignar'}</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Movimientos</h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left">Fecha</th>
              <th className="px-6 py-3 text-left">Tipo</th>
              <th className="px-6 py-3 text-left">Título</th>
              <th className="px-6 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map(mov => (
              <tr key={mov.id}>
                <td className="px-6 py-4">{new Date(mov.fecha).toLocaleDateString()}</td>
                <td className="px-6 py-4">{mov.tipo_nombre}</td>
                <td className="px-6 py-4">{mov.titulo}</td>
                <td className="px-6 py-4">{mov.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CarpetaDetail
