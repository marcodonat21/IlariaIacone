// Funzione "mail": manda ai pazienti le mail dell'agenda con Resend, nello stile liquid glass del sito.
// Chiamate:
//   dal sito dopo una prenotazione   { tipo: "ricevuta", id }
//   dall'agenda (utente collegato)   { tipo: "confermato" | "spostato" | "annullato" | "scheda" | "promemoria", id, prima? }
//   ogni ora dal database            { tipo: "promemoria", cron }
// Chi può mandare cosa lo decide il database (mail_prepara): qui si compone e si spedisce.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { LOGO_B64 } from "./logo.ts";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "https://afdpxhzxhfeumtjtfvui.supabase.co";
const SB_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "sb_publishable_PlEfnhOIIYzjwciVxKUnSA_wSwMy-7o";
const RESEND = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("MAIL_FROM") ?? "Ilaria Iacone <agenda@nutrizionistaiacone.it>";
const SITO = "https://www.nutrizionistaiacone.it";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

type M = {
  log: string; chiave: string; tipo: string; a: string; nome: string; visita: string; quando: string; dove: string;
  prima?: string | null; reply_to?: string | null; whatsapp?: string | null; scheda?: string | null; titolo?: string;
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function componi(m: M) {
  const t = m.tipo;
  const annullato = t === "annullato", spostato = t === "spostato", promemoria = t === "promemoria",
    confermato = t === "confermato", scheda = t === "scheda", misure = t === "misure", fattura = t === "fattura", doc = misure || fattura;
  const waLabel = m.whatsapp || "351 785 5930";
  const wa = "https://wa.me/39" + waLabel.replace(/\D/g, "").replace(/^39(?=\d{9,10}$)/, "");
  const maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(m.dove);

  const badge = annullato ? "Appuntamento annullato" : spostato ? "Appuntamento spostato" : promemoria ? "Promemoria"
    : confermato ? "Appuntamento confermato" : scheda ? "Dati per la fattura" : misure ? "Le tue misurazioni" : fattura ? "La tua fattura" : "Richiesta ricevuta";
  const subject = annullato ? "Appuntamento annullato – Ilaria Iacone"
    : spostato ? "Appuntamento spostato: nuova data – Ilaria Iacone"
    : promemoria ? "Promemoria: il tuo appuntamento di domani – Ilaria Iacone"
    : confermato ? "Appuntamento confermato – Ilaria Iacone"
    : scheda ? "I tuoi dati per la fattura – Ilaria Iacone"
    : misure ? "Le tue misurazioni – Ilaria Iacone"
    : fattura ? (m.titolo || "Fattura") + " – Ilaria Iacone"
    : "Richiesta di appuntamento ricevuta – Ilaria Iacone";
  const saluto = annullato || spostato || scheda || doc ? "," : promemoria ? ", a domani!" : confermato ? ", ci vediamo!" : ", grazie!";
  const introHtml = annullato ? "ti avviso che il tuo appuntamento qui sotto è stato <b>annullato</b>. Se vuoi fissarne un altro puoi prenotare dal sito oppure scrivermi su WhatsApp."
    : spostato ? "ti avviso che il tuo appuntamento è stato <b>spostato</b>" + (m.prima ? " (prima era " + esc(m.prima) + ")" : "") + ". Ecco i nuovi dettagli:"
    : promemoria ? "Ti ricordo il tuo appuntamento di <b>domani</b>. Se non puoi venire, avvisami il prima possibile su WhatsApp."
    : confermato ? "il tuo appuntamento è <b>confermato</b>. Ecco i dettagli:"
    : misure ? "ti mando in allegato il <b>report delle tue misurazioni</b>, con l'andamento dal primo controllo a oggi. Se hai domande ne parliamo alla prossima visita."
    : fattura ? "ti mando in allegato la <b>" + esc((m.titolo || "fattura").replace(/^Fattura/, "fattura")) + "</b> della tua visita. Conservala: può servirti per la dichiarazione dei redditi."
    : scheda ? "per la fattura della tua visita mi servono <b>codice fiscale</b> e <b>indirizzo di residenza</b>. Puoi inserirli dal pulsante qui sotto, in modo sicuro."
    : "Ho ricevuto la tua richiesta di appuntamento. <b>Non è ancora confermata</b>: ti ricontatto entro 24 ore per la conferma definitiva.";
  const introTxt = introHtml.replace(/<[^>]+>/g, "");

  const testo = "Ciao " + m.nome + ",\n\n" + introTxt + "\n\n" +
    (doc ? "" : "- Visita: " + m.visita + "\n- Quando: " + m.quando + "\n- Dove: " + m.dove + "\n\n") +
    (m.scheda ? "Per la fatturazione mi servono codice fiscale e indirizzo di residenza: puoi inserirli qui, in modo sicuro: " + m.scheda + "\n\n" : "") +
    (doc ? "" : annullato ? "Per prenotare di nuovo: " + SITO + "/#prenota\n\n" : "Per spostare o disdire scrivimi su WhatsApp al " + waLabel + " almeno 24 ore prima.\n\n") +
    "A presto,\nIlaria Iacone\nBiologa Nutrizionista\n" + SITO + "\n\n---\n" +
    (doc ? "Ricevi questa mail perché sei in cura da me. Uso i tuoi dati solo per le visite e i documenti che ti riguardano. " : "Ricevi questa mail perché hai un appuntamento con me. Ho usato i tuoi dati solo per gestire l'appuntamento. ") +
    "Per favore non inviare informazioni sanitarie via email: ne parleremo in visita.";

  const RED = "#B62432", TEXT = "#1c1c1e", MUTED = "#6e6e73", BG = "#fdf6f6";
  const sans = "-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif";
  const glass = "background:#ffffff;background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.95);box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 18px 40px -22px rgba(120,30,40,.35)";
  const btn = "display:inline-block;margin:5px;background:" + RED + ";background-image:linear-gradient(180deg,#c9333f," + RED + ");color:#ffffff;font:600 15px " + sans + ";text-decoration:none;padding:13px 24px;border-radius:999px;box-shadow:0 10px 22px -10px rgba(182,36,50,.6)";
  const btn2 = "display:inline-block;margin:5px;background:#ffffff;background:rgba(255,255,255,.8);color:" + RED + ";border:1px solid rgba(182,36,50,.18);font:600 15px " + sans + ";text-decoration:none;padding:12px 22px;border-radius:999px";
  const riga = (k: string, v: string, last = false) =>
    '<tr><td style="padding:13px 0;' + (last ? "" : "border-bottom:1px solid rgba(60,60,67,.1);") + "width:84px;font:500 13px " + sans + ";color:" + MUTED + ';vertical-align:top">' + k + "</td>" +
    '<td style="padding:13px 0;' + (last ? "" : "border-bottom:1px solid rgba(60,60,67,.1);") + "font:600 16px/1.4 " + sans + ";color:" + TEXT + '">' + v + "</td></tr>";

  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">' +
    "<style>:root{color-scheme:light only;supported-color-schemes:light}body{margin:0;background:" + BG + "}</style></head>" +
    '<body style="margin:0;background:' + BG + '" bgcolor="' + BG + '">' +
    '<div style="background:' + BG + ';background-image:radial-gradient(60% 40% at 0% 0%,rgba(182,36,50,.20),transparent 70%),radial-gradient(55% 45% at 100% 12%,rgba(128,158,132,.32),transparent 70%),radial-gradient(60% 40% at 70% 100%,rgba(250,180,186,.45),transparent 70%);padding:30px 14px 36px">' +
    '<table role="presentation" align="center" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse"><tr><td>' +
    '<div style="text-align:center;padding:4px 0 20px"><a href="' + SITO + '" style="text-decoration:none">' +
    '<img src="cid:logo" width="76" height="76" alt="Ilaria Iacone · Biologa Nutrizionista" style="display:block;margin:0 auto;background:#ffffff;border-radius:24px;padding:10px;box-shadow:0 10px 26px -12px rgba(120,30,40,.35)">' +
    "</a></div>" +
    '<div style="' + glass + ';border-radius:28px;padding:28px 26px 24px">' +
    '<div style="display:inline-block;background:rgba(182,36,50,.1);color:' + RED + ";font:600 13px " + sans + ';padding:6px 13px;border-radius:999px">' + badge + "</div>" +
    '<h1 style="font:700 28px/1.2 ' + sans + ";color:" + TEXT + ';letter-spacing:-.02em;margin:14px 0 10px">Ciao ' + esc(m.nome) + saluto + "</h1>" +
    '<p style="font:16px/1.6 ' + sans + ';color:#3a3a3c;margin:0 0 18px">' + introHtml + "</p>" +
    (doc ? '<div style="background:#ffffff;background:rgba(255,255,255,.66);border:1px solid rgba(255,255,255,.95);border-radius:20px;padding:14px 18px;font:600 15px ' + sans + ";color:" + TEXT + '">📎 ' + esc(m.titolo || badge) + ' <span style="font-weight:400;color:' + MUTED + '">· PDF allegato</span></div>' :
    '<div style="background:#ffffff;background:rgba(255,255,255,.66);border:1px solid rgba(255,255,255,.95);border-radius:20px;padding:4px 18px">' +
    '<table role="presentation" width="100%" style="border-collapse:collapse">' +
    riga("Visita", esc(m.visita)) + riga("Quando", esc(m.quando)) + riga("Dove", esc(m.dove), true) +
    "</table></div>") +
    (m.scheda ? '<div style="margin-top:18px;background:rgba(182,36,50,.06);border-radius:20px;padding:16px 18px;text-align:center"><p style="font:15px/1.55 ' + sans + ";color:" + TEXT + ';margin:0 0 10px">Per la fatturazione mi servono <b>codice fiscale</b> e <b>indirizzo di residenza</b>:</p>' +
      '<a href="' + esc(m.scheda) + '" style="' + btn + '">Completa i tuoi dati</a></div>' : "") +
    '<div style="padding:20px 0 4px;text-align:center">' +
    (annullato ? '<a href="' + SITO + '/#prenota" style="' + btn + '">Prenota un nuovo appuntamento</a>'
      : scheda || doc ? "" : '<a href="' + maps + '" style="' + btn + '">Apri su Maps</a>') +
    '<a href="' + wa + '" style="' + btn2 + '">Scrivimi su WhatsApp</a>' +
    '<a href="' + SITO + '" style="' + btn2 + '">Visita il sito</a>' +
    "</div>" +
    (annullato || doc ? "" : '<p style="font:14px/1.55 ' + sans + ";color:" + MUTED + ';margin:16px 0 0;text-align:center">Per spostare o disdire scrivimi su WhatsApp almeno 24 ore prima.</p>') +
    '<p style="font:16px/1.6 ' + sans + ';color:#3a3a3c;margin:22px 0 0">A presto,<br><b style="color:' + TEXT + '">Ilaria Iacone</b></p>' +
    "</div>" +
    '<p style="font:12px/1.55 ' + sans + ";color:" + MUTED + ';text-align:center;margin:20px 18px 0">' + (doc ? "Ricevi questa mail perché sei in cura da me. Uso i tuoi dati solo per le visite e i documenti che ti riguardano." : "Ricevi questa mail perché hai un appuntamento con me. Ho usato i tuoi dati solo per gestire l&#39;appuntamento.") + ' Per favore non inviare informazioni sanitarie via email: ne parleremo in visita.<br><a href="' + SITO + '" style="color:' + RED + ';text-decoration:none">nutrizionistaiacone.it</a></p>' +
    "</td></tr></table></div></body></html>";
  return { subject, html, testo };
}

async function spedisci(m: M, pdf?: { content: string; filename: string }) {
  const { subject, html, testo } = componi(m);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json", "Idempotency-Key": m.log },
    body: JSON.stringify({
      from: FROM, to: [m.a], subject, html, text: testo,
      reply_to: m.reply_to || "agenda.iacone@gmail.com",
      attachments: [{ filename: "logo.png", content: LOGO_B64, content_id: "logo", content_type: "image/png" }]
        .concat(pdf ? [{ filename: pdf.filename, content: pdf.content, content_type: "application/pdf" } as never] : []),
    }),
  });
  const body = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: body.id as string } : { ok: false, errore: r.status + " " + (body.message || JSON.stringify(body)) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);
  if (!RESEND) return json({ ok: false, error: "manca RESEND_API_KEY" }, 500);
  let b: { tipo?: string; id?: string; prima?: string; cron?: string; pdf?: string; file?: string };
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad_request" }, 400); }

  // se chiama l'agenda, uso il login di chi chiama: il database controlla che sia dello studio
  const auth = req.headers.get("Authorization") ?? "";
  const jwt = /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth) ? auth : null;
  const sb = createClient(SB_URL, SB_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: jwt ? { headers: { Authorization: jwt } } : {},
  });

  // documento con PDF allegato (report misurazioni o fattura), solo dall'agenda
  if (b.tipo === "misure" || b.tipo === "fattura") {
    const pdf = String(b.pdf ?? "").replace(/^data:[^,]*,/, "");
    if (!jwt || !pdf.startsWith("JVBER") || pdf.length > 8_000_000) return json({ ok: false, error: "bad_request" }, 400);
    const r = await sb.rpc("mail_documento", { p_tipo: b.tipo, p_id: b.id ?? null });
    if (r.error) return json({ ok: false, error: r.error.message }, 400);
    if (!r.data?.ok) return json(r.data ?? { ok: false }, 403);
    const m = r.data.mail as M;
    const filename = (String(b.file ?? "").replace(/[^\w .()-]/g, "").slice(0, 80) || "documento") .replace(/(\.pdf)?$/i, ".pdf");
    let e: { ok: boolean; id?: string; errore?: string };
    try { e = await spedisci(m, { content: pdf, filename }); } catch (x) { e = { ok: false, errore: String(x) }; }
    await sb.rpc("mail_esito", { p_log: m.log, p_chiave: m.chiave, p_ok: e.ok, p_resend: e.id ?? null, p_errore: e.errore ?? null });
    return json({ ok: e.ok, inviate: e.ok ? 1 : 0, totale: 1 });
  }

  const { data, error } = await sb.rpc("mail_prepara", {
    p_tipo: String(b.tipo ?? ""), p_id: b.id ?? null, p_prima: b.prima ? String(b.prima).slice(0, 80) : null, p_cron: b.cron ?? null,
  });
  if (error) return json({ ok: false, error: error.message }, 400);
  if (!data?.ok) return json(data ?? { ok: false }, 403);

  const lista = (data.mail ?? []) as M[];
  const esiti = [];
  for (const m of lista) {
    let e: { ok: boolean; id?: string; errore?: string };
    try { e = await spedisci(m); } catch (x) { e = { ok: false, errore: String(x) }; }
    await sb.rpc("mail_esito", { p_log: m.log, p_chiave: m.chiave, p_ok: e.ok, p_resend: e.id ?? null, p_errore: e.errore ?? null });
    esiti.push({ a: m.a.replace(/^(.).*(@.*)$/, "$1…$2"), ok: e.ok });
  }
  return json({ ok: true, inviate: esiti.filter((x) => x.ok).length, totale: esiti.length, esiti });
});
