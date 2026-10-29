const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Module = require('node:module');

test('tracking verifies signatures and protects event status', async () => {
  const handlers = {};
  const writes = [];
  const events = [{ token: 'saved', openCount: 1 }];
  const model = {
    updateOne: async (...args) => writes.push(args),
    find: () => ({ select: () => ({ lean: async () => events }) }),
  };
  const originalLoad = Module._load;
  const previousSecret = process.env.OUTREACH_TRACKING_SECRET;
  Module._load = function (name, ...args) {
    if (name === 'express') return { Router: () => ({
      get: (path, handler) => { handlers.get = handler; },
      post: (path, handler) => { handlers.post = handler; },
    }) };
    if (name === 'mongoose') return { Schema: class {}, models: { HardScrapEmailOpen: model } };
    return originalLoad.call(this, name, ...args);
  };
  try { require('../src/routes/emailTrackingRoutes'); }
  finally { Module._load = originalLoad; }
  const response = () => ({ code: 200,
    status(code) { this.code = code; return this; },
    set() { return this; }, send(body) { this.body = body; return this; },
    json(body) { this.body = body; return this; },
  });
  try {
    process.env.OUTREACH_TRACKING_SECRET = 'test-secret';
    const token = crypto.randomUUID();
    const signature = crypto.createHmac('sha256', 'test-secret').update(token).digest('hex');
    let res = response();
    await handlers.get({ params: { token, signature: '0'.repeat(64) } }, res);
    assert.equal(writes.length, 0);
    assert.equal(res.body.subarray(0, 3).toString(), 'GIF');
    await handlers.get({ params: { token, signature } }, response());
    assert.equal(writes.length, 1);
    assert.equal(writes[0][1].$inc.openCount, 1);
    assert.ok(writes[0][1].$setOnInsert.firstOpenedAt);
    res = response();
    await handlers.post({ get: () => '', body: { tokens: [token] } }, res);
    assert.equal(res.code, 401);
    res = response();
    await handlers.post({ get: () => 'Bearer test-secret', body: { tokens: ['invalid'] } }, res);
    assert.equal(res.code, 400);
    res = response();
    await handlers.post({ get: () => 'Bearer test-secret', body: { tokens: [token] } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body.events, events);
    delete process.env.OUTREACH_TRACKING_SECRET;
    res = response();
    await handlers.post({ get: () => '', body: { tokens: [] } }, res);
    assert.equal(res.code, 503);
  } finally {
    if (previousSecret === undefined) delete process.env.OUTREACH_TRACKING_SECRET;
    else process.env.OUTREACH_TRACKING_SECRET = previousSecret;
  }
});
