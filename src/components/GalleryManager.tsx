import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase, localizeMediaUrl } from '@/lib/supabase';
import { Upload, Trash2, Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import { logActivity } from '@/lib/activity';

interface GalleryPhoto {
  id: string;
  photo_url: string;
  storage_path: string;
  label: string | null;
  sort_order: number;
}

interface Actor {
  id: string;
  email: string;
  role: string;
}

export default function GalleryManager({ actor }: { actor: Actor | null }) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setPhotos(data as GalleryPhoto[]);
    } else {
      setPhotos([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');
    setSuccess('');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${i}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        failCount++;
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('gallery-photos')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('gallery_photos')
        .insert({
          photo_url: urlData.publicUrl,
          storage_path: fileName,
          sort_order: photos.length + i,
        });

      if (dbError) {
        failCount++;
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      await logActivity(
        actor,
        'gallery_photo_uploaded',
        'gallery_photo',
        `Uploaded ${successCount} photo${successCount > 1 ? 's' : ''} to gallery`,
        undefined,
        { count: successCount },
      );
      setSuccess(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded successfully.`);
      fetchPhotos();
    }
    if (failCount > 0) {
      setError(`${failCount} photo${failCount > 1 ? 's' : ''} failed to upload.`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    setDeletingId(photo.id);
    setError('');
    setSuccess('');

    await supabase.storage
      .from('gallery-photos')
      .remove([photo.storage_path]);

    const { error: dbError } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', photo.id);

    if (dbError) {
      setError('Failed to delete photo.');
    } else {
      await logActivity(
        actor,
        'gallery_photo_deleted',
        'gallery_photo',
        'Removed a photo from the gallery',
        undefined,
        { photo_id: photo.id },
      );
      setSuccess('Photo removed from gallery.');
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    }
    setDeletingId(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-heading text-lg font-medium text-white">
            <ImageIcon size={20} className="text-amber-200" />
            Gallery Photos
          </h3>
          <p className="mt-1 text-xs text-white/40">
            Upload photos that appear on the public Gallery page. You can upload multiple photos at once.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            id="gallery-photo-upload"
          />
          <label
            htmlFor="gallery-photo-upload"
            className={`flex cursor-pointer items-center gap-2 rounded-sm bg-amber-200/90 px-5 py-2.5 text-sm font-medium text-[#1A1C1E] transition-all hover:bg-amber-200 ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload Photos
              </>
            )}
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-sm bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mt-4 flex items-start gap-2 rounded-sm bg-green-500/10 p-3 text-sm text-green-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex items-center justify-center py-12 text-white/40">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-sm border border-dashed border-white/10 py-16">
          <ImageIcon size={32} className="text-white/20" />
          <p className="mt-3 text-sm text-white/40">No gallery photos yet. Upload some to get started.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-sm border border-white/10">
              <img
                src={localizeMediaUrl(photo.photo_url)}
                alt={photo.label || 'Gallery photo'}
                className="aspect-[4/3] w-full object-cover"
              />
              <button
                onClick={() => handleDelete(photo)}
                disabled={deletingId === photo.id}
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-red-400 opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 disabled:opacity-50"
              >
                {deletingId === photo.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
