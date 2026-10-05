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