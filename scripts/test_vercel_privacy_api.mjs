import assert from 'node:assert/strict';
import privacyHandler from '../api/privacy.js';
import cronHandler from '../api/privacy-cron.js';
import webhookHandler from '../api/parent-verification-webhook.js';
import {
  claimChildConsent,
  createParentConsentRequest,
  finalizeAdultConsent,
  submitDataPrincipalRequest
} from '../server/privacy-service.js';

const invokeHttp = async (handler, request) => {
  const result = { statusCode: 200, headers: {}, body: null };
  const response = {
    setHeader(key, value) {
      result.headers[key] = value;
    },
    status(code) {
      result.statusCode = code;
      return response;
    },
    json(body) {
      result.body = body;
      return response;
    },
    send(body) {
      result.body = body;
      return response;
    }
  };
  await handler({ headers: {}, socket: {}, ...request }, response);
  return result;
};

const expectCode = async (operation, code) => {
  await assert.rejects(operation, (error) => error?.code === code);
};

const tests = [
  ['Privacy API rejects non-POST requests', async () => {
    const result = await invokeHttp(privacyHandler, { method: 'GET' });
    assert.equal(result.statusCode, 405);
  }],
  ['Privacy API fails closed without App Check', async () => {
    const result = await invokeHttp(privacyHandler, {
      method: 'POST',
      body: { action: 'getParentConsentRequest', data: {} }
    });
    assert.equal(result.statusCode, 401);
    assert.equal(result.body.error.code, 'unauthenticated');
  }],
  ['Cron endpoint fails closed without CRON_SECRET', async () => {
    const result = await invokeHttp(cronHandler, { method: 'GET' });
    assert.equal(result.statusCode, 401);
  }],
  ['Adult activation requires authenticated Google user', async () => {
    await expectCode(
      finalizeAdultConsent.invoke({ auth: undefined, data: {}, rawRequest: {} }),
      'unauthenticated'
    );
  }],
  ['Child activation requires authenticated Google user', async () => {
    await expectCode(
      claimChildConsent.invoke({ auth: undefined, data: {}, rawRequest: {} }),
      'unauthenticated'
    );
  }],
  ['Parent invitation rejects stale notice versions before storing data', async () => {
    await expectCode(
      createParentConsentRequest.invoke({
        auth: undefined,
        data: {
          ageBand: 'CHILD',
          parentEmail: 'parent@example.com',
          noticeVersion: 'stale',
          consentVersion: 'stale'
        },
        rawRequest: { ip: '127.0.0.1' }
      }),
      'failed-precondition'
    );
  }],
  ['Rights request requires consent-authorized identity', async () => {
    await expectCode(
      submitDataPrincipalRequest.invoke({ auth: undefined, data: {}, rawRequest: {} }),
      'permission-denied'
    );
  }],
  ['Adult-verification webhook rejects non-POST requests', async () => {
    const result = await invokeHttp(webhookHandler, { method: 'GET', body: {} });
    assert.equal(result.statusCode, 405);
  }]
];

let failed = 0;
for (const [name, test] of tests) {
  try {
    await test();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`, error);
  }
}

console.log(`\n${tests.length - failed}/${tests.length} privacy API checks passed.`);
if (failed) process.exit(1);
