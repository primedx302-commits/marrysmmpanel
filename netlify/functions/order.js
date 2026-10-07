const admin = require("firebase-admin");
const { provider, mult, json } = require("../lib/smm.js");
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  try {
    const token = (event.headers.authorization || "").replace("Bearer ", "");
    const user = await admin.auth().verifyIdToken(token);
    const { service, link, quantity } = JSON.parse(event.body || "{}");
    const qty = parseInt(quantity, 10);
    if (!service || !link || !qty) return json(400, { error: "Fill in the service, link and quantity." });

    const list = await provider({ action: "services" });
    const s = Array.isArray(list) && list.find(x => String(x.service) === String(service));
    if (!s) return json(404, { error: "Service not found." });
    if (qty < Number(s.min) || qty > Number(s.max)) return json(400, { error: `Quantity must be between ${s.min} and ${s.max}.` });

    const charge = Math.ceil(Number(s.rate) * mult() * qty / 1000 * 100) / 100;
    const db = admin.firestore();
    const uref = db.doc("users/" + user.uid);
    await db.runTransaction(async t => {
      const u = await t.get(uref);
      const bal = u.exists ? u.data().balance : 0;
      if (bal < charge) throw new Error(`Not enough balance. This order costs Rs ${charge}.`);
      t.update(uref, { balance: bal - charge });
    });

    let out;
    try { out = await provider({ action: "add", service: s.service, link, quantity: qty }); }
    catch (e) { out = {}; }
    if (!out.order) {
      await uref.update({ balance: admin.firestore.FieldValue.increment(charge) });
      return json(502, { error: "The order was not accepted: " + (out.error || "provider error") + ". Your balance was not charged." });
    }
    await db.collection("orders").add({
      uid: user.uid, serviceName: s.name, link, quantity: qty, charge,
      providerOrder: out.order, status: "submitted", createdAt: Date.now()
    });
    return json(200, { ok: true, charge });
  } catch (e) { return json(400, { error: e.message }); }
};
      
