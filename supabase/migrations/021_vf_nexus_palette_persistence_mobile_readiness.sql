-- VF Nexus V10 — paleta completa e persistente por empresa
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_superficie TEXT DEFAULT '#FFFFFF';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_superficie2 TEXT DEFAULT '#EEF4FB';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_borda TEXT DEFAULT '#DCE6F0';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_menu TEXT DEFAULT '#FFFFFF';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_card TEXT DEFAULT '#FFFFFF';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_muted TEXT DEFAULT '#667085';

UPDATE public.empresas
SET cor_superficie = COALESCE(NULLIF(cor_superficie, ''), '#FFFFFF'),
    cor_superficie2 = COALESCE(NULLIF(cor_superficie2, ''), '#EEF4FB'),
    cor_borda = COALESCE(NULLIF(cor_borda, ''), '#DCE6F0'),
    cor_menu = COALESCE(NULLIF(cor_menu, ''), '#FFFFFF'),
    cor_card = COALESCE(NULLIF(cor_card, ''), '#FFFFFF'),
    cor_muted = COALESCE(NULLIF(cor_muted, ''), '#667085')
WHERE cor_superficie IS NULL OR cor_superficie2 IS NULL OR cor_borda IS NULL OR cor_menu IS NULL OR cor_card IS NULL OR cor_muted IS NULL;
