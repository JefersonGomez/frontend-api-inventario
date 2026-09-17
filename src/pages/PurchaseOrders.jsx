// src/pages/PurchaseOrders.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
} from "@/api/purchaseOrders";
import { getSuppliers } from "@/api/suppliers";
import { getProducts } from "@/api/products";
import { usePurchaseRequestAlerts } from "@/hoocks/usePurchaseRequestAlerts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const statusVariant = {
  PENDING: "secondary",
  RECEIVED: "default",
  CANCELLED: "destructive",
};

const emptyLine = () => ({ productId: "", quantity: "", unitCost: "" });

export function PurchaseOrders() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);

  const { data: alerts } = usePurchaseRequestAlerts();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: getPurchaseOrders,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-request-alerts"] });
      setOpen(false);
      setSupplierId("");
      setLines([emptyLine()]);
      setSelectedRequestIds([]);
    },
  });

  const receiveMutation = useMutation({
    mutationFn: receivePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // --- helpers para las líneas repetibles ---
  const updateLine = (index, field, value) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (index) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const orderTotal = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
    0
  );

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({
      supplierId,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
      })),
      fulfilledRequestIds: selectedRequestIds.length ? selectedRequestIds : undefined,
    });
  };

  if (isLoading) return <div>{t("common.loading")}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{t("purchaseOrders.title")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            {t("purchaseOrders.newOrder")}
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("purchaseOrders.newOrder")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("purchaseOrders.supplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Lista de solicitudes aprobadas para vincular */}
              {alerts?.approvedUnfulfilled?.length > 0 && (
                <div className="space-y-2 border rounded-md p-3 bg-muted/40">
                  <p className="text-sm font-medium">
                    {t("purchaseOrders.linkRequests", "Vincular solicitudes aprobadas (opcional)")}
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {alerts.approvedUnfulfilled.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/60 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedRequestIds.includes(r.id)}
                          onChange={(e) =>
                            setSelectedRequestIds((prev) =>
                              e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id)
                            )
                          }
                        />
                        <span>
                          {r.product.name} — {r.quantity} unidades ({r.requestedBy?.name ?? "Usuario"})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {lines.map((line, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={line.productId}
                      onValueChange={(v) => updateLine(index, "productId", v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t("purchaseOrders.product")} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
                      placeholder={t("purchaseOrders.quantity")}
                      value={line.quantity}
                      onChange={(e) => updateLine(index, "quantity", e.target.value)}
                      required
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28"
                      placeholder={t("purchaseOrders.unitCost")}
                      value={line.unitCost}
                      onChange={(e) => updateLine(index, "unitCost", e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t("purchaseOrders.addLine")}
                </Button>
              </div>

              <div className="text-right font-medium">
                {t("purchaseOrders.total")}: ${orderTotal.toFixed(2)}
              </div>

              <Button type="submit" disabled={createMutation.isPending}>
                {t("common.save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">{t("purchaseOrders.supplier")}</th>
            <th>{t("purchaseOrders.date")}</th>
            <th>{t("purchaseOrders.status")}</th>
            <th>{t("purchaseOrders.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b">
              <td className="py-2">{o.supplier.name}</td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              <td>
                <Badge variant={statusVariant[o.status]}>
                  {t(`purchaseOrders.status${o.status.charAt(0)}${o.status.slice(1).toLowerCase()}`)}
                </Badge>
              </td>
              <td>
                {o.status === "PENDING" && (
                  <AlertDialog>
                    <AlertDialogTrigger
                      disabled={receiveMutation.isPending}
                      className="inline-flex shrink-0 items-center justify-center rounded-md text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {t("purchaseOrders.receive")}
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("purchaseOrders.confirmReceiveTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("purchaseOrders.confirmReceiveDescription")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("purchaseOrders.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => receiveMutation.mutate(o.id)}
                        >
                          {t("purchaseOrders.confirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}