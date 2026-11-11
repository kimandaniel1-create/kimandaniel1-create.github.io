export default async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  if (!apiKey || !Number.isInteger(listId) || listId < 1) {
    return Response.json({ error: 'The newsletter service is not configured yet.' }, { status: 500 });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Quietly accept bot submissions without adding them to the list.
  if (typeof data.company === 'string' && data.company.trim() !== '') {
    return Response.json({ ok: true });
  }

  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true
      })
    });

    if (!brevoResponse.ok) {
      const details = await brevoResponse.json().catch(() => ({}));
      console.error('Brevo contact creation failed:', brevoResponse.status, details);
      return Response.json({ error: 'Brevo could not add this address. Please try again later.' }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Brevo request failed:', error);
    return Response.json({ error: 'Unable to reach the mailing service. Please try again.' }, { status: 502 });
  }
};
