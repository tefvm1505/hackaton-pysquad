import * as React from "react"
import { cva } from "class-variance-authority";
import { useKeyboardModality } from "@/hooks/useKeyboardModality"
import { useSlidingIndicator } from "@/hooks/useSlidingIndicator"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        // Pista hundida con una pieza en relieve que se desliza (ver TabsList). `overflow-hidden`
        // recorta la sombra de esa pieza dentro de la pista. Si no caben las pestañas, bajan de
        // renglón (sin barras de scroll).
        neumorphic:
          "neu-inset relative w-full max-w-full flex-wrap gap-0.5 overflow-hidden rounded-xl p-1 group-data-horizontal/tabs:h-auto sm:w-fit sm:gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}) {
  const listRef = React.useRef(null)
  const indicatorRef = React.useRef(null)
  const neumorphic = variant === "neumorphic"
  const animated = useSlidingIndicator(listRef, indicatorRef, neumorphic)

  // Indicador de foco: solo si hay foco dentro del selector Y se está navegando con teclado.
  const keyboard = useKeyboardModality()
  const [focusWithin, setFocusWithin] = React.useState(false)
  const showFocusRing = neumorphic && keyboard && focusWithin

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
      onFocus={(event) => {
        setFocusWithin(true)
        props.onFocus?.(event)
      }}
      onBlur={(event) => {
        // Si el foco pasa a otra pestaña de la misma lista, sigue "dentro".
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false)
        props.onBlur?.(event)
      }}
    >
      {neumorphic && (
        // Pieza en relieve que viaja hasta la pestaña activa. Es solo decoración: va oculta a
        // lectores de pantalla y no recibe clics. Su posición la escribe useSlidingIndicator.
        <span
          ref={indicatorRef}
          aria-hidden="true"
          data-slot="tabs-indicator"
          className={cn(
            "neu-raised pointer-events-none absolute top-0 left-0 rounded-lg opacity-0",
            // Foco de teclado: en este selector el foco siempre coincide con la pestaña elegida,
            // así que el indicador viaja con la pieza. Solo aparece al navegar con teclado,
            // nunca con el mouse o el dedo (ver useKeyboardModality: no se usa :focus-visible
            // porque el navegador lo deja encendido tras usar el teclado una vez). Se usa
            // `outline` (no `ring`) para no pisar la sombra de relieve, que también es box-shadow.
            // Gris medio pegado a la pieza: se ve (contraste > 3:1, mínimo de accesibilidad) sin ser pesado.
            showFocusRing && "outline-2 outline-offset-0 outline-muted-foreground",
            animated &&
              // 350 ms con curva que acelera y frena suave (como un deslizamiento real).
              "transition-[transform,width,height,opacity] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
          )}
        />
      )}
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        // Variante neumorphic: la pestaña es transparente y el relieve lo pone la pieza
        // deslizante de TabsList. El estado activo también se nota por el contraste del texto
        // (no solo por la sombra). No cambia el grosor de la letra: así el ancho de las
        // pestañas no varía al seleccionar y la pieza llega exacta.
        // El anillo de foco NO se dibuja en el botón (quedaría fijo mientras la pieza se desliza):
        // lo lleva la pieza, ver TabsList. Aquí se anula el del estilo base.
        "group-data-[variant=neumorphic]/tabs-list:h-auto group-data-[variant=neumorphic]/tabs-list:flex-1 sm:group-data-[variant=neumorphic]/tabs-list:flex-none group-data-[variant=neumorphic]/tabs-list:gap-1 group-data-[variant=neumorphic]/tabs-list:rounded-lg group-data-[variant=neumorphic]/tabs-list:px-2.5 group-data-[variant=neumorphic]/tabs-list:py-1 group-data-[variant=neumorphic]/tabs-list:text-[13px] group-data-[variant=neumorphic]/tabs-list:text-foreground/65 group-data-[variant=neumorphic]/tabs-list:data-active:border-transparent group-data-[variant=neumorphic]/tabs-list:data-active:bg-transparent group-data-[variant=neumorphic]/tabs-list:data-active:text-foreground dark:group-data-[variant=neumorphic]/tabs-list:data-active:bg-transparent group-data-[variant=neumorphic]/tabs-list:focus-visible:border-transparent group-data-[variant=neumorphic]/tabs-list:focus-visible:ring-0 group-data-[variant=neumorphic]/tabs-list:focus-visible:outline-none sm:group-data-[variant=neumorphic]/tabs-list:gap-1.5 sm:group-data-[variant=neumorphic]/tabs-list:px-4 sm:group-data-[variant=neumorphic]/tabs-list:text-sm",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
