const deployments = [
  { name: 'Seed/Backup URL', id: 'AKfycbxI5M8BO7NH48HceoQ1k3wAzddfplwas8KFw-74VMCuxGTZhYhUU060yRldzgpC8TI' },
  { name: 'Deployment @2 (Fix SPREADSHEET_ID)', id: 'AKfycbycVxi9u0xsxFUjGOG65kMahnzkKHxuKNZLcwmw5atdKnwqRYf1oGsFo2t6BQT_HQus' }
];

async function check() {
  for (const dep of deployments) {
    const url = `https://script.google.com/macros/s/${dep.id}/exec`;
    console.log(`\nTesting ${dep.name}: ${url}`);
    try {
      const res = await fetch(url + '?action=health_check', { redirect: 'follow' });
      console.log('GET Status:', res.status, res.statusText);
      console.log('Content-Type:', res.headers.get('content-type'));
      const text = await res.text();
      console.log('Snippet (150 chars):', text.substring(0, 150));
    } catch (e) {
      console.error('GET Error:', e.message);
    }
  }
}

check();
