const { test } = require('node:test');
const assert = require('node:assert/strict');
let retry;
try {
  retry = require('../src/domain/network-retry.ts').retryThrottled;
} catch {}
test('照片恢复遇到限流等待后从当前照片继续，未授权不重试', async () => {
  assert.equal(typeof retry, 'function');
  let calls = 0,
    waits = 0;
  const result = await retry(
    async () => ({ statusCode: ++calls === 1 ? 429 : 200 }),
    async () => {
      waits++;
    },
  );
  assert.equal(result.statusCode, 200);
  assert.equal(calls, 2);
  assert.equal(waits, 1);
  calls = 0;
  await retry(
    async () => ({ statusCode: ++calls ? 401 : 200 }),
    async () => {
      throw Error('不应等待');
    },
  );
  assert.equal(calls, 1);
});
test('持续限流最多重试两次，不无限挂起', async () => {
  let calls = 0,
    waits = 0;
  assert.equal(
    (
      await retry(
        async () => {
          calls++;
          return { statusCode: 429 };
        },
        async () => {
          waits++;
        },
      )
    ).statusCode,
    429,
  );
  assert.equal(calls, 3);
  assert.equal(waits, 2);
});
