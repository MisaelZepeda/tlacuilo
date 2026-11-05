// Ajustes: tus listas, apariencia (compartida con Morralla), enlace a Morralla y sesión.

import { store, sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { guardarLista, borrarLista, guardarAjustes } from '../core/actions.js';
import * as Push from '../lib/push.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { confirmar, toast, abrirHoja } from '../components/capas.js';
import { COLORES_LISTA } from '../components/piezas.js';
import { temaElegido, elegirTema } from '../lib/apariencia.js';
import { MORRALLA_URL } from './hoy.js';

export const titulo = () => ({ titulo: 'Ajustes' });

export function selectorTema(tema) {
    return `<div class="seg seg-tema">${[['auto', 'sparkle', 'Automático'], ['claro', 'sun', 'Claro'], ['oscuro', 'moon', 'Oscuro']]
        .map(([v, i, t]) => `<button class="${tema === v ? 'activo' : ''}" data-action="ajTema" data-v="${v}">${icon(i)} ${t}</button>`).join('')}</div>`;
}

export function render() {
    const p = sel.perfil();
    const listas = sel.listas();
    const cuenta = (id) => sel.tareas().filter(t => t.listaId === id && !t.hecha).length;
    return `<div class="ajustes">
        <section class="card">
            <h2 class="card-title" style="margin-bottom:6px;">Listas</h2>
            <p class="card-desc" style="margin:0 0 10px;">Agrupa tus pendientes por contexto: Casa, Trabajo, Compras…</p>
            <div>${listas.map(l => `<div class="lista-fila">
                <input value="${escapeHtml(l.nombre)}" data-change="ajListaNombre" data-id="${escapeHtml(l.id)}" aria-label="Nombre de la lista">
                <div class="colores">${COLORES_LISTA.slice(0, 5).map(c => `<button class="color ${(l.color || COLORES_LISTA[0]) === c ? 'activo' : ''}" style="--c:${c}" data-action="ajListaColor" data-id="${escapeHtml(l.id)}" data-c="${c}" aria-label="Color"></button>`).join('')}</div>
                <button class="icon-btn" data-action="ajListaBorrar" data-id="${escapeHtml(l.id)}" aria-label="Borrar lista ${escapeHtml(l.nombre)}" title="${cuenta(l.id)} pendientes">${icon('trash')}</button>
            </div>`).join('')}</div>
            <form data-submit="ajListaNueva" style="display:flex; gap:8px; margin-top:10px;"><input name="nombre" placeholder="Nueva lista" autocomplete="off" aria-label="Nueva lista"><button class="btn btn-soft" type="submit">${icon('plus')}Agregar</button></form>
        </section>

        <section class="card">
            <h2 class="card-title" style="margin-bottom:6px;">Avisos</h2>
            <p class="card-desc" style="margin:0 0 12px;">Teco te avisa aunque la app esté cerrada: un resumen cada mañana, a la hora de tus pendientes, antes de tus eventos y, de noche, lo que viene mañana.</p>
            ${avisosHTML()}
        </section>

        <section class="card">
            <h2 class="card-title" style="margin-bottom:6px;">Siri</h2>
            <p class="card-desc" style="margin:0 0 12px;">Di "Oye Siri, pendiente" y dicta algo como "llamar al dentista mañana a las 5". Teco lo anota con fecha y hora sin abrir nada; aparece aquí la próxima vez que abras Tlacuilo.</p>
            ${siriHTML()}
        </section>

        <section class="card">
            <h2 class="card-title" style="margin-bottom:14px;">Apariencia</h2>
            <div class="field" style="margin:0;"><span class="label">Tema</span>${selectorTema(temaElegido())}
                <span class="hint">Se comparte con Morralla en este dispositivo.</span></div>
        </section>

        <section class="card">
            <a class="morralla-link" href="${MORRALLA_URL}" target="_blank" rel="noopener">
                <img src="${MORRALLA_URL}logo.svg" alt="">
                <div><b>Morralla</b><small>Tus finanzas. Tlacuilo lee tus pagos y gastos para mostrarlos en Hoy.</small></div>${icon('external')}</a>
        </section>

        <section class="card">
            <h2 class="card-title" style="margin-bottom:6px;">Tu cuenta</h2>
            <p class="hint" style="margin:0 0 12px;">${escapeHtml(p.nombre || '')}${store.usuario?.email ? ` · ${escapeHtml(store.usuario.email)}` : ''}${store.demo ? 'Modo demo' : ''}. Es la misma cuenta de Morralla.</p>
            <button class="btn btn-ghost btn-block" data-action="cerrarSesion">${icon('log-out')}${store.demo ? 'Salir de la demo' : 'Cerrar sesión'}</button>
        </section>
        <p class="hint" style="text-align:center;">Tlacuilo · el que escribe y recuerda</p>
    </div>`;
}

on('ajTema', (el) => elegirTema(el.dataset.v));

// ---------- Avisos ----------
const HORAS_RESUMEN = ['06:00', '07:00', '08:00', '09:00', '10:00'];
const MINUTOS_ANTES = [5, 10, 15, 30, 60];

function avisosHTML() {
    if (store.demo) return '<p class="hint">Disponible al iniciar sesión con tu cuenta.</p>';
    if (!Push.soportado()) return '<p class="hint">Este navegador no admite avisos. En iPhone necesitas iOS 16.4 o más reciente y abrir Tlacuilo desde su ícono en la pantalla de inicio.</p>';
    if (!Push.avisosActivos()) {
        return /iPhone|iPad/.test(navigator.userAgent) && !Push.enAppInstalada()
            ? '<p class="hint">Abre Tlacuilo desde su ícono en la pantalla de inicio para activar los avisos (Safari no los permite).</p>'
            : `<button class="btn btn-primary" data-action="ajAvisosOn">${icon('bell')}Activar avisos</button>`;
    }
    const aj = sel.ajustes();
    const hora = aj.horaResumen || '08:00', antes = Number(aj.minutosAntes) || 15;
    return `<p class="aviso-estado pos">${icon('check-circle')}Activos en este dispositivo</p>
        <div class="tf-fila">
            <div class="field"><label for="aj-resumen">Resumen de la mañana</label><select id="aj-resumen" data-change="ajHoraResumen">${HORAS_RESUMEN.map(h => `<option value="${h}" ${h === hora ? 'selected' : ''}>${h}</option>`).join('')}</select></div>
            <div class="field"><label for="aj-antes">Aviso antes de eventos</label><select id="aj-antes" data-change="ajMinutosAntes">${MINUTOS_ANTES.map(m => `<option value="${m}" ${m === antes ? 'selected' : ''}>${m < 60 ? `${m} min` : '1 hora'}</option>`).join('')}</select></div>
        </div>
        <div class="botones-fila"><button class="btn btn-soft" data-action="ajAvisoPrueba">${icon('bell')}Enviar aviso de prueba</button>
        <button class="btn btn-ghost" data-action="ajAvisosOff">Desactivar</button></div>`;
}

const repintar = () => { const v = document.getElementById('vista'); if (v && location.hash.startsWith('#/ajustes')) v.innerHTML = render(); };

on('ajAvisosOn', async (el) => {
    el.disabled = true;
    try { await Push.activarAvisos(); toast('¡Listo! Teco te avisará'); repintar(); }
    catch (e) { toast(e.message, { tipo: 'error' }); el.disabled = false; }
});
on('ajAvisosOff', async () => {
    try { await Push.desactivarAvisos(); toast('Avisos desactivados'); } catch (e) { toast(e.message, { tipo: 'error' }); }
    repintar();
});
on('ajAvisoPrueba', async (el) => {
    el.disabled = true;
    try {
        const r = await Push.avisoDePrueba();
        toast(r.delivered ? 'Aviso enviado: debe llegar en unos segundos' : 'No se pudo entregar; desactiva y vuelve a activar los avisos', { tipo: r.delivered ? undefined : 'error' });
    } catch (e) { toast(e.message, { tipo: 'error' }); }
    el.disabled = false;
});
on('ajHoraResumen', async (el) => { await guardarAjustes({ horaResumen: el.value }); toast(`Resumen a las ${el.value}`); }, 'change');
on('ajMinutosAntes', async (el) => { await guardarAjustes({ minutosAntes: Number(el.value) }); toast('Listo'); }, 'change');

// ---------- Siri ----------
function siriHTML() {
    if (store.demo) return '<p class="hint">Disponible al iniciar sesión con tu cuenta.</p>';
    if (!Push.siriActiva()) return `<button class="btn btn-primary" data-action="ajSiriActivar">${icon('sparkle')}Configurar Siri</button>`;
    return `<p class="aviso-estado pos">${icon('check-circle')}Siri está lista</p>
        <div class="botones-fila"><button class="btn btn-soft" data-action="ajSiriActivar">${icon('repeat')}Nueva clave e instrucciones</button>
        <button class="btn btn-ghost" data-action="ajSiriOff">Desactivar</button></div>`;
}

on('ajSiriOff', async () => {
    if (!(await confirmar({ titulo: 'Desactivar Siri', texto: 'La clave actual deja de funcionar; tu atajo ya no podrá anotar pendientes.', aceptar: 'Desactivar', peligro: true }))) return;
    try { await Push.revocarSiri(); toast('Siri desactivada'); } catch (e) { toast(e.message, { tipo: 'error' }); }
});
on('ajSiriActivar', async (el) => {
    if (Push.siriActiva() && !(await confirmar({ titulo: 'Nueva clave', texto: 'La clave anterior deja de funcionar: tendrás que pegar la nueva en tu atajo.', aceptar: 'Generar' }))) return;
    el.disabled = true;
    let clave;
    try { clave = await Push.crearClaveSiri(); }
    catch (e) { toast(e.message, { tipo: 'error' }); el.disabled = false; return; }
    const url = `${Push.WORKER_URL}/pendiente`;
    const paso = (n, t) => `<li><b>${n}.</b> ${t}</li>`;
    const copiar = (t) => `<div class="copiar"><code>${escapeHtml(t)}</code><button class="btn btn-soft btn-sm" data-action="ajCopiar" data-t="${escapeHtml(t)}">${icon('copy')}Copiar</button></div>`;
    abrirHoja({
        titulo: 'Siri: "Oye Siri, pendiente"',
        html: `<div class="siri">
            <p class="hint" style="margin-top:0;"><b>Tu clave personal</b> (solo se muestra ahora; guárdala en el atajo):</p>
            ${copiar(`Bearer ${clave}`)}
            <h3>Arma el atajo</h3>
            <ol class="pasos">
                ${paso(1, 'Abre la app <b>Atajos</b> y toca <b>+</b>.')}
                ${paso(2, 'Agrega <b>Dictar texto</b> (idioma: Español).')}
                ${paso(3, 'Agrega <b>Obtener contenido de URL</b> y pega esta dirección:')}
            </ol>
            ${copiar(url)}
            <ol class="pasos" start="4">
                ${paso(4, 'En esa acción toca <b>Mostrar más</b>: Método <b>POST</b>.')}
                ${paso(5, 'En <b>Encabezados</b> agrega: clave <b>Authorization</b>, valor tu clave de arriba (empieza con "Bearer").')}
                ${paso(6, 'En <b>Cuerpo de la solicitud</b> elige <b>JSON</b> y agrega un campo de texto: clave <b>texto</b>, valor la variable <b>Texto dictado</b>.')}
                ${paso(7, 'Agrega <b>Obtener valor del diccionario</b>: clave <b>mensaje</b>.')}
                ${paso(8, 'Agrega <b>Mostrar resultado</b> con ese valor: Siri te lo dice en voz alta.')}
                ${paso(9, 'Nombra el atajo <b>Pendiente</b>. Di "Oye Siri, pendiente" y dicta, por ejemplo: "pagar la luz el viernes" o "junta con Ana mañana a las 10".')}
            </ol>
            <p class="hint">Entiende hoy, mañana, pasado mañana, días de la semana, "el 15", "el 3 de diciembre", "en 2 semanas" y horas como "a las 5", "a las 8 y media de la noche" o "17:30". Si alguien más ve tu clave, genera una nueva.</p>
        </div>`,
    });
    el.disabled = false;
});
on('ajCopiar', async (el) => {
    try { await navigator.clipboard.writeText(el.dataset.t); toast('Copiado'); }
    catch { toast('No se pudo copiar; mantén presionado el texto para copiarlo', { tipo: 'error' }); }
});
on('ajListaNombre', (el) => { const n = el.value.trim(); if (n) guardarLista({ id: el.dataset.id, nombre: n.slice(0, 40) }); }, 'change');
on('ajListaColor', (el) => guardarLista({ id: el.dataset.id, color: el.dataset.c }));
on('ajListaNueva', async (form) => {
    const nombre = form.elements.nombre.value.trim();
    if (!nombre) return;
    await guardarLista({ nombre: nombre.slice(0, 40), color: COLORES_LISTA[sel.listas().length % COLORES_LISTA.length] });
    toast('Lista agregada');
}, 'submit');
on('ajListaBorrar', async (el) => {
    const l = sel.lista(el.dataset.id);
    if (!l) return;
    if (!(await confirmar({ titulo: `Borrar "${l.nombre}"`, texto: 'Sus pendientes se conservan, sin lista.', aceptar: 'Borrar', peligro: true }))) return;
    await borrarLista(l.id);
    toast('Lista borrada');
});
