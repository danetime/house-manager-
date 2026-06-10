export const MAX_FILE_BYTES = 10 * 1024 * 1024 // ~10MB cap
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf']
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.heic,.pdf,image/jpeg,image/png,image/heic,application/pdf'

/**
 * Client-side compression for large images: draw onto a canvas capped at
 * 2000px and re-encode as JPEG. PDFs/HEIC pass through untouched.
 */
export async function prepareUpload(file: File): Promise<File> {
  if (file.size > MAX_FILE_BYTES) throw new Error('File is larger than 10MB')
  const compressible = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!compressible || file.size < 500 * 1024) return file

  try {
    const bitmap = await createImageBitmap(file)
    const maxDim = 2000
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
