// Avisos en el iPhone y Siri con el Worker de Cloudflare compartido con Morralla
// (push-worker/ en el repositorio de Morralla; aquí siempre con ?app=tlacuilo).
//  · Activar avisos: pide permiso, suscribe este dispositivo y manda los avisos
//    de los próximos 7 días. Se vuelven a mandar cada vez que cambian tus datos.
//  · Siri: el Atajo deja lo dictado en el Worker; al abrir Tlacuilo se guarda aquí.

import { auth } from '../firebase-init.js';
import { store, sel, suscribir } from '../core/store.js';
import { guardarTarea, guardarAjustes } from '../core/actions.js';
import { calcularAvisos } from '../domain/recordatorios.js';

export const WORKER_URL = 'https://morralla-push.latidia-push.workers.dev';
const VAPID_PUBLIC_KEY = 'BEyOfsTwVEGJX9HFN42oCFByjm3GwJdh9wl1W4_wwHNAdYhbo14qLKuV8JhqoND4-Ozu5TCsxbpod7T51_hkcHg';

const CLAVE_ACTIVO = 'tlacuilo_avisos';
const CLAVE_DISPOSITIVO = 'tlacuilo_dispositivo';

const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const escribir = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

export const soportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const enAppInstalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const avisosActivos = () => soportado() && leer(CLAVE_ACTIVO) === '1' && Notification.permission === 'granted';
export const siriActiva = () => !!sel.ajustes().siriActiva;

function dispositivo() {
    let id = leer(CLAVE_DISPOSITIVO);
    if (!id) { id = crypto.randomUUID(); escribir(CLAVE_DISPOSITIVO, id); }
    return id;
}

const b64uABytes = (s) => {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(b + '==='.slice((b.length + 3) % 4)), c => c.charCodeAt(0));
};

async function llamar(ruta, body = {}) {
    const usuario = auth.currentUser;
    if (!usuario || store.demo) throw new Error('Inicia sesión para usar esta función');
    const token = await usuario.getIdToken();
    const r = await fetch(`${WORKER_URL}${ruta}?app=tlacuilo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(datos.error || `El servidor respondió ${r.status}`);
    return datos;
}

function avisos() {
    const aj = sel.ajustes();
    return calcularAvisos({ tareas: sel.tareas(), eventos: sel.eventos() }, new Date(), {
        horaResumen: aj.horaResumen || '08:00', minutosAntes: Number(aj.minutosAntes) || 15,
    });
}

async function suscripcion() {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uABytes(VAPID_PUBLIC_KEY) });
    return sub.toJSON();
}

const config = () => ({ tz: new Date().getTimezoneOffset() });

// ---------- Avisos ----------
export async function activarAvisos() {
    if (!soportado()) throw new Error('Este navegador no admite avisos');
    if (!enAppInstalada() && /iPhone|iPad/.test(navigator.userAgent)) throw new Error('En iPhone, abre Tlacuilo desde su ícono en la pantalla de inicio');
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') throw new Error('No diste permiso para los avisos. Puedes darlo en Configuración › Tlacuilo › Notificaciones');
    const subscription = await suscripcion();
    const r = await llamar('/sync', { deviceId: dispositivo(), subscription, reminders: avisos(), config: config() });
    escribir(CLAVE_ACTIVO, '1');
    return r;
}

export async function desactivarAvisos() {
    try { const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription(); await sub?.unsubscribe(); } catch { /* ya no estaba */ }
    escribir(CLAVE_ACTIVO, null);
    await llamar('/unsubscribe', { deviceId: dispositivo() });
}

export const avisoDePrueba = () => llamar('/test');

// Manda los avisos (con un respiro para juntar varios cambios seguidos).
let pendienteSync = null, ultimaFirma = '';
export function programarSync(espera = 4000) {
    if (store.demo || !auth.currentUser || !(avisosActivos() || siriActiva())) return;
    clearTimeout(pendienteSync);
    pendienteSync = setTimeout(sincronizar, espera);
}

async function sincronizar() {
    const body = { config: config() };
    if (avisosActivos()) { body.reminders = avisos(); body.deviceId = dispositivo(); }
    const firma = JSON.stringify(body);
    if (firma === ultimaFirma) return;
    try {
        if (avisosActivos()) body.subscription = await suscripcion();
        await llamar('/sync', body);
        ultimaFirma = firma;
    } catch { /* sin conexión: se intenta con el siguiente cambio */ }
}

// ---------- Siri ----------
export async function crearClaveSiri() {
    const { clave } = await llamar('/siri/clave');
    await guardarAjustes({ siriActiva: true });
    await llamar('/sync', { config: config() });
    return clave;
}

export async function revocarSiri() {
    await llamar('/siri/revocar');
    await guardarAjustes({ siriActiva: false });
}

// Guarda como pendientes lo que se dictó a Siri mientras la app estaba cerrada.
let tomando = false;
export async function tomarPendientes() {
    if (tomando || store.demo || !auth.currentUser || !siriActiva()) return 0;
    tomando = true;
    try {
        const { pendientes = [] } = await llamar('/pendientes/tomar');
        for (const p of pendientes) {
            const fecha = /^\d{4}-\d{2}-\d{2}$/.test(p.fecha || '') ? p.fecha : null;
            const hora = fecha && /^\d{2}:\d{2}$/.test(p.hora || '') ? p.hora : null;
            await guardarTarea({ titulo: String(p.titulo || 'Pendiente').slice(0, 120), fecha, hora, prioridad: 0, hecha: false, origen: { siri: true }, creadoEn: p.creadoEn || Date.now() });
        }
        return pendientes.length;
    } catch { return 0; }
    finally { tomando = false; }
}

// Arranque: sincroniza al cambiar los datos y recoge lo de Siri al abrir o volver a la app.
let iniciado = false;
export function iniciarPush(alTomar) {
    if (iniciado) return;
    iniciado = true;
    suscribir(() => programarSync());
    const recoger = async () => { const n = await tomarPendientes(); if (n) alTomar?.(n); };
    recoger();
    programarSync(1500);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { recoger(); programarSync(1500); } });
}
