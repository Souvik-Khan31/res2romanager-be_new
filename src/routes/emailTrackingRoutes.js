const express = require('express');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const router = express.Router();
const schema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  firstOpenedAt: Date, lastOpenedAt: Date, openCount: { type: Number, default: 0 },
});
const EmailOpen = mongoose.models.HardScrapEmailOpen || mongoose.model('HardScrapEmailOpen', schema);
const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const validToken = (value) => typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value);
const matches = (a, b) => {
  const left = Buffer.from(a || ''); const right = Buffer.from(b || '');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
router.get('/open/:token/:signature', async (req, res) => {
  const secret = process.env.OUTREACH_TRACKING_SECRET;
  const { token, signature } = req.params;
  if (secret && validToken(token) && /^[0-9a-f]{64}$/.test(signature) &&
      matches(signature, crypto.createHmac('sha256', secret).update(token).digest('hex'))) {
    try {
      const now = new Date();
      await EmailOpen.updateOne({ token }, {
        $setOnInsert: { firstOpenedAt: now }, $set: { lastOpenedAt: now }, $inc: { openCount: 1 },
      }, { upsert: true, setDefaultsOnInsert: false });
    } catch (error) { console.error('Email tracking persistence failed:', error.message); }
  }
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }).send(pixel);
});
router.post('/status', async (req, res) => {
  const secret = process.env.OUTREACH_TRACKING_SECRET;
  if (!secret) return res.status(503).json({ error: 'Tracking is not configured.' });
  if (!matches(req.get('authorization'), `Bearer ${secret}`)) return res.status(401).json({ error: 'Unauthorized' });
  const tokens = req.body.tokens;
  if (!Array.isArray(tokens) || tokens.length > 500 || !tokens.every(validToken)) return res.status(400).json({ error: 'Provide up to 500 valid tokens.' });
  try {
    const events = await EmailOpen.find({ token: { $in: tokens } }).select('-_id -__v').lean();
    res.set('Cache-Control', 'no-store').json({ events });
  } catch { res.status(500).json({ error: 'Could not load tracking events.' }); }
});
module.exports = router;
