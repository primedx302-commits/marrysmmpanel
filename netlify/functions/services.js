const { provider, mult, json } = require("../lib/smm.js");
exports.handler = async () => {
  try {
    const list = await provider({ action: "services" });
    if (!Array.isArray(list)) return json(502, { error: list.error || "Provider error" });
    return json(200, list.filter(s => s.type === "Default").map(s => ({
      id: s.service, name: s.name, category: s.category,
      rate: Math.ceil(Number(s.rate) * mult() * 100) / 100,
      min: Number(s.min), max: Number(s.max)
    })));
  } catch (e) { return json(502, { error: e.message }); }
};
