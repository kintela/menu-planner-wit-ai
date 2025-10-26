const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const info = JSON.parse(process.env.SB_AUTH_TOKEN || '{}');
const accessToken = info.access_token || "";

console.log('Anon key length:', anonKey.length);
console.log('Access token length:', accessToken.length);
