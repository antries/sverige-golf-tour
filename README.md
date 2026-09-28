# Sverige Golf Tour MVP

## Paikallinen käyttö
1. Asenna Node.js 20+
2. Avaa tämä kansio terminaalissa
3. `npm install`
4. `npm run dev`

## Ensimmäinen julkaisu
1. Luo GitHub-repository ja lisää tämän kansion sisältö.
2. Luo Netlify-sivusto repositoryn perusteella.
3. Build command: `npm run build`, publish directory: `dist`.

## Supabase
1. Luo uusi Supabase-projekti.
2. Avaa SQL Editor ja suorita `supabase/schema.sql`.
3. Luo Storage-bucket nimellä `trip-photos`.
4. Kopioi `.env.example` tiedostoksi `.env` ja täytä URL sekä anon key.

Nykyinen MVP käyttää Vidbynäs 2026 -sisältöä paikallisesta seed-datasta. Seuraavassa vaiheessa hallinta ja lataus kytketään Supabaseen.
