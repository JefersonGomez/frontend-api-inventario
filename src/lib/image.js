// Achica una foto en el navegador antes de subirla (Fase 5): una foto de celular pesa varios MB y
// en el POS se ve en una tarjeta chica. Lado mayor hasta `max` px, en WEBP (o JPEG si no hay WEBP).
// Si algo falla (formato raro), se sube el original: el backend igual valida tipo y tamaño.
export async function shrinkImage(file, max = 800) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob =
      (await new Promise((r) => canvas.toBlob(r, "image/webp", 0.82))) ??
      (await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85)))
    if (!blob || blob.size >= file.size) return file
    const ext = blob.type === "image/webp" ? "webp" : "jpg"
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${ext}`, { type: blob.type })
  } catch {
    return file
  }
}
