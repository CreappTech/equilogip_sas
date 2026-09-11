/** Formatea horas decimales (output de la vista de resumen) como "h m". */
export function formatHoras(horas: number | null): string {
  if (horas === null || horas === undefined) return "—";
  const totalMin = Math.round(horas * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}