const Dashboard = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm">Vencen hoy</h3>
          <p className="text-3xl font-bold mt-2">3</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm">Vencen esta semana</h3>
          <p className="text-3xl font-bold mt-2">7</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm">Carpetas activas</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm">Movimientos pendientes</h3>
          <p className="text-3xl font-bold mt-2">5</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
