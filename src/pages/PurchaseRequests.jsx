import { useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
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
  const highlightId = useSearchParams()[0].get("highlight");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
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
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setOpen(false);
      setForm({ productId: "", quantity: "", reason: "" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, rejectionReason }) => updatePurchaseRequestStatus(id, status, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      closeReject();
    },
  });

  const closeReject = () => {
    setRejecting(null);
    setRejectionReason("");
  };

  const handleReject = (e) => {
    e.preventDefault();
    statusMutation.mutate({ id: rejecting.id, status: "REJECTED", rejectionReason: rejectionReason.trim() });
  };

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
            <tr
              key={r.id}
              onClick={() => setDetail(r)}
              className={`cursor-pointer hover:bg-muted/50 border-b ${r.id === highlightId ? "bg-primary/10" : ""}`}
            >
              <td className="py-2">{r.product.name}</td>
              <td>{r.quantity}</td>
              <td>{r.reason || "—"}</td>
              {user.role === "ADMIN" && <td>{r.requestedBy.name}</td>}
              <td>
                <Badge variant={statusVariant[r.status]}>
                  {t(`purchaseRequests.status${r.status.charAt(0) + r.status.slice(1).toLowerCase()}`)}
                </Badge>
                {r.status === "REJECTED" && r.rejectionReason && (
                  <p className="mt-1 max-w-[16rem] truncate text-xs text-muted-foreground" title={r.rejectionReason}>
                    {r.rejectionReason}
                  </p>
                )}
              </td>
              {user.role === "ADMIN" && r.status === "PENDING" && (
                <td className="space-x-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    onClick={() => statusMutation.mutate({ id: r.id, status: "APPROVED" })}
                  >
                    {t("purchaseRequests.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setRejecting(r)}
                  >
                    {t("purchaseRequests.reject")}
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && closeReject()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("purchaseRequests.rejectTitle")}</DialogTitle>
          </DialogHeader>
          {rejecting && (
            <form onSubmit={handleReject} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("purchaseRequests.rejectIntro", {
                  name: rejecting.requestedBy.name,
                  quantity: rejecting.quantity,
                  product: rejecting.product.name,
                })}
              </p>
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">{t("purchaseRequests.rejectionReason")}</Label>
                <Input
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t("purchaseRequests.rejectionReasonPlaceholder")}
                  maxLength={300}
                  autoFocus
                  required
                />
              </div>
              {statusMutation.isError && (
                <p role="alert" className="text-sm text-destructive">{t("purchaseRequests.rejectError")}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeReject}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={statusMutation.isPending || !rejectionReason.trim()}
                >
                  {t("purchaseRequests.reject")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("purchaseRequests.detailTitle")}</DialogTitle>
          </DialogHeader>
          {detail && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("purchaseRequests.product")}</dt>
              <dd>{detail.product.name} ({detail.product.sku})</dd>
              <dt className="text-muted-foreground">{t("purchaseRequests.quantity")}</dt>
              <dd>{detail.quantity}</dd>
              <dt className="text-muted-foreground">{t("purchaseRequests.reason")}</dt>
              <dd>{detail.reason || "—"}</dd>
              <dt className="text-muted-foreground">{t("purchaseRequests.status")}</dt>
              <dd>
                <Badge variant={statusVariant[detail.status]}>
                  {t(`purchaseRequests.status${detail.status.charAt(0) + detail.status.slice(1).toLowerCase()}`)}
                </Badge>
              </dd>
              {detail.status === "REJECTED" && detail.rejectionReason && (
                <>
                  <dt className="text-muted-foreground">{t("purchaseRequests.rejectionReason")}</dt>
                  <dd className="break-words">{detail.rejectionReason}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{t("purchaseRequests.requestedBy")}</dt>
              <dd>{detail.requestedBy.name} ({detail.requestedBy.email})</dd>
              <dt className="text-muted-foreground">{t("purchaseRequests.date")}</dt>
              <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
              {detail.expiresAt && (
                <>
                  <dt className="text-muted-foreground">{t("purchaseRequests.expiresAt")}</dt>
                  <dd>{new Date(detail.expiresAt).toLocaleDateString()}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{t("purchaseRequests.linkedOrder")}</dt>
              <dd>{detail.purchaseOrderId ? t("purchaseRequests.hasOrder") : "—"}</dd>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
