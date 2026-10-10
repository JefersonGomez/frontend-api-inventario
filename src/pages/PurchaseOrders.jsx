// src/pages/PurchaseOrders.jsx
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import {
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
} from "@/api/purchaseOrders";
import { getSuppliers } from "@/api/suppliers";
import { getProducts } from "@/api/products";
import { usePurchaseRequestAlerts } from "@/hoocks/usePurchaseRequestAlerts";
import { cn } from "@/lib/utils";
import { CommentThread } from "@/components/CommentThread";
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

const emptyLine = () => ({ productId: "", quantity: "", unitCost: "", requestIds: [] });

export function PurchaseOrders() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const actionParam = searchParams.get("action");
  const requestIdParam = searchParams.get("requestId");
  const productIdParam = searchParams.get("productId");

  const [open, setOpen] = useState(() => actionParam === "create");
  const [detailId, setDetailId] = useState(null);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState(() => {
    if (actionParam === "create" && productIdParam) {
      return [{ ...emptyLine(), productId: productIdParam, quantity: 1 }];
    }
    return [emptyLine()];
  });
  // las solicitudes vinculadas salen de las líneas: una sola fuente de verdad
  const selectedRequestIds = lines.flatMap((l) => l.requestIds);

  const { data: alerts } = usePurchaseRequestAlerts();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: getPurchaseOrders,
  });

  // ?comments=1 (aviso de comentario en la campanita) abre el detalle de ?highlight= con su hilo
  const openId = detailId ?? (searchParams.get("comments") === "1" ? highlightId : null);
  const detail = orders.find((o) => o.id === openId) ?? null;
  const closeDetail = () => {
    setDetailId(null);
    if (searchParams.has("comments")) setSearchParams({ highlight: highlightId }, { replace: true });
  };

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const productPriceMap = products.reduce((acc, p) => {
    if (p.id) acc[p.id] = p.price;
    return acc;
  }, {});

  const productSupplierMap = products.reduce((acc, p) => {
    if (p.supplierId) acc[p.id] = p.supplierId;
    return acc;
  }, {});

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-request-alerts"] });
      setOpen(false);
      setSupplierId("");
      setLines([emptyLine()]);
    },
  });

  const receiveMutation = useMutation({
    mutationFn: receivePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateLine = (index, field, value) => {
    // el proveedor del producto rellena el de la orden si todavía está vacío
    if (field === "productId" && productSupplierMap[value]) {
      setSupplierId((cur) => cur || productSupplierMap[value]);
    }
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;

        if (field === "productId") {
          const autoPrice = productPriceMap[value];
          return {
            ...line,
            productId: value,
            unitCost: autoPrice !== undefined ? String(autoPrice) : line.unitCost,
          };
        }

        return { ...line, [field]: value };
      })
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  // quitar una línea vinculada también desvincula sus solicitudes
  const removeLine = (index) =>
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [emptyLine()];
    });

  // marcar una solicitud crea/suma su línea (producto + cantidad); el costo sale del precio del producto
  const toggleRequest = (r, checked) => {
    if (checked && r.product?.supplierId) {
      setSupplierId((cur) => cur || r.product.supplierId);
    }
    setLines((prev) => {
      if (checked) {
        const idx = prev.findIndex((l) => l.productId === r.productId);
        if (idx >= 0) {
          return prev.map((l, i) =>
            i === idx
              ? { ...l, quantity: String((Number(l.quantity) || 0) + r.quantity), requestIds: [...l.requestIds, r.id] }
              : l
          );
        }
        const used = prev.filter((l) => l.productId || l.quantity || l.unitCost);
        return [...used, { ...emptyLine(), productId: r.productId, quantity: String(r.quantity), requestIds: [r.id] }];
      }
      const next = prev.flatMap((l) => {
        if (!l.requestIds.includes(r.id)) return [l];
        const quantity = Math.max(0, (Number(l.quantity) || 0) - r.quantity);
        const requestIds = l.requestIds.filter((id) => id !== r.id);
        // la línea que se queda sin solicitudes ni cantidad desaparece; las demás no se tocan
        return requestIds.length === 0 && quantity === 0 ? [] : [{ ...l, quantity: String(quantity), requestIds }];
      });
      return next.length ? next : [emptyLine()];
    });
  };

  // llegada desde una notificación (?requestId=): marcar esa solicitud una sola vez, cuando `alerts` llegue
  const [urlRequestApplied, setUrlRequestApplied] = useState(false);
  const urlRequest =
    !urlRequestApplied && actionParam === "create" && requestIdParam
      ? alerts?.approvedUnfulfilled?.find((x) => x.id === requestIdParam)
      : undefined;
  if (urlRequest) {
    setUrlRequestApplied(true);
    toggleRequest(urlRequest, true);
  }

  const getEffectiveUnitCost = (line) => {
    if (line.unitCost !== "") return line.unitCost;
    if (line.productId && productPriceMap[line.productId] !== undefined) {
      return String(productPriceMap[line.productId]);
    }
    return "";
  };

  // el backend rechaza el mismo producto en dos líneas: no ofrecerlo dos veces
  const availableProducts = (index) =>
    products.filter((p) => !lines.some((l, i) => i !== index && l.productId === p.id));

  const orderTotal = lines.reduce((sum, l) => {
    const cost = getEffectiveUnitCost(l);
    return sum + (Number(l.quantity) || 0) * (Number(cost) || 0);
  }, 0);

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({
      supplierId,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitCost: Number(getEffectiveUnitCost(l)),
      })),
      fulfilledRequestIds: selectedRequestIds.length ? selectedRequestIds : undefined,
    });
  };

  if (isLoading) return <div>{t("common.loading")}</div>;

  const isNoticeActive = Boolean(actionParam);

  return (
    <div className="p-6 space-y-4">
      {isNoticeActive && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Tienes una orden de compra pendiente de procesar. Se han precargado los datos correspondientes.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{t("purchaseOrders.title")}</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                className={cn(
                  "transition-all duration-300",
                  isNoticeActive && "ring-4 ring-primary/40 scale-105 shadow-lg"
                )}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("purchaseOrders.newOrder")}
              </Button>
            }
          />

          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("purchaseOrders.newOrder")}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">
              <Select
                value={supplierId}
                onValueChange={setSupplierId}
                items={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              >
                <SelectTrigger className="w-full">
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
              {suppliers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("purchaseOrders.noSuppliers")}{" "}
                  <Link to="/suppliers" className="underline">{t("purchaseOrders.createSupplier")}</Link>
                </p>
              )}

              {alerts?.approvedUnfulfilled?.length > 0 && (
                <div className="space-y-2 border rounded-md p-3 bg-muted/40">
                  <p className="text-sm font-medium">
                    {t("purchaseOrders.linkRequests")}
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {alerts.approvedUnfulfilled.map((r) => {
                      const checked = selectedRequestIds.includes(r.id);
                      // una orden = un proveedor: las solicitudes de otro proveedor esperan a su propia orden
                      const otherSupplier =
                        !checked && !!supplierId && !!r.product.supplierId && r.product.supplierId !== supplierId;
                      return (
                      <label
                        key={r.id}
                        className={cn(
                          "flex items-center gap-2 text-sm p-1 rounded",
                          otherSupplier ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/60"
                        )}
                      >
                        <input
                          type="checkbox"
                          disabled={otherSupplier}
                          checked={checked}
                          onChange={(e) => toggleRequest(r, e.target.checked)}
                        />
                        <span>
                          {r.product.name} — {r.quantity} unidades ({r.requestedBy?.name ?? "Usuario"})
                          {otherSupplier && ` · ${t("purchaseOrders.otherSupplier")}`}
                        </span>
                      </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {lines.map((line, index) => {
                  const effectiveUnitCost = getEffectiveUnitCost(line);

                  return (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        value={line.productId}
                        onValueChange={(v) => updateLine(index, "productId", v)}
                        disabled={line.requestIds.length > 0}
                        items={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                      >
                        <SelectTrigger className="flex-1 min-w-0">
                          <SelectValue placeholder={t("purchaseOrders.product")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts(index).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        className="w-24 shrink-0"
                        placeholder={t("purchaseOrders.quantity")}
                        value={line.quantity}
                        onChange={(e) => updateLine(index, "quantity", e.target.value)}
                        required
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-28 shrink-0"
                        placeholder={t("purchaseOrders.unitCost")}
                        value={effectiveUnitCost}
                        onChange={(e) => updateLine(index, "unitCost", e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
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
            <tr
              key={o.id}
              onClick={() => setDetailId(o.id)}
              className={cn("cursor-pointer hover:bg-muted/50 border-b", o.id === highlightId && "bg-primary/10")}
            >
              <td className="py-2">{o.supplier.name}</td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              <td>
                <Badge variant={statusVariant[o.status]}>
                  {t(`purchaseOrders.status${o.status.charAt(0)}${o.status.slice(1).toLowerCase()}`)}
                </Badge>
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                {o.status === "PENDING" && (
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          size="sm"
                          disabled={receiveMutation.isPending}
                        >
                          {t("purchaseOrders.receive")}
                        </Button>
                      }
                    />
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

      <Dialog open={!!detail} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("purchaseOrders.detailTitle")}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt className="text-muted-foreground">{t("purchaseOrders.supplier")}</dt>
                <dd>{detail.supplier.name}</dd>
                <dt className="text-muted-foreground">{t("purchaseOrders.status")}</dt>
                <dd>
                  <Badge variant={statusVariant[detail.status]}>
                    {t(`purchaseOrders.status${detail.status.charAt(0)}${detail.status.slice(1).toLowerCase()}`)}
                  </Badge>
                </dd>
                <dt className="text-muted-foreground">{t("purchaseOrders.createdBy")}</dt>
                <dd>{detail.createdBy?.name ?? "—"}</dd>
                <dt className="text-muted-foreground">{t("purchaseOrders.date")}</dt>
                <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
                {detail.receivedAt && (
                  <>
                    <dt className="text-muted-foreground">{t("purchaseOrders.receivedAt")}</dt>
                    <dd>{new Date(detail.receivedAt).toLocaleString()}</dd>
                  </>
                )}
              </dl>
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-1">{t("purchaseOrders.product")}</th>
                    <th>{t("purchaseOrders.quantity")}</th>
                    <th>{t("purchaseOrders.unitCost")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((i) => (
                    <tr key={i.id} className="border-b">
                      <td className="py-1">{i.product.name}</td>
                      <td>{i.quantity}</td>
                      <td>{Number(i.unitCost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-right font-medium">
                {t("purchaseOrders.total")}:{" "}
                {detail.items.reduce((sum, i) => sum + i.quantity * Number(i.unitCost), 0).toFixed(2)}
              </p>
              <CommentThread kind="order" id={detail.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}