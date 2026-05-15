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
 
  // GET: return real contact count from Loops
  if (event.httpMethod === 'GET') {
    try {
      const res = await fetch('https://app.loops.so/api/v1/contacts?limit=100', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LOOPS_API_KEY}`,
        },
      });
 
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = text; }
 
      // Return raw response for debugging
      if (event.queryStringParameters && event.queryStringParameters.debug) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: res.status, data }),
        };
      }
 
      const contacts = Array.isArray(data) ? data : (data.contacts || data.data || []);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ count: contacts.length }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: err.message }),
      };
    }
  }
 
  // POST: add contact to Loops
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
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
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
 
