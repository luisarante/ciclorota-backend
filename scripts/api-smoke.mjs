const config = {
  baseUrl: (process.env.SMOKE_API_URL ?? 'http://127.0.0.1:3333').replace(/\/$/, ''),
  userToken: process.env.SMOKE_USER_BEARER_TOKEN ?? '',
  adminToken: process.env.SMOKE_ADMIN_BEARER_TOKEN ?? '',
  allowWrite: process.env.SMOKE_ALLOW_WRITE === 'true',
  testCheckpointId: process.env.SMOKE_TEST_CHECKPOINT_ID ?? '',
  testUserId: process.env.SMOKE_TEST_USER_ID ?? ''
};

const checks = [];

await runCheck('GET /health', `${config.baseUrl}/health`, { expectStatus: 200 });
await runCheck('GET /ready', `${config.baseUrl}/ready`, { expectStatus: 200 });
await runCheck('GET /', `${config.baseUrl}/`, { expectStatus: 200 });
await runCheck('GET /checkpoints', `${config.baseUrl}/checkpoints`, { expectStatus: 200 });

if (config.userToken) {
  const userHeaders = {
    Authorization: `Bearer ${config.userToken}`
  };

  await runCheck('GET /auth/me', `${config.baseUrl}/auth/me`, {
    expectStatus: 200,
    headers: userHeaders
  });

  await runCheck('GET /me/profile', `${config.baseUrl}/me/profile`, {
    expectStatus: 200,
    headers: userHeaders
  });

  await runCheck('GET /me/progress', `${config.baseUrl}/me/progress`, {
    expectStatus: 200,
    headers: userHeaders
  });

  if (config.allowWrite && config.testCheckpointId) {
    await runCheck('POST /checkins', `${config.baseUrl}/checkins`, {
      expectStatus: 201,
      method: 'POST',
      headers: {
        ...userHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        {
          checkpoint_id: config.testCheckpointId,
          scanned_at: new Date().toISOString()
        }
      ])
    });
  }
}

if (config.adminToken) {
  const adminHeaders = {
    Authorization: `Bearer ${config.adminToken}`
  };

  await runCheck('GET /admin/overview', `${config.baseUrl}/admin/overview`, {
    expectStatus: 200,
    headers: adminHeaders
  });

  await runCheck('GET /admin/users', `${config.baseUrl}/admin/users?page=1&limit=1`, {
    expectStatus: 200,
    headers: adminHeaders
  });

  await runCheck('GET /admin/checkpoints', `${config.baseUrl}/admin/checkpoints?page=1&limit=1`, {
    expectStatus: 200,
    headers: adminHeaders
  });

  await runCheck('GET /admin/checkins', `${config.baseUrl}/admin/checkins?page=1&limit=1`, {
    expectStatus: 200,
    headers: adminHeaders
  });

  await runCheck('GET /admin/certificates', `${config.baseUrl}/admin/certificates?page=1&limit=1`, {
    expectStatus: 200,
    headers: adminHeaders
  });

  if (config.allowWrite && config.testUserId) {
    await runCheck('POST /admin/certificates/:userId/issue', `${config.baseUrl}/admin/certificates/${config.testUserId}/issue`, {
      expectStatus: 201,
      method: 'POST',
      headers: adminHeaders
    });
  }
}

printSummary();

async function runCheck(label, url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: options.headers,
    body: options.body
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  const result = {
    label,
    url,
    status: response.status,
    ok: response.status === options.expectStatus,
    body: json ?? text
  };

  checks.push(result);

  if (!result.ok) {
    throw new Error(`${label} falhou com status ${response.status}. Corpo: ${JSON.stringify(result.body)}`);
  }
}

function printSummary() {
  console.log('');
  console.log('API smoke summary');
  console.log(`baseUrl: ${config.baseUrl}`);
  console.log(`checks: ${checks.length}`);

  for (const check of checks) {
    console.log(`- ${check.label}: ${check.status}`);
  }

  console.log('');
  console.log('Smoke test concluído com sucesso.');
}
