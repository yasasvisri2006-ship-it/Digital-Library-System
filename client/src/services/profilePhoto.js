import api from './api';

export function getProfilePhotoUrl(profile) {
  return profile?.photoUrl ? api.getUri({ url: profile.photoUrl }) : '';
}

export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'MB';
}
