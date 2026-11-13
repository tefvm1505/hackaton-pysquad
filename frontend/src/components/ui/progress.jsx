import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({ className, indicatorClassName, value = 0, ...props }) {
  // Entre 0 y 100, también para Radix: un valor mayor (p. ej. 104,8% ejecutado) lanza un aviso en
  // consola y no debe desbordar la barra. El porcentaje real se muestra aparte, como texto.
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={clamped}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 bg-primary transition-transform duration-200", indicatorClassName)}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
