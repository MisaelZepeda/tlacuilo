// Arranque de Tlacuilo: sesión (la misma de Morralla), datos, rutas y acciones globales.

import { auth } from './firebase-init.js';
import { store, sel, setAgenda, setMorralla, suscribir, reiniciar } from './core/store.js';
import * as db from './core/db.js';
import * as A from './core/actions.js';
import { definirRuta, iniciarRouter, alNavegar, rutaActual, navegar } from './core/router.js';
import { iniciarEventos, on } from './core/eventos.js';
import { cerrarHoja, toast, confirmar } from './components/capas.js';
import { abrirNuevo } from './components/evento-form.js';
import { tecoSVG } from './components/teco.js';
import { icon } from './lib/icons.js';
import { escapeHtml } from './lib/format.js';
import { aplicarApariencia, temaEfectivo, alternarTemaSesion } from './lib/apariencia.js';
import { construirDemo } from './lib/demo-data.js';
import { mostrarAcceso, ocultarAcceso } from './views/acceso.js';
import { consejoAlAzar } from './domain/teco.js';

import * as hoy from './views/hoy.js';
import * as pendientes from './views/pendientes.js';
import * as ajustes from './views/ajustes.js';
import * as calendario from './views/calendario.js';
import * as registros from './views/registros.js';
import * as registro from './views/registro.js';

definirRuta('/hoy', hoy);
definirRuta('/pendientes', pendientes);
definirRuta('/ajustes', ajustes);
definirRuta('/calendario', calendario);
definirRuta('/registros', registros);
definirRuta('/registro/:id', registro);

const NAV = [
    ['#/hoy', 'sunrise', 'Hoy', ['/hoy']],
    ['#/pendientes', 'check-circle', 'Pendientes', ['/pendientes']],
    ['#/calendario', 'calendar', 'Calendario', ['/calendario']],
    ['#/registros', 'note', 'Registros', ['/registros', '/registro']],
];
const AJUSTES = ['#/ajustes', 'settings', 'Ajustes', ['/ajustes']];

// ---------- Render ----------
function activo(prefijos) { const p = rutaActual().path || ''; return prefijos.some(x => p === x || p.startsWith(x + '/') || p.startsWith(x + '?')); }

function pintarNav() {
    const link = ([h, i, t, p]) => `<a class="side-link ${activo(p) ? 'activo' : ''}" href="${h}">${icon(i)}${t}</a>`;
    document.getElementById('sidebar').innerHTML = `
        <div class="brand"><img src="logo.svg" alt="">tlacuilo</div>
        <button class="btn btn-primary side-add" data-action="nuevo">${icon('plus')}Agregar</button>
        ${NAV.map(link).join('')}
        <div class="side-bottom">${link(AJUSTES)}</div>`;
    const tab = ([h, i, t, p]) => `<a class="tab ${activo(p) ? 'activo' : ''}" href="${h}">${icon(i)}<span>${t}</span></a>`;
    document.getElementById('tabbar').innerHTML = `${tab(NAV[0])}${tab(NAV[1])}<button class="tab-add" data-action="nuevo" aria-label="Agregar">${icon('plus')}</button>${tab(NAV[2])}${tab(NAV[3])}`;
}

function pintarTop(vista, params) {
    const t = vista.titulo?.(params) || {};
    const oscuro = temaEfectivo() === 'oscuro';
    document.getElementById('top').innerHTML = `
        ${t.atras ? `<a class="icon-btn top-back" href="${t.atras}" aria-label="Volver">${icon('chevron-right', 'rot180')}</a>` : ''}
        <div class="top-title"><h1>${escapeHtml(t.titulo || '')}</h1>${t.subtitulo ? `<p>${escapeHtml(t.subtitulo)}</p>` : ''}</div>
        ${store.demo ? '<span class="badge badge-warn">Demo</span>' : ''}
        <button class="icon-btn" data-action="alternarTema" aria-label="${oscuro ? 'Tema claro' : 'Tema oscuro'}">${icon(oscuro ? 'sun' : 'moon')}</button>
        <a class="icon-btn top-ajustes" href="#/ajustes" aria-label="Ajustes">${icon('settings')}</a>`;
}

function pintarVista(nuevaVista = false) {
    if (!store.cargado) return;
    const r = rutaActual();
    if (!r?.vista) return;
    // Un editor abierto (p. ej. un registro) no se repinta con cada guardado.
    if (!nuevaVista && r.vista.conservar?.()) return;
    const el = document.getElementById('vista');
    const scroll = window.scrollY;
    // Conserva el foco de la captura rápida al repintar (al agregar varios seguidos).
    const enfocado = document.activeElement?.closest?.('.rapido') ? '.rapido input' : null;
    pintarNav();
    pintarTop(r.vista, r.params);
    el.innerHTML = r.vista.render(r.params);
    if (nuevaVista) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; window.scrollTo(0, 0); }
    else window.scrollTo(0, scroll);
    if (enfocado) el.querySelector(enfocado)?.focus();
    r.vista.montar?.(el, r.params);
}

