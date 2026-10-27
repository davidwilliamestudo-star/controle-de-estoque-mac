const url = 'https://script.google.com/macros/s/AKfycbxI5M8BO7NH48HceoQ1k3wAzddfplwas8KFw-74VMCuxGTZhYhUU060yRldzgpC8TI/exec';

async function test() {
  console.log('--- TEST 1: GET Health Check ---');
  try {
    const resGet = await fetch(url + '?action=health_check');
    console.log('GET Status:', resGet.status, resGet.statusText);
    const textGet = await resGet.text();
    console.log('GET Response:', textGet);
  } catch (err) {
    console.error('GET Failed:', err);
  }

  console.log('\n--- TEST 2: POST Health Check ---');
  try {
    const payload = {
      action: 'health_check',
      api_key: 'dra-ana-morong',
      clinic_id: 'ana-morong-clinic',
      request_id: 'test-conn-' + Date.now()
    };
    const resPost = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    });
    console.log('POST Status:', resPost.status, resPost.statusText);
    const textPost = await resPost.text();
    console.log('POST Response:', textPost);
  } catch (err) {
    console.error('POST Failed:', err);
  }

  console.log('\n--- TEST 3: POST get_checkin_responses (Spreadsheet Read) ---');
  try {
    const payload = {
      action: 'get_checkin_responses',
      api_key: 'dra-ana-morong',
      clinic_id: 'ana-morong-clinic',
      request_id: 'test-checkin-' + Date.now(),
      filters: { only_unsynced: false }
    };
    const resPost = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    });
    console.log('Checkin Query Status:', resPost.status, resPost.statusText);
    const textCheckin = await resPost.text();
    console.log('Checkin Query Response:', textCheckin);
  } catch (err) {
    console.error('Checkin Query Failed:', err);
  }
}

test();

