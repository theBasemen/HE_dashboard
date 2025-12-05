# Supabase Storage Setup for Avatar Uploads

## Problem
Fejlen "new row violates row-level security policy" opstår fordi Storage bucket `he_avatars` mangler RLS politikker der tillader uploads.

## Løsning

### 1. Gå til Supabase Dashboard
1. Log ind på [Supabase Dashboard](https://app.supabase.com)
2. Vælg dit projekt
3. Gå til **Storage** i venstre menu

### 2. Opret Storage Bucket (hvis den ikke findes)
1. Klik på **"New bucket"**
2. Navn: `he_avatars`
3. **VIGTIGT**: Sæt bucket til **Public** (ikke Private)
4. Klik **"Create bucket"**

### 3. Opret RLS Politikker

Gå til **Storage** → **Policies** → Vælg `he_avatars` bucket

**FØRST: Slet eksisterende politikker (hvis de findes)**
```sql
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to delete avatars" ON storage.objects;
```

#### Politik 1: Tillad INSERT (Upload) - PUBLIC (vigtigst!)
```sql
CREATE POLICY "Allow public to upload avatars"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'he_avatars');
```

#### Politik 2: Tillad SELECT (Download/View)
```sql
CREATE POLICY "Allow public to view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'he_avatars');
```

#### Politik 3: Tillad DELETE
```sql
CREATE POLICY "Allow public to delete avatars"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'he_avatars');
```

### 4. Alternativ: Deaktiver RLS (Kun til udvikling - IKKE anbefalet til produktion)

Hvis du vil deaktivere RLS helt for denne bucket (kun til test):

1. Gå til **Storage** → **Policies**
2. Vælg `he_avatars` bucket
3. Klik på **"Disable RLS"** (ikke anbefalet)

### 5. Verificer Bucket Settings

Sørg for at:
- Bucket er **Public**
- RLS er aktiveret (med politikkerne ovenfor)
- Bucket navn er præcist `he_avatars` (case-sensitive)

## Test

Efter at have oprettet politikkerne, prøv at uploade et avatar billede igen. Det skulle nu virke!

