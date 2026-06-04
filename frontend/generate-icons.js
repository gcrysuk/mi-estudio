/**
 * Genera icon-192.png y icon-512.png en public/.
 * Usa el módulo 'canvas' de npm (npm install canvas).
 * Ejecutar: node generate-icons.js
 */
const fs = require('fs')
const path = require('path')

try {
  const { createCanvas } = require('canvas')

  function generateIcon(size, outputPath) {
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')
    const radius = size * 0.18

    // Fondo redondeado
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    ctx.moveTo(radius, 0)
    ctx.lineTo(size - radius, 0)
    ctx.quadraticCurveTo(size, 0, size, radius)
    ctx.lineTo(size, size - radius)
    ctx.quadraticCurveTo(size, size, size - radius, size)
    ctx.lineTo(radius, size)
    ctx.quadraticCurveTo(0, size, 0, size - radius)
    ctx.lineTo(0, radius)
    ctx.quadraticCurveTo(0, 0, radius, 0)
    ctx.closePath()
    ctx.fill()

    // Texto ME
    ctx.fillStyle = '#06b6d4'
    ctx.font = `bold ${Math.round(size * 0.38)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('ME', size / 2, size / 2)

    fs.writeFileSync(outputPath, canvas.toBuffer('image/png'))
    console.log(`Generated ${outputPath} (${size}x${size})`)
  }

  const publicDir = path.join(__dirname, 'public')
  generateIcon(192, path.join(publicDir, 'icon-192.png'))
  generateIcon(512, path.join(publicDir, 'icon-512.png'))

} catch (e) {
  console.warn('canvas not available, skipping icon generation:', e.message)
  console.warn('Run: npm install canvas && node generate-icons.js')
}
