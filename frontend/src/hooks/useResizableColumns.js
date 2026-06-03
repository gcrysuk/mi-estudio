import { useState, useCallback, useRef, useEffect } from 'react'

export function useResizableColumns(initialWidths, storageKey) {
  const [widths, setWidths] = useState(() => {
    if (!storageKey) return initialWidths
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
      return { ...initialWidths, ...saved }
    } catch {
      return initialWidths
    }
  })

  // Ref to always have the latest widths inside the stable onMouseDown callback
  const widthsRef = useRef(widths)
  widthsRef.current = widths

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(widths))
    }
  }, [widths, storageKey])

  const onMouseDown = useCallback((e, colKey) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = widthsRef.current[colKey] ?? 150

    const onMouseMove = (moveE) => {
      const newWidth = Math.max(60, startWidth + (moveE.clientX - startX))
      setWidths(prev => ({ ...prev, [colKey]: newWidth }))
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return { widths, onMouseDown }
}
