import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { ContractFinancialSummary } from '@/components/contracts/ContractFinancialSummary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { contractFormSchema } from '@/lib/contractSchemas'
import { BILLING_FREQUENCY, CONTRACT_TYPE } from '@/lib/semaphore'
import { cn } from '@/lib/utils'

function toFormValues(contract) {
  return {
    contractNumber: contract.contractNumber,
    counterpartyName: contract.counterpartyName,
    counterpartyNit: contract.counterpartyNit,
    object: contract.object,
    startDate: contract.startDate,
    endDate: contract.endDate,
    paymentTermsDays: contract.paymentTermsDays,
    costCenter: contract.costCenter,
    amount: contract.amount,
    ivaRate: contract.ivaRate,
    currency: contract.currency,
    billingFrequency: contract.billingFrequency,
    type: contract.type,
    // Las revisiones empiezan SIN marcar: validar es una decisión de la persona, no un valor por defecto.
    reviewed: { details: false, amounts: false, type: false },
  }
}

/**
 * Casilla de "ya lo revisé" al final de cada bloque. Es la confirmación manual:
 * sin las tres marcadas, el contrato no se puede validar.
 */
function ReviewCheck({ id, name, control, label, error, disabled }) {
  return (
    <div className={cn('rounded-lg border bg-muted/30 p-3', error && 'border-destructive/60')}>
      <Controller
        name={`reviewed.${name}`}
        control={control}
        render={({ field }) => (
          <div className="flex items-start gap-2.5">
            <Checkbox
              id={id}
              checked={field.value}
              disabled={disabled}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              className="mt-0.5"
            />
            <Label htmlFor={id} className="leading-snug font-medium">
              {label}
            </Label>
          </div>
        )}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 pl-6.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function Section({ step, title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
          >
            {step}
          </span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  )
}

/**
 * Formulario de revisión manual del contrato, en tres bloques: detalles, montos y tipo.
 *
 * Props:
 *  - formId:    id del <form>; permite enviarlo desde un botón fuera de él.
 *  - contract:  contrato a revisar.
 *  - readOnly:  los contratos ya validados no se editan.
 *  - onValid:   (values) => void, solo si pasa la validación (incluidas las tres revisiones).
 *  - onInvalid: () => void, si hay errores.
 */
export function ContractForm({ formId, contract, readOnly, onValid, onInvalid }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(contractFormSchema),
    defaultValues: toFormValues(contract),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const id = (name) => `${formId}-${name}`
  const num = { valueAsNumber: true }
  const reviewed = errors.reviewed ?? {}
  const [amount, ivaRate, currency] = useWatch({ control, name: ['amount', 'ivaRate', 'currency'] })

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handleSubmit(onValid, onInvalid)}
      aria-label="Revisión del contrato"
      className="grid gap-6"
    >
      <fieldset disabled={readOnly} className="grid min-w-0 gap-6">
        {/* ------------------------------------------------------------------ 1. Detalles */}
        <Section step={1} title="Detalles" description="Quién, qué, cuándo y en qué condiciones de pago.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={id('contractNumber')} label="Número de contrato" error={errors.contractNumber?.message}>
              {(aria) => <Input id={id('contractNumber')} {...aria} {...register('contractNumber')} />}
            </FormField>
            <FormField id={id('costCenter')} label="Centro de costos" error={errors.costCenter?.message}>
              {(aria) => <Input id={id('costCenter')} placeholder="Opcional" {...aria} {...register('costCenter')} />}
            </FormField>
            <FormField
              id={id('counterpartyName')}
              label="Contraparte"
              error={errors.counterpartyName?.message}
              className="sm:col-span-2"
            >
              {(aria) => <Input id={id('counterpartyName')} {...aria} {...register('counterpartyName')} />}
            </FormField>
            <FormField id={id('counterpartyNit')} label="NIT" error={errors.counterpartyNit?.message}>
              {(aria) => (
                <Input
                  id={id('counterpartyNit')}
                  placeholder="900.123.456-7"
                  inputMode="numeric"
                  {...aria}
                  {...register('counterpartyNit')}
                />
              )}
            </FormField>
            <FormField
              id={id('paymentTermsDays')}
              label="Plazo de pago (días)"
              error={errors.paymentTermsDays?.message}
            >
              {(aria) => (
                <Input
                  id={id('paymentTermsDays')}
                  type="number"
                  inputMode="numeric"
                  {...aria}
                  {...register('paymentTermsDays', num)}
                />
              )}
            </FormField>
            <FormField id={id('startDate')} label="Fecha de inicio" error={errors.startDate?.message}>
              {(aria) => <Input id={id('startDate')} type="date" {...aria} {...register('startDate')} />}
            </FormField>
            <FormField id={id('endDate')} label="Fecha de fin" error={errors.endDate?.message}>
              {(aria) => <Input id={id('endDate')} type="date" {...aria} {...register('endDate')} />}
            </FormField>
            <FormField id={id('object')} label="Objeto del contrato" error={errors.object?.message} className="sm:col-span-2">
              {(aria) => <Textarea id={id('object')} rows={3} {...aria} {...register('object')} />}
            </FormField>
          </div>
          <ReviewCheck
            id={id('reviewed-details')}
            name="details"
            control={control}
            label="Revisé los detalles y son correctos"
            error={reviewed.details?.message}
            disabled={readOnly}
          />
        </Section>

        {/* ------------------------------------------------------------------ 2. Montos */}
        <Section step={2} title="Montos" description="Valor, IVA y cómo se cobra. Lo facturado a la fecha no se edita aquí.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={id('amount')} label="Valor del contrato (sin IVA)" error={errors.amount?.message}>
              {(aria) => (
                <Input
                  id={id('amount')}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  {...aria}
                  {...register('amount', num)}
                />
              )}
            </FormField>
            <FormField id={id('currency')} label="Moneda" error={errors.currency?.message}>
              {(aria) => (
                <NativeSelect id={id('currency')} {...aria} {...register('currency')}>
                  <option value="COP">COP - Peso colombiano</option>
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                </NativeSelect>
              )}
            </FormField>
            <FormField id={id('ivaRate')} label="IVA" error={errors.ivaRate?.message}>
              {(aria) => (
                <NativeSelect id={id('ivaRate')} {...aria} {...register('ivaRate', num)}>
                  <option value={19}>19%</option>
                  <option value={5}>5%</option>
                  <option value={0}>0% (excluido o exento)</option>
                </NativeSelect>
              )}
            </FormField>
            <FormField id={id('billingFrequency')} label="Periodicidad de cobro" error={errors.billingFrequency?.message}>
              {(aria) => (
                <NativeSelect id={id('billingFrequency')} {...aria} {...register('billingFrequency')}>
                  {Object.entries(BILLING_FREQUENCY).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          </div>
          <ContractFinancialSummary contract={contract} amount={amount} ivaRate={ivaRate} currency={currency} />
          <ReviewCheck
            id={id('reviewed-amounts')}
            name="amounts"
            control={control}
            label="Revisé los montos y son correctos"
            error={reviewed.amounts?.message}
            disabled={readOnly}
          />
        </Section>

        {/* ------------------------------------------------------------------ 3. Tipo */}
        <Section step={3} title="Tipo de contrato" description="Define cómo se contabiliza y qué controles aplican.">
          <FormField id={id('type')} label="Tipo" error={errors.type?.message}>
            {(aria) => (
              <NativeSelect id={id('type')} {...aria} {...register('type')}>
                {Object.entries(CONTRACT_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <ReviewCheck
            id={id('reviewed-type')}
            name="type"
            control={control}
            label="Confirmo que el tipo es el correcto"
            error={reviewed.type?.message}
            disabled={readOnly}
          />
        </Section>
      </fieldset>
    </form>
  )
}
