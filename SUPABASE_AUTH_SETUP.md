# Supabase Auth Setup Guide

## Oversigt
Denne app bruger Supabase Auth til autentificering. Brugere kan kun onboardes via Supabase invites, og der er to typer brugere: `admin` og `superadmin`.

## 1. Konfigurer Supabase Auth

### A. Opret brugere via Supabase Dashboard
1. Gå til [Supabase Dashboard](https://app.supabase.com)
2. Vælg dit projekt
3. Gå til **Authentication** → **Users**
4. Klik på **"Invite user"** eller **"Add user"**
5. Indtast email-adressen
6. Vælg om brugeren skal være `admin` eller `superadmin`

### B. Sæt brugerrolle i User Metadata
Når du opretter eller inviterer en bruger, skal du sætte deres rolle i **User Metadata**:

**Via Supabase Dashboard:**
1. Gå til **Authentication** → **Users**
2. Klik på brugeren
3. Scroll ned til **"User Metadata"**
4. Tilføj følgende JSON:
```json
{
  "role": "admin"
}
```
eller
```json
{
  "role": "superadmin"
}
```

**Via SQL (hvis du foretrækker det):**
```sql
-- Opdater eksisterende bruger til admin
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'bruger@example.com';

-- Opdater eksisterende bruger til superadmin
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"superadmin"'
)
WHERE email = 'bruger@example.com';
```

## 2. Konfigurer Redirect URLs

**VIGTIGT:** Du skal konfigurere redirect URLs i Supabase Dashboard for at magic links virker korrekt.

1. Gå til [Supabase Dashboard](https://app.supabase.com)
2. Vælg dit projekt
3. Gå til **Authentication** → **URL Configuration**

### A. Site URL
**VIGTIGT:** Site URL skal være din **production URL**, ikke localhost!

- **Site URL:** `https://himmelstrupdashboard.netlify.app` (eller din production URL)
- Dette er den URL Supabase bruger som fallback hvis redirect URL'en ikke matcher
- **Hvis Site URL er sat til localhost, vil alle magic links (også fra production) redirecte til localhost!**

### B. Redirect URLs
Under **"Redirect URLs"**, tilføj følgende URLs (med `/login` path):

- `http://localhost:5173/login` (for lokal udvikling med Vite)
- `http://localhost:3000/login` (hvis du bruger en anden port lokalt)
- `https://himmelstrupdashboard.netlify.app/login` (for production - **VIGTIGT:** skal matche din production URL)

**Bemærk:** 
- Magic links bruger hash-fragmenter (`#access_token=...`) som håndteres automatisk af appen
- Sørg for at redirect URL'en peger på `/login` siden
- Hvis Site URL er sat til localhost, vil magic links fra production altid redirecte til localhost

## 3. Magic Link Login
Brugere modtager en magic link via email når de:
- Bliver inviteret via Supabase Dashboard
- Anmoder om magic link på login-siden

Magic link'en redirecter til `/login` siden hvor hash-fragmentet automatisk håndteres og brugeren logges ind.

## 4. Brugerroller

### Admin
- Kan se alle sider
- Kan administrere medarbejdere (`/admin/users`)
- Standard rolle for alle brugere

### Superadmin
- Har alle admin rettigheder
- Kan tilgå fremtidige superadmin-specifikke features
- Skal sættes eksplicit i user metadata

## 5. Environment Variables
Sørg for at have følgende environment variables sat:
- `VITE_SUPABASE_URL` - Din Supabase projekt URL
- `VITE_SUPABASE_KEY` - Din Supabase anon/public key (IKKE service_role key!)

## 6. Test
1. Opret en test-bruger via Supabase Dashboard
2. Sæt rolle til `admin` eller `superadmin` i user metadata
3. Send magic link til brugeren
4. Log ind og verificer at brugerinfo vises nederst i sidebar
5. Test at log ud fungerer

## Noter
- Brugere uden rolle vil default til `admin` (for bagudkompatibilitet)
- Nye brugere skal have rolle sat eksplicit via Supabase Dashboard
- Magic links udløber efter 1 time (standard Supabase indstilling)

