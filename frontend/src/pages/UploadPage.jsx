import { PageHeader } from '@/components/layouts/PageHeader'
import { AiAssistantPanel } from '@/components/upload/AiAssistantPanel'
import { Dropzone } from '@/components/upload/Dropzone'
import { UploadQueue } from '@/components/upload/UploadQueue'
import { useUploadQueue } from '@/hooks/useUploadQueue'

/**
 * Carga de documentos.
 *
 * Distribución: a la izquierda la zona de carga y la lista de documentos; a la derecha
 * (desde 1280px) la respuesta de la IA, que se queda visible al bajar. En pantallas
 * angostas el orden es: zona de carga, respuesta de la IA, lista (para que quien sube un
 * archivo vea el resultado sin tener que desplazarse por toda la lista).
 */
export default function UploadPage() {
  const { items, selected, selectedId, select, addFiles, remove, clearFinished } = useUploadQueue()

  return (
    <>
      <PageHeader
        title="Carga de documentos"
        description="Sube facturas en PDF o XML (UBL). Facto las lee, las valida y te explica qué encontró."
      />

      {/* Mitad y mitad: la zona de carga y el asistente miden lo mismo de ancho. La fila 1 mide
          lo que la zona de carga; la fila 2 absorbe la altura que gana el panel al expandirse. */}
      <div className="grid items-start gap-6 xl:grid-cols-2 xl:grid-rows-[auto_1fr]">
        <Dropzone onFiles={addFiles} />

        <AiAssistantPanel
          item={selected}
          className="xl:sticky xl:top-8 xl:col-start-2 xl:row-span-2 xl:row-start-1"
        />

        <UploadQueue
          items={items}
          selectedId={selectedId}
          onSelect={select}
          onRemove={remove}
          onClear={clearFinished}
          className="xl:col-start-1"
        />
      </div>
    </>
  )
}
