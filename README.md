# NTI Reality Capture — Bestill 3D-skanning

Standalone konfigurator for bestilling av 3D-scanning.
Utviklet som del av CBS HA(it) eksamen, Gruppe 3.

## Kom i gang

### Forutsetninger
- Node.js 18+
- npm

### Installasjon

```bash
# Klon repoet
git clone https://github.com/MatNygaard/nti-eksamen.git
cd nti-eksamen

# Installer avhengigheter
npm install

# Sett opp miljøvariabler
cp .env.example .env
# Rediger .env og legg inn Supabase-verdier
```

### Kjør lokalt

```bash
npm run dev
```

Åpne http://localhost:5173

## Funksjonalitet

5-stegs konfigurator for bestilling av 3D-skanning:
1. **Type** — Prosjekttype og formål
2. **Omfang** — Areal og lokasjon
3. **Leveranse** — Hva skal leveres
4. **Tilgang** — Tilgangsforhold
5. **Kontakt** — Kontaktinformasjon og innsending

Prisestimat beregnes live basert på inputs.

## Teknologi

- React + Vite + TypeScript
- Tailwind CSS
- Supabase (database)
