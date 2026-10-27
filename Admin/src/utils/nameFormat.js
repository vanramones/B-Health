// Splits a stored full name ("Juan Santos Dela Cruz") into its parts so reports can
// show Last Name / First Name / Middle Name separately or as "Dela Cruz, Juan S.".
const PARTICLES = new Set(['de', 'del', 'dela', 'delos', 'della', 'di', 'da', 'san', 'sta', 'sta.', 'sto', 'sto.', 'santa', 'santo', 'la', 'las', 'los', 'van', 'von', 'mac', 'mc']);
const SUFFIXES = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

const cap = (w) => (w === w.toLowerCase() || w === w.toUpperCase()
  ? w.toLowerCase().replace(/(^|[-'])([a-zñ])/g, (_, p, c) => p + c.toUpperCase())
  : w);

export const splitName = (fullName) => {
  const raw = String(fullName || '').trim().replace(/\s+/g, ' ');
  if (!raw) return { last: '', first: '', middle: '', suffix: '' };

  // Already "Last, First Middle"
  if (raw.includes(',')) {
    const [last, rest = ''] = raw.split(',').map((s) => s.trim());
    const parts = rest.split(' ').filter(Boolean);
    const middle = parts.length > 1 ? parts.pop() : '';
    return { last: cap(last), first: parts.map(cap).join(' '), middle: cap(middle), suffix: '' };
  }

  const words = raw.split(' ').map(cap);
  const rawSuffix = words.length > 2 && SUFFIXES.test(words[words.length - 1]) ? words.pop() : '';
  const suffix = /^[js]r\.?$/i.test(rawSuffix) ? `${cap(rawSuffix.replace('.', ''))}.` : rawSuffix.toUpperCase();
  if (words.length === 1) return { last: '', first: words[0], middle: '', suffix };

  // Surname starts at the earliest particle after the first word, else it is the last word
  let lastStart = words.length - 1;
  for (let i = 1; i < words.length - 1; i += 1) {
    if (PARTICLES.has(words[i].toLowerCase())) { lastStart = i; break; }
  }
  const given = words.slice(0, lastStart);
  return {
    last: words.slice(lastStart).join(' '),
    first: (given.length > 1 ? given.slice(0, -1) : given).join(' '),
    middle: given.length > 1 ? given[given.length - 1] : '',
    suffix,
  };
};

const initial = (m) => (m ? `${m.replace(/\./g, '')[0].toUpperCase()}.` : '');

// "Last, First M.I. Suffix"
export const formatName = (fullName) => {
  const { last, first, middle, suffix } = splitName(fullName);
  if (!last) return [first, suffix].filter(Boolean).join(' ');
  return `${last}, ${[first, initial(middle), suffix].filter(Boolean).join(' ')}`;
};

// [Last Name, First Name (with suffix), Middle Name] for separate report columns
export const nameColumns = (fullName) => {
  const { last, first, middle, suffix } = splitName(fullName);
  return [last || '—', [first, suffix].filter(Boolean).join(' ') || '—', middle || '—'];
};
export const NAME_HEADERS = ['Last Name', 'First Name', 'Middle Name'];
export const nameFields = (fullName) => Object.fromEntries(NAME_HEADERS.map((h, i) => [h, nameColumns(fullName)[i]]));

// Sort key so lists can be ordered alphabetically by surname
export const nameSortKey = (fullName) => formatName(fullName).toLowerCase();
