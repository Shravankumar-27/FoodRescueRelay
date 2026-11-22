import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "./ToastContext";

export default function ApiErrorToasts() {
  const client = useQueryClient();
  const { error: toastError } = useToast();

  useEffect(() => {
    let lastQueryError = "";
    let lastQueryErrorAt = 0;
    const queries = client.getQueryCache().subscribe(event => {
      if (event.type !== "updated" || event.action.type !== "error" || event.query.meta?.silent) return;
      const message = event.action.error.message;
      const now = Date.now();
      if (message === lastQueryError && now - lastQueryErrorAt < 15000) return;
      lastQueryError = message;
      lastQueryErrorAt = now;
      toastError(message);
    });
    const mutations = client.getMutationCache().subscribe(event => {
      if (event.type === "updated" && event.action.type === "error" && !event.mutation.meta?.silent) {
        toastError(event.action.error.message);
      }
    });
    return () => { queries(); mutations(); };
  }, [client, toastError]);

  return null;
}
