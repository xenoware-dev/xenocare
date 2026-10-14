/**
 * Creates (or promotes) the clinic owner account.
 *
 *   npm run create-owner -w server -- owner@clinic.in "Owner Name"
 *
 * The password is asked for interactively (min 8 chars), or taken from OWNER_PASSWORD.
 * Leave it empty for a Google-only account (sign in with the Google account of that email).
 * Safe to re-run: an existing user with that email is promoted to owner and reactivated.
 */
import { createInterface } from 'node:readline/promises';
import { supabaseAdmin } from '../src/lib/supabase.js';

const [email, fullName = 'Owner'] = process.argv.slice(2);
if (!email || !email.includes('@')) {
  console.error('Usage: npm run create-owner -w server -- <email> ["Full Name"]');
  process.exit(1);
}

async function askPassword() {
  if (process.env.OWNER_PASSWORD !== undefined) return process.env.OWNER_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question('Password for the owner (min 8 chars, empty = Google sign-in only): ');
  rl.close();
  return password;
}

async function findUserByEmail(target: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (user || data.users.length < 200) return user;
  }
}

async function main() {
  const existing = await findUserByEmail(email);
  let userId: string;

  if (existing) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      app_metadata: { ...existing.app_metadata, role: 'owner' },
      email_confirm: true,
    });
    if (error) throw error;
    userId = existing.id;
    console.log(`Existing user ${email} promoted to owner.`);
  } else {
    const password = await askPassword();
    if (password && password.length < 8) throw new Error('Password must be at least 8 characters');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { role: 'owner' },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Owner ${email} created.`);
  }

  // The on_auth_user_created trigger makes the profile for new users; upsert covers
  // users that existed before the schema was installed.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, email, full_name: fullName, role: 'owner', is_active: true, deleted_at: null });
  if (profileError) throw profileError;

  console.log(`Done. Sign in at the web app with ${email}.`);
}

main().catch((err) => {
  console.error('Failed:', err.message ?? err);
  process.exit(1);
});
