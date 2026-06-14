import https from 'https';

const TOKEN = 'REDACTED_VERCEL_TOKEN';
const PROJECT_ID = 'prj_b5PZ3KtMI0gzroKDik7l7YLtwSk4';

const body = JSON.stringify({
  name: 'taiwan-maps',
  target: 'production',
  gitSource: {
    type: 'github',
    org: 'chenricky',
    repo: 'taiwan-maps',
    ref: 'master',
  },
});

const options = {
  hostname: 'api.vercel.com',
  path: `/v13/deployments?projectId=${PROJECT_ID}`,
  method: 'POST',
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    const r = JSON.parse(data);
    console.log('HTTP Status:', res.statusCode);
    if (r.id) {
      console.log('✅ Deployment triggered!');
      console.log('  Deploy ID:', r.id);
      console.log('  URL:      https://' + r.url);
      console.log('  State:    ', r.readyState || r.status || 'QUEUED');
    } else {
      console.log('Response:', JSON.stringify(r, null, 2));
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.write(body);
req.end();
