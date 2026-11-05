"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileText, ImagePlus, X } from "lucide-react";
import { RECEIPT_TYPES, isPdfType, validateReceipt } from "@/lib/image";
import { LEGAL } from "@/lib/legal";
import { cn } from "@/lib/utils";

/**
 * Campo OPCIONAL para adjuntar la constancia (voucher, captura de transferencia).
 * Va dentro de un <form>: el archivo se envía en FormData con el nombre `receipt`.
 */
export function ReceiptInput({
  label = "Constancia (opcional)",
  hint = "Foto, captura o PDF (boleta electrónica). Imágenes hasta 5 MB; PDF hasta 2 MB.",
  disabled,
  className,
}: {
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [pdf, setPdf] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Tras enviar, React reinicia el formulario: limpiamos también la vista previa.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setPreview(null);
      setName("");
      setError(null);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    setName("");
    setError(null);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return clear();
    const problem = validateReceipt(file);
    if (problem) {
      clear();
      setError(problem);
      return;
    }
    setError(null);
    setName(file.name);
    setPdf(isPdfType(file.type));
    setPreview(isPdfType(file.type) ? null : URL.createObjectURL(file));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <label
          htmlFor={id}
          className={cn(
            "flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa de la constancia" className="h-full w-full object-cover" />
          ) : name && pdf ? (
            <FileText className="h-6 w-6 text-primary" aria-label="PDF seleccionado" />
          ) : (
            <ImagePlus className="h-5 w-5" aria-hidden />
          )}
        </label>
        <div className="min-w-0 flex-1 text-xs text-muted-foreground">
          {name ? <p className="truncate font-medium text-foreground">{name}</p> : <p>{hint}</p>}
          {!name && <p className="opacity-80">Se conserva {LEGAL.receiptRetentionMonths} meses.</p>}
          {error && <p className="mt-1 text-destructive" role="alert">{error}</p>}
        </div>
        {name && (
          <button type="button" onClick={clear} aria-label="Quitar constancia" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        id={id}
        name="receipt"
        type="file"
        accept={RECEIPT_TYPES.join(",")}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
    </div>
  );
}
