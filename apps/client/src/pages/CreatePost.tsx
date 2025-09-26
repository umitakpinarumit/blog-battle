import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../api/client';
import CategorySelect from './components/CategorySelect';

const schema = z.object({
  title: z.string().min(3, 'Başlık en az 3 karakter olmalı'),
  content: z.string().min(10, 'İçerik en az 10 karakter olmalı'),
  category: z.string().min(2, 'Kategori gerekli'),
  image: z.any().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreatePost() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting, isValid }, setValue, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', content: '', category: '' },
    mode: 'onChange',
  });

  const image = watch('image') as File | null | undefined;

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const form = new FormData();
      form.append('title', values.title);
      form.append('content', values.content);
      form.append('category', values.category);
      const file = (values.image as any) as File | null;
      if (file) form.append('image', file);
      await api.post('/posts', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      reset();
      navigate('/profile');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Gönderim başarısız');
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-xl font-semibold mb-4">Yeni Yazı</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div>
          <input className="border p-2 w-full" placeholder="Başlık" {...register('title')} required minLength={3} />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <textarea className="border p-2 w-full min-h-32" placeholder="İçerik" {...register('content')} required minLength={10} />
          {errors.content && <p className="text-xs text-red-600 mt-1">{errors.content.message}</p>}
        </div>
        <CategorySelect value={watch('category')} onChange={(v)=>setValue('category', v, { shouldValidate: true })} />
        {errors.category && <p className="text-xs text-red-600 mt-1">Kategori zorunludur.</p>}
        <div>
          <input type="file" accept="image/*" onChange={e=>{
            const file = e.target.files?.[0] || null;
            setValue('image', file as any);
          }} />
          {image && (
            <div className="text-xs text-neutral-600 mt-1">Seçilen: {(image as any)?.name}</div>
          )}
        </div>
        <button disabled={isSubmitting || !isValid || !watch('category')} className="bg-blue-600 text-white py-2 rounded disabled:opacity-60">
          {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </form>
    </div>
  );
}


