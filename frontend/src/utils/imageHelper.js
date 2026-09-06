/**
 * Helper to compress and resize image files to clean, lightweight Base64 Data URIs
 * Ensures fast network transfer, optimal database storage, and prevents payload size errors.
 */
export function compressImage(file, { maxWidth = 800, maxHeight = 800, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof Blob)) {
      resolve(null)
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.onload = () => {
        let { width, height } = img

        // Maintain aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Export as optimized JPEG/PNG Data URI
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const compressedDataUri = canvas.toDataURL(mimeType, quality)
        resolve(compressedDataUri)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
