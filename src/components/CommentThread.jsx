import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getComments, addComment } from "@/api/PurchaseRequests";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Hilo de comentarios de una solicitud o una orden (kind = "request" | "order").
// Los comentarios nuevos de otros llegan por el socket (topic "comments").
export function CommentThread({ kind, id }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const { data: comments = [], isLoading, isError } = useQuery({
    queryKey: ["comments", kind, id],
    queryFn: () => getComments(kind, id),
  });

  const mutation = useMutation({
    mutationFn: (text) => addComment(kind, id, text),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["comments", kind, id] });
    },
  });

  const submit = (e) => {
    e.preventDefault();
    if (body.trim()) mutation.mutate(body.trim());
  };

  return (
    <section className="space-y-3 border-t pt-3 text-sm">
      <h3 className="font-medium">{t("comments.title")}</h3>

      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : isError ? (
        <p role="alert" className="text-destructive">{t("comments.loadError")}</p>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground">{t("comments.empty")}</p>
      ) : (
        <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {c.author.id === user.id ? t("comments.you") : c.author.name}
                </span>
                {" · "}
                {new Date(c.createdAt).toLocaleString()}
              </p>
              <p className="whitespace-pre-wrap break-words">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <textarea
          aria-label={t("comments.placeholder")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Enter envía, Shift+Enter hace salto de línea
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          placeholder={t("comments.placeholder")}
          maxLength={1000}
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {mutation.isError && (
          <p role="alert" className="text-destructive">{t("comments.error")}</p>
        )}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={mutation.isPending || !body.trim()}>
            {t("comments.send")}
          </Button>
        </div>
      </form>
    </section>
  );
}
