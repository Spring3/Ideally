const bcrypt = require('bcrypt');
const saltRounds = 10;

async function hash(password) {
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function compare(password, hash) {
  if (!password) return false;
  const result = await bcrypt.compare(password, hash);
  return result;
}

module.exports = {
  hash,
  compare
}
