const { createReadStream } = require('node:fs');
const path = require('node:path');
const profileService = require('../services/profileService');
const { sendSuccess } = require('../utils/apiResponse');

async function getProfile(req, res) {
  const profile = await profileService.getProfile(req.auth.id);
  sendSuccess(res, { message: 'Student profile loaded.', data: { profile } });
}

async function updateProfile(req, res) {
  const profile = await profileService.updateProfile(req.auth.id, req.body);
  sendSuccess(res, { message: 'Student profile updated.', data: { profile } });
}

async function uploadPhoto(req, res) {
  const profile = await profileService.saveProfilePhoto(req.auth.id, req.file);
  sendSuccess(res, { message: 'Profile photo updated.', data: { profile } });
}

async function getPhoto(req, res, next) {
  try {
    const photoPath = await profileService.getPhotoPath(req.auth.id);
    res.set({
      'Cache-Control': 'private, no-store',
      'Cross-Origin-Resource-Policy': 'same-site',
      'Content-Type': path.extname(photoPath) === '.png'
        ? 'image/png'
        : path.extname(photoPath) === '.webp'
          ? 'image/webp'
          : 'image/jpeg',
    });
    createReadStream(photoPath)
      .on('error', next)
      .pipe(res);
  } catch (error) {
    next(error);
  }
}

module.exports = { getPhoto, getProfile, updateProfile, uploadPhoto };
