import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required");
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Service role client for server-side operations
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// TUS resumable upload helper
export async function createResumableUpload(
  bucket: string,
  filePath: string,
  maxFileSize = 10 * 1024 * 1024 * 1024 // 10GB
) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(filePath, {
      upsert: true,
      resumable: true,
      maxFileSize
    });

  if (error) {
    throw new Error(`Failed to create resumable upload: ${error.message}`);
  }

  return data;
}

// Vault operations for secure secrets storage
export async function storeSecret(name: string, secret: string, description?: string) {
  const { data, error } = await supabaseAdmin
    .from('vault.secrets')
    .insert({
      name,
      secret,
      description
    });

  if (error) {
    throw new Error(`Failed to store secret: ${error.message}`);
  }

  return data;
}

export async function getSecret(secretRef: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('id', secretRef)
    .single();

  if (error) {
    throw new Error(`Failed to retrieve secret: ${error.message}`);
  }

  return data.decrypted_secret;
}
