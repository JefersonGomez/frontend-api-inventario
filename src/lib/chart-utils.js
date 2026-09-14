import { format } from "date-fns";

/**
 * Agrupa movimientos por día separando IN y OUT
 */
export function aggregateMovementsByDay(movements) {
  if (!movements) return [];

  const grouped = movements.reduce((acc, mov) => {
    // Verificamos que createdAt exista para evitar errores
    if (!mov.createdAt) return acc;
    
    const dateKey = format(new Date(mov.createdAt), "dd MMM");
    
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, in: 0, out: 0 };
    }
    
    if (mov.type === "IN") {
      acc[dateKey].in += mov.quantity;
    } else if (mov.type === "OUT") {
      acc[dateKey].out += mov.quantity;
    }
    
    return acc;
  }, {});

  return Object.values(grouped);
}

/**
 * Agrupa stock total por categoría
 */
export function aggregateStockByCategory(products) {
  if (!products) return [];

  const grouped = products.reduce((acc, prod) => {
    const catName = prod.category?.name || "Sin Categoría";
    acc[catName] = (acc[catName] || 0) + (prod.stock || 0);
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, value]) => ({ name, value }));
}