const { getStore } = require('@netlify/blobs');
 
exports.handler = async function (event) {
  const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
 
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
 
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
 
  const store = getStore('waitlist');
 
  // GET: return contact count
  if (event.httpMethod === 'GET') {
    try {
      const val = await store.get('count');
      const count = val ? parseInt(val) : 0;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ count }),
      };
    } catch (err) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ count: 0 }),
      };
    }
  }
 
  // POST: add contact to Loops and increment counter
  if (event.httpMethod === 'POST') {
    try {
      const { email, refCode, referredBy } = JSON.parse(event.body || '{}');
 
      if (!email || !email.includes('@')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid email' }),
        };
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
        // Increment stored count
        const val = await store.get('count');
        const current = val ? parseInt(val) : 0;
        await store.set('count', String(current + 1));
 
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, count: current + 1 }),
        };
      } else if (data.message && data.message.toLowerCase().includes('already')) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ alreadyExists: true }),
        };
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: data.message || 'Unknown error' }),
        };
      }
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: err.message }),
      };
    }
  }
 
  return { statusCode: 405, headers, body: 'Method not allowed' };
};
 
