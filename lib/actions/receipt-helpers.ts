import { toast } from "sonner";
import { uploadReceipt, type ReceiptKind } from "../repos/receipts";

/**
 * Sube la constancia opcional. Si falla, el registro principal ya está guardado:
 * se avisa sin deshacer la operación.
 */
export async function attachReceipt(
  file: File | null,
  coupleId: string,
  target: { kind: ReceiptKind; expenseId?: string; contributionId?: string }
) {
  if (!file) return;
  try {
    await uploadReceipt(file, coupleId, target);
  } catch (err) {
    toast.warning(`Guardado, pero la constancia no se subió: ${err instanceof Error ? err.message : "error"}`);
  }
}
