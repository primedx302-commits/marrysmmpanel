// Calls the provider API. The key stays in Netlify environment variables.
async function provider(params) {
  const r = await fetch(process.env.SMM_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key: process.env.SMM_API_KEY, ...params })
  });
  return r.json();
}
// Provider rate -> your rate: markup (default +30%) and USD to PKR (default 280)
const mult = () => Number(process.env.MARKUP || 1.3) * Number(process.env.USD_PKR || 280);
const json = (code, body) => ({ statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
module.exports = { provider, mult, json };
