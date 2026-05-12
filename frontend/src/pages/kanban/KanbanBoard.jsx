const KanbanBoard = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Tablero Kanban</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-4">Pendiente</h2>
          {/* Aquí irán las tareas */}
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-4">En curso</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-4">Completado</h2>
        </div>
      </div>
    </div>
  )
}

export default KanbanBoard
