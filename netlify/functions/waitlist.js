exports.handler = async function (event) {
  const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
  const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
  const SITE_ID = process.env.PARE_SITE_ID;
 
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
 
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
 
  async function getCount() {
    try {
      const res = await fetch(
        `https://api.netlify.com/api/v1/blobs/${SITE_ID}/waitlist/count`,
        { headers: { Authorization: `Bearer ${NETLIFY_TOKEN}` } }
      );
      if (!res.ok) return 0;
      const text = await res.text();
      return parseInt(text) || 0;
    } catch { return 0; }
  }
 
  async function setCount(n) {
    await fetch(
      `https://api.netlify.com/api/v1/blobs/${SITE_ID}/waitlist/count`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          'Content-Type': 'text/plain',
        },
        body: String(n),
      }
    );
  }
 
  if (event.httpMethod === 'GET') {
    const count = await getCount();
    return { statusCode: 200, headers, body: JSON.stringify({ count }) };
  }
 
  if (event.httpMethod === 'POST') {
    try {
      const { email, refCode, referredBy } = JSON.parse(event.body || '{}');
 
      if (!email || !email.includes('@')) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email' }) };
      }
 
      const res = await fetch('https://app.loops.so/api/v1/contacts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOOPS_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          source: 'waitlist',
          userGroup: 'waitlist',
          mailingLists: {},
          referralCode: refCode || undefined,
          referredBy: referredBy || undefined,
        }),
      });
 
      const data = await res.json();
 
      if (res.ok || data.id || data.success) {
        const current = await getCount();
        const newCount = current + 1;
        await setCount(newCount);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, count: newCount }) };
      } else if (data.message && data.message.toLowerCase().includes('already')) {
        return { statusCode: 409, headers, body: JSON.stringify({ alreadyExists: true }) };
      } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: data.message || 'Unknown error' }) };
      }
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }
 
  return { statusCode: 405, headers, body: 'Method not allowed' };
};
 
