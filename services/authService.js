const bcrypt = require('bcrypt');
const supabase = require('./supabaseClient');

const SALT_ROUNDS = 10;

// Look up a user by username, then by email, using separate equality
// queries. This avoids interpolating raw input into a PostgREST `.or()`
// filter string (which could break or be abused with special characters).
async function findUserByUsernameOrEmail(username, email) {
  const existingByUsername = await findUserByUsername(username);
  if (existingByUsername) {
    return existingByUsername;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function findUserByUsername(username) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function isBcryptHash(value) {
  return value.startsWith('$2b$') || value.startsWith('$2a$');
}

// Verify a password against a stored user. Accounts created before password
// hashing was added store plaintext; for those we verify the plaintext once
// and transparently migrate the record to a bcrypt hash.
async function verifyPassword(user, password) {
  if (isBcryptHash(user.password)) {
    return bcrypt.compare(password, user.password);
  }

  if (password === user.password) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', user.id);
    return true;
  }

  return false;
}

async function createUser({ name, email, username, password }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const { data, error } = await supabase
    .from('users')
    .insert({ name, email, username, password: hashedPassword })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  findUserByUsernameOrEmail,
  findUserByUsername,
  verifyPassword,
  createUser
};
