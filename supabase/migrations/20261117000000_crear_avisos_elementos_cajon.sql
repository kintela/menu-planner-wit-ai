-- Spec 007 — Registro de avisos del congelador.
-- Permite avisar una vez de cada elemento al cruzar el umbral y repetir el
-- aviso solo cuando vence el periodo de recordatorio (RF-7, RF-9, RF-10).
-- No modifica las tablas del inventario ni las políticas del singleton.

CREATE TABLE IF NOT EXISTS public.avisos_elementos_cajon (
  -- Un registro por elemento: la clave primaria garantiza la unicidad que
  -- exige el recordatorio individual, y la cascada cumple RF-10 sin proceso
  -- adicional de limpieza.
  elemento_id uuid PRIMARY KEY
    REFERENCES public.elementos_cajon (id) ON DELETE CASCADE,
  avisado_en timestamptz NOT NULL DEFAULT now(),
  creado_en timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.avisos_elementos_cajon IS
  'Spec 007: fecha del ultimo aviso enviado por cada elemento del congelador.';
COMMENT ON COLUMN public.avisos_elementos_cajon.avisado_en IS
  'Momento del ultimo aviso; de el se deriva el vencimiento del recordatorio.';

-- Consultada siempre por el proceso para decidir a quien avisar.
CREATE INDEX IF NOT EXISTS avisos_elementos_cajon_avisado_en_idx
  ON public.avisos_elementos_cajon (avisado_en);

-- El registro lo escribe exclusivamente el proceso de alertas desde servidor.
-- Ningun rol de navegador debe poder leerlo ni modificarlo.
ALTER TABLE public.avisos_elementos_cajon ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.avisos_elementos_cajon FROM PUBLIC;
REVOKE ALL ON TABLE public.avisos_elementos_cajon FROM anon;
REVOKE ALL ON TABLE public.avisos_elementos_cajon FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.avisos_elementos_cajon TO service_role;

-- Sin politicas: con RLS habilitado y sin politica permisiva, ningun rol
-- sujeto a RLS obtiene filas. service_role no esta sujeto a RLS.
