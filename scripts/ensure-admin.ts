import { ensureAdminRole } from './lib/adminUtils';

async function setAdmin() {
  const email = 'fadlannafian@gmail.com';
  const result = await ensureAdminRole(email);
  console.log('Result:', result);
}

setAdmin().catch(console.error);