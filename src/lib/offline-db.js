// IndexedDB mínimo (Bloque 8B): un almacén clave → valor (catálogo, turno, empresa) y la cola de
// ventas hechas sin conexión. IndexedDB aguanta miles de productos; localStorage no.
let db = null
const open = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open("stockly", 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore("kv")
      req.result.createObjectStore("sales", { keyPath: "clientSaleId" })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

async function run(store, mode, fn) {
  db ??= open()
  const tx = (await db).transaction(store, mode)
  const req = fn(tx.objectStore(store))
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
  })
}

export const kvGet = (key) => run("kv", "readonly", (s) => s.get(key))
export const kvSet = (key, value) => run("kv", "readwrite", (s) => s.put(value, key))
export const salesAll = () => run("sales", "readonly", (s) => s.getAll())
export const salesPut = (sale) => run("sales", "readwrite", (s) => s.put(sale))
export const salesDelete = (id) => run("sales", "readwrite", (s) => s.delete(id))
