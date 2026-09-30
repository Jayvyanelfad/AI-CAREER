const express = require('express');

const AVATAR_BUCKET = 'profile-avatars';
const PROFILE_FIELDS = 'id, full_name, career_goal, avatar_path, bio, preferred_language, theme_preference, created_at, updated_at';
const SUPPORTED_LANGUAGES = new Set(['en', 'fr', 'hinglish', 'sw', 'ar']);
const SUPPORTED_THEMES = new Set(['system', 'light', 'dark']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function publicAvatarUrl(supabase, avatarPath) {
  if (!avatarPath) return null;
  try {
    return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath).data?.publicUrl || null;
  } catch {
    return null;
  }
}

function profileResponse(supabase, user, row = {}) {
  const fullName = row.full_name || user.name || null;
  const careerGoal = row.career_goal || user.careerGoal || 'undecided';
  return {
    id: user.id,
    email: user.email || null,
    full_name: fullName,
    name: fullName,
    career_goal: careerGoal,
    careerGoal,
    avatar_path: row.avatar_path || null,
    avatar_url: publicAvatarUrl(supabase, row.avatar_path),
    bio: row.bio || '',
    preferred_language: row.preferred_language || null,
    theme_preference: row.theme_preference || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function parseProfileUpdates(body, userId) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid profile data' };
  const allowed = new Set(['fullName', 'careerGoal', 'bio', 'avatarPath', 'preferredLanguage', 'themePreference']);
  if (Object.keys(body).some(key => !allowed.has(key))) return { error: 'Unsupported profile field' };

  const updates = {};
  if (Object.hasOwn(body, 'fullName')) {
    if (typeof body.fullName !== 'string' || !body.fullName.trim() || body.fullName.trim().length > 100) {
      return { error: 'Name must be 1 to 100 characters' };
    }
    updates.full_name = body.fullName.trim();
  }
  if (Object.hasOwn(body, 'careerGoal')) {
    if (typeof body.careerGoal !== 'string' || !body.careerGoal.trim() || body.careerGoal.trim().length > 100) {
      return { error: 'Career goal must be 1 to 100 characters' };
    }
    updates.career_goal = body.careerGoal.trim();
  }
  if (Object.hasOwn(body, 'bio')) {
    if (typeof body.bio !== 'string' || body.bio.trim().length > 240) return { error: 'Bio must be 240 characters or fewer' };
    updates.bio = body.bio.trim();
  }
  if (Object.hasOwn(body, 'avatarPath')) {
    const value = body.avatarPath;
    const pathPattern = new RegExp(`^${userId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`, 'i');
    if (value !== null && (typeof value !== 'string' || !pathPattern.test(value))) return { error: 'Invalid avatar reference' };
    updates.avatar_path = value;
  }
  if (Object.hasOwn(body, 'preferredLanguage')) {
    if (typeof body.preferredLanguage !== 'string' || !SUPPORTED_LANGUAGES.has(body.preferredLanguage)) {
      return { error: 'Unsupported language preference' };
    }
    updates.preferred_language = body.preferredLanguage;
  }
  if (Object.hasOwn(body, 'themePreference')) {
    if (typeof body.themePreference !== 'string' || !SUPPORTED_THEMES.has(body.themePreference)) {
      return { error: 'Unsupported theme preference' };
    }
    updates.theme_preference = body.themePreference;
  }
  if (!Object.keys(updates).length) return { error: 'No profile fields provided' };
  return { updates };
}

function createProfileRouter({ supabase, authenticateToken }) {
  const router = express.Router();
  router.use(authenticateToken);

  router.get('/', async (req, res) => {
    try {
      const { data, error } = await supabase.from('users').select(PROFILE_FIELDS)
        .eq('id', req.user.id).maybeSingle();
      if (error) return res.status(500).json({ error: 'Could not load profile' });
      return res.json(profileResponse(supabase, req.user, data || {}));
    } catch {
      return res.status(500).json({ error: 'Could not load profile' });
    }
  });

  router.put('/', async (req, res) => {
    const parsed = parseProfileUpdates(req.body, req.user.id);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    try {
      const { data: updated, error } = await supabase.from('users').update(parsed.updates)
        .eq('id', req.user.id).select(PROFILE_FIELDS).maybeSingle();
      if (error) return res.status(500).json({ error: 'Could not save profile' });
      if (updated) return res.json(profileResponse(supabase, req.user, updated));

      const inserted = {
        id: req.user.id,
        full_name: req.user.name || null,
        career_goal: req.user.careerGoal || 'undecided',
        ...parsed.updates
      };
      const { data: created, error: createError } = await supabase.from('users')
        .insert(inserted).select(PROFILE_FIELDS).single();
      if (createError) return res.status(500).json({ error: 'Could not save profile' });
      return res.json(profileResponse(supabase, req.user, created));
    } catch {
      return res.status(500).json({ error: 'Could not save profile' });
    }
  });

  return router;
}

module.exports = {
  AVATAR_BUCKET,
  createProfileRouter,
  parseProfileUpdates,
  profileResponse,
  publicAvatarUrl
};
