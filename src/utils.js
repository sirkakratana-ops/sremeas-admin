import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hllsxqjyyoewkbgmwizs.supabase.co";
const SUPABASE_KEY = "sb_publishable_KZbdTXvOcVfnsd9kzEgzAQ_u4T8h2Bt";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const ITEMS_PER_PAGE = 10;

// Fetch all customers handling Supabase PostgREST 1000-row limit
export const fetchAllCustomers = async () => {
  let allCustomers = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + step - 1);

    if (error) {
      console.error('Error fetching customers batch:', error);
      break;
    }
    if (data && data.length > 0) {
      allCustomers = allCustomers.concat(data);
      if (data.length < step) break;
      from += step;
    } else {
      break;
    }
  }
  return allCustomers;
};

export const toKhmerNum = (num) => {
  const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return num?.toString().replace(/\d/g, (d) => khmerNumbers[d]) || '០';
};

export const readKhmerAmount = (amount) => {
  if (!amount || amount === 0) return 'សូន្យរៀលគត់';
  const digits = ['','មួយ','ពីរ','បី','បួន','ប្រាំ','ប្រាំមួយ','ប្រាំពីរ','ប្រាំបី','ប្រាំបួន'];
  const positions = ['','ដប់','រយ','ពាន់','ម៉ឺន','សែន','លាន'];
  let result = '';
  let str = amount.toString();
  for (let i = 0; i < str.length; i++) {
    let n = parseInt(str[i]);
    let pos = str.length - 1 - i;
    if (n !== 0) result += digits[n] + positions[pos % 6];
    if (pos > 0 && pos % 6 === 0 && parseInt(str.substring(Math.max(0, i - 5), i + 1)) > 0) result += positions[6];
  }
  return result.replace(/មួយដប់/g, 'ដប់') + 'រៀលគត់';
};
