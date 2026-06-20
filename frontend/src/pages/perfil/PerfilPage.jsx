import { useState, useEffect } from 'react'
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useTheme } from '../../contexts/ThemeContext'

const INPUT = "w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed"
const LABEL = "block text-xs font-medium mb-1 uppercase text-foreground"

function PasswordInput({ value, onChange, placeholder, required, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={`${INPUT} pr-9`}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

export default function PerfilPage() {
  const { dark } = useTheme()
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [form, setForm] = useState({})
  const [pwd, setPwd] = useState({ password_nueva: '', password_nueva2: '' })
  const [errPwd, setErrPwd] = useState({})
  const [notifConfig, setNotifConfig] = useState({})
  const [savingNotif, setSavingNotif] = useState(false)

  useEffect(() => {
    api.get('/usuarios/perfil/')
      .then(res => {
        setPerfil(res.data)
        setForm(res.data)
        setNotifConfig(res.data.notificacion_config || {})
      })
      .catch(() => toast.error('Error al cargar perfil'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch('/usuarios/perfil/', form)
      toast.success('Perfil actualizado')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const handleCambiarPwd = async (e) => {
    e.preventDefault()
    setErrPwd({})
    setSavingPwd(true)
    try {
      await api.post('/usuarios/cambiar-password/', pwd)
      toast.success('Contraseña actualizada')
      setPwd({ password_nueva: '', password_nueva2: '' })
    } catch (err) {
      setErrPwd(err.response?.data || { general: 'Error al cambiar contraseña.' })
    } finally { setSavingPwd(false) }
  }

  if (loading) return <div className="p-6 text-center text-sm text-gray-500">Cargando...</div>
  if (!perfil) return null

  const s = (k) => (v) => setForm(f => ({ ...f, [k]: typeof v === 'object' ? v.target.value : v }))

  const handleSaveNotifConfig = async () => {
    setSavingNotif(true)
    try {
      await api.patch('/usuarios/perfil/', { notificacion_config: notifConfig })
      toast.success('Configuración de notificaciones guardada')
    } catch { toast.error('Error al guardar') }
    finally { setSavingNotif(false) }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold uppercase flex items-center gap-2">
        <User size={20} className="text-accent" />
        Mi Perfil
      </h1>

      {/* Info de cuenta (readonly) */}
      <div className={`p-4 rounded-lg shadow bg-white dark:bg-dark-surface`}>
        <h2 className="text-sm font-bold uppercase mb-3 text-gray-500">Cuenta</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Usuario</label>
            <input type="text" value={perfil.username} disabled className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input type="email" value={perfil.email} disabled className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Plan</label>
            <input type="text" value={perfil.plan?.toUpperCase() || 'FREE'} disabled className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Email verificado</label>
            <input type="text" value={perfil.email_verificado ? 'Sí' : 'No'} disabled className={INPUT} />
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <form onSubmit={handleSave} className={`p-4 rounded-lg shadow space-y-3 bg-white dark:bg-dark-surface`}>
        <h2 className="text-sm font-bold uppercase mb-3 text-gray-500">Datos personales</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Nombre</label>
            <input type="text" value={form.nombre || ''} onChange={s('nombre')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Apellido</label>
            <input type="text" value={form.apellido || ''} onChange={s('apellido')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Teléfono</label>
            <input type="text" value={form.telefono || ''} onChange={s('telefono')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>CUIL/CUIT</label>
            <input type="text" value={form.cuil_cuit || ''} onChange={s('cuil_cuit')} className={INPUT} />
          </div>
        </div>

        <h2 className="text-sm font-bold uppercase pt-2 text-gray-500">Datos profesionales</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={LABEL}>Colegio de Abogados</label>
            <input type="text" value={form.colegio_abogados || ''} onChange={s('colegio_abogados')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Matrícula — Tomo</label>
            <input type="text" value={form.matricula_tomo || ''} onChange={s('matricula_tomo')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Matrícula — Folio</label>
            <input type="text" value={form.matricula_folio || ''} onChange={s('matricula_folio')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Número de matrícula</label>
            <input type="text" value={form.matricula_numero || ''} onChange={s('matricula_numero')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Condición fiscal</label>
            <select value={form.condicion_fiscal || 'monotributista'} onChange={s('condicion_fiscal')} className={INPUT}>
              <option value="monotributista">Monotributista</option>
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="exento">Exento</option>
              <option value="consumidor_final">Consumidor Final</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Domicilio real</label>
            <input type="text" value={form.domicilio_real || ''} onChange={s('domicilio_real')} className={INPUT} />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Email electrónico (notificaciones judiciales)</label>
            <input type="email" value={form.domicilio_electronico || ''} onChange={s('domicilio_electronico')} className={INPUT} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* Configuración de notificaciones */}
      <div className="p-4 rounded-lg shadow space-y-3 bg-white dark:bg-dark-surface">
        <h2 className="text-sm font-bold uppercase mb-1 text-gray-500">Configuración de Notificaciones</h2>
        <p className="text-xs text-gray-400">
          Activá o desactivá los tipos de notificaciones que querés recibir.
        </p>
        {[
          { key: 'asignacion', label: 'Asignaciones de movimientos' },
          { key: 'cambio_estado', label: 'Cambios de estado' },
          { key: 'carpeta_compartida', label: 'Carpetas compartidas' },
          { key: 'mev_nuevo_movimiento', label: 'MEV — Nuevos movimientos' },
          { key: 'mev_cambio_estado', label: 'MEV — Cambio de estado' },
          { key: 'mev_error', label: 'MEV — Errores de sincronización' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifConfig[key] !== false}
              onChange={(e) => setNotifConfig(prev => ({ ...prev, [key]: e.target.checked }))}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSaveNotifConfig}
            disabled={savingNotif}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            <Save size={14} />
            {savingNotif ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <form onSubmit={handleCambiarPwd} className={`p-4 rounded-lg shadow space-y-3 bg-white dark:bg-dark-surface`}>
        <h2 className="text-sm font-bold uppercase mb-3 text-gray-500 flex items-center gap-2">
          <Lock size={14} /> {perfil.tiene_password ? 'Cambiar contraseña' : 'Agregar contraseña'}
        </h2>
        {!perfil.tiene_password && (
          <p className="text-xs text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
            Tu cuenta usa Google para autenticarse. Podés agregar una contraseña adicional.
          </p>
        )}
        {errPwd.general && <p className="text-red-500 text-xs">{errPwd.general}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Nueva contraseña</label>
            <PasswordInput
              value={pwd.password_nueva}
              onChange={e => setPwd(p => ({ ...p, password_nueva: e.target.value }))}
              required
              autoComplete="new-password"
            />
            {errPwd.password_nueva && <p className="text-red-500 text-xs mt-0.5">{errPwd.password_nueva}</p>}
          </div>
          <div>
            <label className={LABEL}>Confirmar nueva</label>
            <PasswordInput
              value={pwd.password_nueva2}
              onChange={e => setPwd(p => ({ ...p, password_nueva2: e.target.value }))}
              required
              autoComplete="new-password"
            />
            {errPwd.password_nueva2 && <p className="text-red-500 text-xs mt-0.5">{errPwd.password_nueva2}</p>}
          </div>
        </div>
        <p className="text-xs text-gray-400">Mínimo 8 caracteres, una mayúscula y un número.</p>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPwd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium disabled:opacity-50"
          >
            <Lock size={13} />
            {savingPwd ? 'Guardando...' : perfil.tiene_password ? 'Cambiar contraseña' : 'Agregar contraseña'}
          </button>
        </div>
      </form>
    </div>
  )
}
