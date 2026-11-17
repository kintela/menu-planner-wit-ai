export interface DecisionAutorizacion {
  autorizado: boolean
  via: "cron" | "admin" | null
}

export const RESPUESTA_NO_AUTORIZADO: Readonly<{
  estado: 403
  cuerpo: Readonly<{ error: "No autorizado" }>
}>

export function extraerBearer(cabecera: unknown): string | null
export function credencialCronValida(cabeceraAuthorization: unknown, secretoCron: string | null | undefined): boolean
export function decidirAutorizacion(entrada: {
  cabeceraAuthorization: string | null | undefined
  secretoCron: string | null | undefined
  comprobarAdmin: () => Promise<boolean>
}): Promise<DecisionAutorizacion>
