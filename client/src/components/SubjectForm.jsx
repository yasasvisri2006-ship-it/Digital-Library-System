import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

export default function SubjectForm({ subject, onClose, onSave, saving, error }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      code: subject?.code || '',
      name: subject?.name || '',
      semester: subject?.semester || '',
      description: subject?.description || '',
    },
  });

  useEffect(() => {
    reset({
      code: subject?.code || '',
      name: subject?.name || '',
      semester: subject?.semester || '',
      description: subject?.description || '',
    });
  }, [subject, reset]);

  function submit(values) {
    const cleaned = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value.trim() || null]),
    );
    onSave(cleaned);
  }

  return (
    <div className="subject-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="subject-modal" role="dialog" aria-modal="true" aria-labelledby="subject-form-title">
        <header>
          <div><span>YOUR ACADEMIC SPACE</span><h2 id="subject-form-title">{subject ? 'Edit subject' : 'Add a subject'}</h2></div>
          <button type="button" aria-label="Close subject form" onClick={onClose} disabled={saving}><X size={18} /></button>
        </header>
        <form className="academic-form" onSubmit={handleSubmit(submit)} noValidate>
          <label><span>Subject name</span><input autoFocus maxLength={120} placeholder="Enter the verified subject name" {...register('name', { required: 'Enter a subject name', minLength: { value: 2, message: 'Use at least 2 characters' } })} />{errors.name && <small>{errors.name.message}</small>}</label>
          <div className="academic-form-grid">
            <label><span>Subject code <em>Optional</em></span><input maxLength={40} placeholder="Your official course code" {...register('code')} /></label>
            <label><span>Semester <em>Optional</em></span><input maxLength={40} placeholder="Set your semester" {...register('semester')} /></label>
          </div>
          <label><span>Description</span><textarea rows={3} maxLength={2000} placeholder="Optional notes about this subject" {...register('description')} /></label>
          {error && <p className="academic-message is-error" role="alert">{error}</p>}
          <footer><button className="academic-button is-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button><button className="academic-button" type="submit" disabled={saving}>{saving ? 'Saving...' : subject ? 'Save changes' : 'Add subject'}</button></footer>
        </form>
      </section>
    </div>
  );
}
