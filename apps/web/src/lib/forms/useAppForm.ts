import { useForm, type FieldValues, type UseFormProps, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type AppFormValues<TSchema extends z.ZodType> = z.infer<TSchema>;

export function useAppForm<TSchema extends z.ZodType<FieldValues>>(
  schema: TSchema,
  options?: UseFormProps
): UseFormReturn<AppFormValues<TSchema>> {
  if (
    process.env.NODE_ENV === "development" &&
    options &&
    options.defaultValues === undefined
  ) {
    console.warn(
      "[useAppForm] Falta defaultValues: los campos del schema arrancan en undefined " +
        "y la validación de Zod los rechaza. Pasa defaultValues con \'\'\'/false (nunca undefined)."
    );
  }

  const resolver = options?.resolver ?? (zodResolver(schema as never) as never);

  return useForm({
    mode: "onTouched",
    ...options,
    resolver,
  }) as unknown as UseFormReturn<AppFormValues<TSchema>>;
}