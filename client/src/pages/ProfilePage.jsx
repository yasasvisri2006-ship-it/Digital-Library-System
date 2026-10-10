import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Save, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { getProfilePhotoUrl } from '../services/profilePhoto';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  studentId: z.string().trim().max(40),
  program: z.string().trim().max(100),
  department: z.string().trim().max(120),
  year: z.string().trim().max(40),
  semester: z.string().trim().max(40),
  phone: z.string().trim().max(40),
});

function optionalValue(value) {
  const trimmed = value.trim();
  return trimmed || null;
}

export default function ProfilePage() {
  const { user, updateProfile, uploadProfilePhoto } = useAuth();
  const profile = user?.studentProfile;
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [failedImageSrc, setFailedImageSrc] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      studentId: profile?.studentId || '',
      program: profile?.program || '',
      department: profile?.department || '',
      year: profile?.year || '',
      semester: profile?.semester || '',
      phone: profile?.phone || '',
    },
  });

  useEffect(() => {
    reset({
      name: user?.name || '',
      studentId: profile?.studentId || '',
      program: profile?.program || '',
      department: profile?.department || '',
      year: profile?.year || '',
      semester: profile?.semester || '',
      phone: profile?.phone || '',
    });
  }, [user, profile, reset]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onSubmit = async (values) => {
    setMessage('');
    setErrorMessage('');
    try {
      await updateProfile({
        name: values.name.trim(),
        studentId: optionalValue(values.studentId),
        program: optionalValue(values.program),
        department: optionalValue(values.department),
        year: optionalValue(values.year),
        semester: optionalValue(values.semester),
        phone: optionalValue(values.phone),
      });
      setMessage('Your profile has been saved.');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to save your profile.');
    }
  };

  const onPhotoSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Profile photos must be 5 MB or smaller.');
      return;
    }

    setErrorMessage('');
    setMessage('');
    setPhotoBusy(true);
    try {
      await uploadProfilePhoto(file);
      setMessage('Your profile photo has been updated.');
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(file);
      });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to upload your profile photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const imageSrc = previewUrl || getProfilePhotoUrl(profile);
  const showImage = Boolean(imageSrc && failedImageSrc !== imageSrc);

  return (
    <section className="student-profile-page">
      <header className="student-profile-title">
        <span className="student-profile-title-icon"><UserRound size={19} /></span>
        <div><span>YOUR ACCOUNT</span><h1>My Profile</h1></div>
      </header>

      <div className="student-profile-card">
        <div className="student-profile-photo-row">
          <div className="student-profile-photo">
            {showImage
              ? <img src={imageSrc} alt={`${user.name} profile`} crossOrigin={previewUrl ? undefined : 'use-credentials'} onError={() => setFailedImageSrc(imageSrc)} />
              : <UserRound size={37} />}
          </div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <label className="student-photo-upload">
              <Camera size={15} />
              {photoBusy ? 'Uploading...' : 'Update photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPhotoSelected}
                disabled={photoBusy}
              />
            </label>
            <small>JPEG, PNG or WebP · up to 5 MB</small>
          </div>
        </div>

        <form className="student-profile-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label><span>Full name</span><input autoComplete="name" {...register('name')} />{errors.name && <small>{errors.name.message}</small>}</label>
          <label><span>Email address</span><input value={user.email} readOnly /></label>
          <label><span>Student ID</span><input {...register('studentId')} />{errors.studentId && <small>{errors.studentId.message}</small>}</label>
          <label><span>Program</span><input {...register('program')} />{errors.program && <small>{errors.program.message}</small>}</label>
          <label><span>Branch / Department</span><input {...register('department')} />{errors.department && <small>{errors.department.message}</small>}</label>
          <label><span>Year</span><input {...register('year')} />{errors.year && <small>{errors.year.message}</small>}</label>
          <label><span>Semester</span><input {...register('semester')} />{errors.semester && <small>{errors.semester.message}</small>}</label>
          <label><span>Phone</span><input autoComplete="tel" {...register('phone')} />{errors.phone && <small>{errors.phone.message}</small>}</label>

          {message && <p className="student-profile-status" role="status">{message}</p>}
          {errorMessage && <p className="student-profile-status is-error" role="alert">{errorMessage}</p>}
          <button className="student-profile-save" type="submit" disabled={isSubmitting}>
            <Save size={16} /> {isSubmitting ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>
    </section>
  );
}
