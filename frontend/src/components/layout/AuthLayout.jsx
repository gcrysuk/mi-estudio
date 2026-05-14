import { Outlet } from 'react-router-dom'

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-[400px]">
        <Outlet />
      </div>
    </div>
  )
}

export default AuthLayout
