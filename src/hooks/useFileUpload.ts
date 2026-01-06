import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type BucketName = 'imoveis-fotos' | 'documentos' | 'avatars';

interface UploadResult {
  path: string;
  url: string;
}

interface UseFileUploadReturn {
  upload: (file: File, path: string) => Promise<UploadResult>;
  remove: (path: string) => Promise<void>;
  uploading: boolean;
  error: string | null;
}

export function useFileUpload(bucket: BucketName): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File, path: string): Promise<UploadResult> => {
    setUploading(true);
    setError(null);

    try {
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return { path: data.path, url: urlData.publicUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer upload';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (path: string): Promise<void> => {
    setUploading(true);
    setError(null);

    try {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (removeError) {
        throw removeError;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover arquivo';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { upload, remove, uploading, error };
}
