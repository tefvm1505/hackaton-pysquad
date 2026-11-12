import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Selector nativo del navegador con el estilo de los demás campos.
 * Es nativo a propósito: en móvil abre el selector del sistema y funciona con
 * teclado y lectores de pantalla sin código extra.
 */
function NativeSelect({ className, wrapperClassName, children, ...props }) {
  return (
    // `wrapperClassName` va en el contenedor: para ocultar el selector hay que ocultar también su flecha.
    <div className={cn("relative", wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-background py-1 pr-8 pl-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { NativeSelect }
