// Tiny input validators. Each returns the cleaned value or throws HttpError(400).
const { HttpError } = require('./errors');

const bad = (label, why) => new HttpError(400, `${label} ${why}`);
const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const v = {
  str: (label, { min = 1, max = 255, optional = false } = {}) => (val) => {
    if (isEmpty(val)) { if (optional) return null; throw bad(label, 'is required.'); }
    const s = String(val).trim();
    if (s.length < min || s.length > max) throw bad(label, `must be ${min}-${max} characters.`);
    return s;
  },
  int: (label, { min = 0, max = 1e9, optional = false } = {}) => (val) => {
    if (isEmpty(val)) { if (optional) return null; throw bad(label, 'is required.'); }
    const n = Number(val);
    if (!Number.isInteger(n) || n < min || n > max) throw bad(label, `must be a whole number between ${min} and ${max}.`);
    return n;
  },
  num: (label, { min = 0, max = 1e6, optional = false } = {}) => (val) => {
    if (isEmpty(val)) { if (optional) return null; throw bad(label, 'is required.'); }
    const n = Number(val);
    if (!Number.isFinite(n) || n < min || n > max) throw bad(label, `must be a number between ${min} and ${max}.`);
    return n;
  },
  oneOf: (label, list, { optional = false } = {}) => (val) => {
    if (isEmpty(val)) { if (optional) return null; throw bad(label, 'is required.'); }
    if (!list.includes(val)) throw bad(label, `must be one of: ${list.join(', ')}.`);
    return val;
  },
  date: (label, { optional = false } = {}) => (val) => {
    if (isEmpty(val)) { if (optional) return null; throw bad(label, 'is required.'); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(val)) || Number.isNaN(Date.parse(val))) throw bad(label, 'must be a date (YYYY-MM-DD).');
    return String(val);
  },
  email: (label, { optional = true } = {}) => (val) => {
    if (isEmpty(val)) { if (optional) return null; throw bad(label, 'is required.'); }
    const s = String(val).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || s.length > 120) throw bad(label, 'is not a valid email address.');
    return s;
  },
  password: (label = 'Password', { optional = false } = {}) => (val) => {
    if (isEmpty(val)) { if (optional) return null; throw bad(label, 'is required.'); }
    const s = String(val);
    if (s.length < 8 || s.length > 72 || !/[A-Za-z]/.test(s) || !/\d/.test(s)) {
      throw bad(label, 'must be 8-72 characters and contain at least one letter and one digit.');
    }
    return s;
  },
  bool: (label) => (val) => {
    if (typeof val === 'boolean') return val;
    if (val === 1 || val === 0) return Boolean(val);
    throw bad(label, 'must be true or false.');
  },
};

/** parse(body, { field: validator, ... }) -> cleaned object */
function parse(body, schema) {
  const src = body && typeof body === 'object' ? body : {};
  const out = {};
  for (const [key, fn] of Object.entries(schema)) out[key] = fn(src[key]);
  return out;
}

/** Positive integer id from a URL segment. */
function idParam(val, label = 'id') {
  const n = Number(val);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Invalid ${label}.`);
  return n;
}

module.exports = { v, parse, idParam };