alNavegar((r, cambio) => { if (cambio) r.vista.alEntrar?.(r.params); pintarVista(cambio); });
suscribir(() => pintarVista(false));
document.addEventListener('apariencia', () => pintarVista(false));

// ---------- Carga ----------
const inicioCarga = performance.now();
function ocultarCarga() {
    const el = document.getElementById('cargando');
    if (el.hidden) return;
    setTimeout(() => { el.hidden = true; }, Math.max(0, 1400 - (performance.now() - inicioCarga)));
}
document.getElementById('cargando').addEventListener('click', (e) => { e.currentTarget.hidden = true; });
document.getElementById('cargando-teco').innerHTML = tecoSVG('contento', { tamano: 130 });
document.getElementById('consejo-carga-texto').textContent = consejoAlAzar();
document.getElementById('consejo-carga').hidden = false;

function mostrarApp() {
    ocultarAcceso();
    document.getElementById('app').hidden = false;
    ocultarCarga();
}

// ---------- Datos ----------
let primeraVez = true;
function entrarUsuario(user) {
    store.usuario = user;
    db.conectarFirebase(user.uid, {
        agenda: (d) => {
            setAgenda(d);
            mostrarApp();
            // Primera vez en Tlacuilo: listas de ejemplo.
            if (primeraVez && !d.meta) A.iniciarAgenda().catch(errorDatos);
            primeraVez = false;
        },
        morralla: (d) => setMorralla(d),
        error: errorDatos,
    });
}

function errorDatos(e) {
    document.getElementById('cargando').hidden = true;
    const permiso = String(e?.code || e?.message || '').toLowerCase().includes('permission');
    toast(permiso ? 'Tu base de datos no permite guardar la agenda todavía. Revisa las reglas de Firebase.' : 'No se pudieron cargar tus datos.', { tipo: 'error', duracion: 10000 });
}

function entrarDemo() {
    store.demo = true;
    const { agenda, v4 } = construirDemo();
    db.conectarDemo(agenda, v4, { agenda: (d) => { setAgenda(d); mostrarApp(); }, morralla: (d) => setMorralla(d), error: () => {} });
}

// ---------- Acciones globales ----------
// El + pregunta si es pendiente o evento (en Calendario, para el día elegido).
on('nuevo', () => abrirNuevo(rutaActual().patron === '/calendario' ? { fecha: calendario.diaSeleccionado() } : {}));
on('cerrarHoja', () => cerrarHoja());
on('alternarTema', () => alternarTemaSesion());
on('entrarDemo', entrarDemo);
on('cerrarSesion', async () => {
    if (store.demo) { location.hash = ''; location.reload(); return; }
    if (!(await confirmar({ titulo: 'Cerrar sesión', texto: 'También se cerrará en Morralla en este dispositivo.', aceptar: 'Cerrar sesión' }))) return;
    db.desconectar();
    reiniciar();
    await auth.signOut();
    location.reload();
});

// Atajo: "n" crea un pendiente (fuera de campos de texto).
document.addEventListener('keydown', (e) => {
    if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable]') || document.querySelector('.capa')) return;
    if (!document.getElementById('app').hidden) { e.preventDefault(); abrirNuevo(); }
});

// ---------- Inicio ----------
aplicarApariencia();
iniciarEventos();
if (!location.hash) location.replace('#/hoy');
iniciarRouter();

auth.onAuthStateChanged((user) => {
    if (store.demo) return;
    if (user) entrarUsuario(user);
    else { document.getElementById('cargando').hidden = true; document.getElementById('app').hidden = true; mostrarAcceso(); }
});

// ---------- Actualizaciones (service worker) ----------
function avisarActualizacion(sw) {
    if (document.getElementById('aviso-actualizacion')) return;
    const el = document.createElement('div');
    el.id = 'aviso-actualizacion';
    el.className = 'aviso-actualizacion';
    el.setAttribute('role', 'status');
    el.innerHTML = `${icon('download')}<span><b>Hay una nueva versión</b>Actualiza para ver las mejoras.</span><button class="btn btn-primary btn-sm">Actualizar</button>`;
    el.querySelector('button').addEventListener('click', (e) => {
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = 'Actualizando…';
        sw.postMessage('SKIP_WAITING');
    });
    document.body.appendChild(el);
}

if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargando) { recargando = true; location.reload(); } });
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js');
            if (reg.waiting && navigator.serviceWorker.controller) avisarActualizacion(reg.waiting);
            reg.addEventListener('updatefound', () => {
                const nuevo = reg.installing;
                nuevo?.addEventListener('statechange', () => { if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisarActualizacion(nuevo); });
            });
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
            setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
        } catch { /* sin service worker la app funciona igual */ }
    });
}
