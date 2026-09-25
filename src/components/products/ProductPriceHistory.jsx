// src/components/products/ProductPriceHistory.jsx
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { getProductPriceHistory } from "@/api/products"

export function ProductPriceHistory({ productId }) {
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ["product-price-history", productId],
    queryFn: () => getProductPriceHistory(productId),
    enabled: !!productId, // no dispara la query si no hay id (ej. mientras el Dialog está creando, no editando)
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("products.priceHistory.loading")}</p>
  }

  if (!data || data.history.length <= 1) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        {t("products.priceHistory.noHistory")}
      </div>
    )
  }

  const chartData = data.history.map((h) => ({
    date: new Date(h.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
    price: h.price,
  }))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{t("products.priceHistory.title")}</h4>
        <span className="text-sm text-muted-foreground">
          {t("products.priceHistory.currentPrice")}: ${data.currentPrice.toFixed(2)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#221F3B" />
          <XAxis dataKey="date" stroke="#8B7CF6" fontSize={11} />
          <YAxis stroke="#8B7CF6" fontSize={11} width={50} />
          <Tooltip
            contentStyle={{ background: "#151325", border: "1px solid #221F3B", borderRadius: 8 }}
            formatter={(value) => [`$${value}`, t("products.priceHistory.currentPrice")]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#8B7CF6"
            strokeWidth={2}
            dot={{ fill: "#8B7CF6", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}