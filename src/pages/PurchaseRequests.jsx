import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import {
  getPurchaseRequests,
  createPurchaseRequest,
  updatePurchaseRequestStatus,
} from "../api/PurchaseRequests";
import { getProducts } from "../api/products";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const statusVariant = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

export function PurchaseRequests() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "", reason: "" });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["purchase-requests"],
    queryFn: getPurchaseRequests,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const createMutation = useMutation({
    mutationFn: createPurchaseRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      setOpen(false);
      setForm({ productId: "", quantity: "", reason: "" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updatePurchaseRequestStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({
      productId: form.productId,
      quantity: Number(form.quantity),
      reason: form.reason || undefined,
    });
  };

  if (isLoading) return <div>{t("common.loading")}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{t("purchaseRequests.title")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          {/* ✅ CORRECCIÓN: Usar la prop render en lugar de asChild */}
          <DialogTrigger render={<Button>{t("purchaseRequests.newRequest")}</Button>} />
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("purchaseRequests.newRequest")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Select
                value={form.productId}
                onValueChange={(v) => setForm({ ...form, productId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("purchaseRequests.product")} />
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
                placeholder={t("purchaseRequests.quantity")}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
              <Input
                placeholder={t("purchaseRequests.reason")}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
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
            <th className="py-2">{t("purchaseRequests.product")}</th>
            <th>{t("purchaseRequests.quantity")}</th>
            <th>{t("purchaseRequests.reason")}</th>
            {user.role === "ADMIN" && <th>{t("purchaseRequests.requestedBy")}</th>}
            <th>{t("purchaseRequests.status")}</th>
            {user.role === "ADMIN" && <th>{t("purchaseRequests.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2">{r.product.name}</td>
              <td>{r.quantity}</td>
              <td>{r.reason || "—"}</td>
              {user.role === "ADMIN" && <td>{r.requestedBy.name}</td>}
              <td>
                <Badge variant={statusVariant[r.status]}>
                  {t(`purchaseRequests.status${r.status.charAt(0) + r.status.slice(1).toLowerCase()}`)}
                </Badge>
              </td>
              {user.role === "ADMIN" && r.status === "PENDING" && (
                <td className="space-x-2">
                  <Button
                    size="sm"
                    onClick={() => statusMutation.mutate({ id: r.id, status: "APPROVED" })}
                  >
                    {t("purchaseRequests.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => statusMutation.mutate({ id: r.id, status: "REJECTED" })}
                  >
                    {t("purchaseRequests.reject")}
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}