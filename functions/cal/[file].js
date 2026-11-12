// Calendario in abbonamento per iPhone / Mac / Google Calendar (solo lettura).
// Indirizzo: /cal/<codice>.ics  — il codice segreto si crea e si cambia dall'agenda (Altro → Calendario iPhone).
const SB_URL = "https://afdpxhzxhfeumtjtfvui.supabase.co";
const SB_KEY = "sb_publishable_PlEfnhOIIYzjwciVxKUnSA_wSwMy-7o"; // chiave pubblica

const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// righe al massimo di 75 byte, come vuole lo standard
function fold(line) {
  const enc = new TextEncoder(), out = [];
  let cur = "", n = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export async function onRequestGet({ params }) {
  const token = String(params.file || "").replace(/\.ics$/i, "");
  if (!/^[0-9a-f]{32,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const r = await fetch(SB_URL + "/rest/v1/rpc/calendario_eventi", {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token }),
  });
  const d = r.ok ? await r.json() : null;
  if (!d || !d.ok) return new Response("Not found", { status: 404 });

  const now = utc(Date.now());
  const L = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ilaria Iacone//Agenda//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:" + esc("Agenda " + (d.nome || "")), "X-WR-TIMEZONE:" + (d.fuso || "Europe/Rome"),
    "X-APPLE-CALENDAR-COLOR:#B62432", "REFRESH-INTERVAL;VALUE=DURATION:PT15M", "X-PUBLISHED-TTL:PT15M",
  ];
  for (const e of d.eventi || []) {
    const daConf = e.stato === "da_confermare";
    const desc = [e.tipo, e.telefono ? "Tel. " + e.telefono : "", daConf ? "DA CONFERMARE" : "", e.note || ""].filter(Boolean).join("\n");
    L.push("BEGIN:VEVENT", "UID:" + e.id + "@nutrizionistaiacone.it", "DTSTAMP:" + now,
      "DTSTART:" + utc(e.inizio), "DTEND:" + utc(e.fine),
      "SUMMARY:" + esc((daConf ? "⏳ " : "") + (e.paziente || "Paziente") + " · " + (e.tipo || "Visita")),
      "LOCATION:" + esc([e.sede, e.indirizzo].filter(Boolean).join(" – ")),
      "DESCRIPTION:" + esc(desc), "STATUS:" + (daConf ? "TENTATIVE" : "CONFIRMED"), "TRANSP:OPAQUE", "END:VEVENT");
  }
  for (const b of d.blocchi || []) {
    L.push("BEGIN:VEVENT", "UID:blocco-" + b.id + "@nutrizionistaiacone.it", "DTSTAMP:" + now,
      "DTSTART:" + utc(b.inizio), "DTEND:" + utc(b.fine), "SUMMARY:" + esc("🚫 " + (b.motivo || "Non disponibile")),
      "TRANSP:OPAQUE", "END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return new Response(L.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="agenda.ics"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
