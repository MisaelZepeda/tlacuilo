// Editor de un registro: título, texto que se guarda solo, tipo, fijar,
// etiquetas (#así) y dictado por voz.

import { sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { guardarNota, borrarNota, nuevoId } from '../core/actions.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { toast, confirmar } from '../components/capas.js';
import { TIPOS_NOTA, etiquetasDe, contarPalabras, agregarDictado } from '../domain/notas.js';
import { iniciarDictado, dictadoDisponible, detenerDictado } from '../lib/dictado.js';
import { cuandoNota } from './registros.js';

let ed = null;        // { id, nuevo, tipo, guardado, timer }
let detener = null;   // detiene el dictado en curso

export const titulo = () => ({ titulo: ed?.nuevo ? 'Nuevo registro' : 'Registro', atras: '#/registros' });

// Mientras el editor está abierto no se repinta con cada guardado (se perdería el cursor).
export const conservar = () => !!ed && !!document.getElementById('reg-texto');

export function alEntrar(params) {
    guardarYa();
    if (params.id === 'nuevo') {
        const id = nuevoId();
        ed = { id, nuevo: true, tipo: TIPOS_NOTA[params.tipo] ? params.tipo : 'nota', dictar: params.dictar === '1' };
        history.replaceState(null, '', `#/registro/${id}`);
    } else ed = { id: params.id, nuevo: !sel.nota(params.id), tipo: sel.nota(params.id)?.tipo || 'nota' };
}

export function render({ id }) {
    if (!ed || (id !== 'nuevo' && ed.id !== id)) alEntrar({ id });
    const n = sel.nota(ed.id) || { titulo: '', contenido: '', tipo: ed.tipo };
    const t = TIPOS_NOTA[ed.tipo] || TIPOS_NOTA.nota;
    return `<div class="editor">
        <div class="editor-barra">
            <div class="seg editor-tipos">${Object.entries(TIPOS_NOTA).map(([k, x]) => `<button class="${ed.tipo === k ? 'activo' : ''}" data-action="regTipo" data-v="${k}">${x.nombre}</button>`).join('')}</div>
            <button class="icon-btn ${n.fijada ? 'activo-pin' : ''}" data-action="regFijar" aria-label="${n.fijada ? 'Quitar de fijadas' : 'Fijar arriba'}" title="${n.fijada ? 'Quitar de fijadas' : 'Fijar arriba'}">${icon('star')}</button>
            ${sel.nota(ed.id) ? `<button class="icon-btn" data-action="regBorrarNota" aria-label="Borrar registro">${icon('trash')}</button>` : ''}
        </div>
        <input id="reg-titulo" class="editor-titulo" placeholder="Título (opcional)" value="${escapeHtml(n.titulo || '')}" data-input="regEscribir" autocomplete="off" aria-label="Título">
        <textarea id="reg-texto" class="editor-texto" placeholder="${escapeHtml(t.vacio)}" data-input="regEscribir" aria-label="Texto">${escapeHtml(n.contenido || '')}</textarea>
        <p id="reg-parcial" class="editor-parcial" hidden></p>
        <div id="reg-etiquetas" class="chips">${etiquetasHTML(n)}</div>
        <div class="editor-pie">
            <button class="btn ${ed.tipo === 'transcripcion' ? 'btn-primary' : 'btn-soft'} editor-mic" data-action="regDictar">${icon('sparkle')}<span>Dictar</span></button>
            <span id="reg-estado" class="hint">${estadoTexto(n)}</span>
        </div>
    </div>`;
}

const etiquetasHTML = (n) => etiquetasDe(n).map(e => `<a class="chip chip-sm chip-outline" href="#/registros?etiqueta=${encodeURIComponent(e)}">#${escapeHtml(e)}</a>`).join('');
const estadoTexto = (n) => `${contarPalabras(n.contenido)} palabras${n.editadoEn ? ` · Guardado ${escapeHtml(cuandoNota(n))}` : ''}`;

export function montar(el) {
    const ta = el.querySelector('#reg-texto');
    if (!ta) return;
    crecer(ta);
    if (ed?.dictar) { ed.dictar = false; setTimeout(() => el.querySelector('[data-action="regDictar"]')?.click(), 300); }
    else if (ed?.nuevo && matchMedia('(hover: hover)').matches) ta.focus();
}

function crecer(ta) { ta.style.height = 'auto'; ta.style.height = `${Math.max(220, ta.scrollHeight + 4)}px`; }

// Guardado automático: medio segundo después de dejar de escribir.
function programarGuardado() {
    clearTimeout(ed.timer);
    ed.timer = setTimeout(guardarYa, 500);
    const estado = document.getElementById('reg-estado');
    if (estado) estado.textContent = 'Guardando…';
}

function guardarYa() {
    if (!ed) return;
    clearTimeout(ed.timer);
    const titulo = document.getElementById('reg-titulo')?.value ?? null;
    const contenido = document.getElementById('reg-texto')?.value ?? null;
    if (titulo === null || contenido === null) return;
    const existe = !!sel.nota(ed.id);
    // Una nota nueva vacía no se guarda.
    if (!existe && !titulo.trim() && !contenido.trim()) return;
    const previo = sel.nota(ed.id);
    if (existe && previo.titulo === titulo && previo.contenido === contenido && previo.tipo === ed.tipo) return;
    const id = ed.id;
    ed.nuevo = false;
    guardarNota(id, { titulo, contenido, tipo: ed.tipo }).then(() => {
        if (ed?.id !== id) return;
        const n = sel.nota(id);
        const estado = document.getElementById('reg-estado');
        if (n && estado) estado.textContent = estadoTexto(n);
        const tags = document.getElementById('reg-etiquetas');
        if (n && tags) tags.innerHTML = etiquetasHTML(n);
    }).catch(() => toast('No se pudo guardar', { tipo: 'error' }));
}

// Al salir del editor: guardar lo pendiente y dejar de dictar.
window.addEventListener('hashchange', () => {
    if (!location.hash.startsWith('#/registro/')) { detener?.(); detener = null; guardarYa(); ed = null; }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarYa(); });

on('regEscribir', (el) => { if (el.id === 'reg-texto') crecer(el); programarGuardado(); }, 'input');
on('regTipo', (el) => {
    ed.tipo = el.dataset.v;
    document.querySelectorAll('.editor-tipos button').forEach(b => b.classList.toggle('activo', b.dataset.v === ed.tipo));
    document.getElementById('reg-texto').placeholder = TIPOS_NOTA[ed.tipo].vacio;
    document.querySelector('.editor-mic')?.classList.toggle('btn-primary', ed.tipo === 'transcripcion');
    document.querySelector('.editor-mic')?.classList.toggle('btn-soft', ed.tipo !== 'transcripcion');
    guardarYa();
});
on('regFijar', async (el) => {
    guardarYa();
    if (!sel.nota(ed.id)) return toast('Escribe algo antes de fijarlo', { tipo: 'error' });
    const fijada = !sel.nota(ed.id).fijada;
    await guardarNota(ed.id, { fijada });
    el.classList.toggle('activo-pin', fijada);
    toast(fijada ? 'Fijado arriba' : 'Quitado de fijadas');
});
on('regBorrarNota', async () => {
    if (!(await confirmar({ titulo: 'Borrar registro', texto: 'Se borra este registro.', aceptar: 'Borrar', peligro: true }))) return;
    const id = ed.id;
    detener?.(); detener = null;
    ed = null;
    const deshacer = await borrarNota(id);
    location.hash = '#/registros';
    toast('Registro borrado', { deshacer });
});

on('regDictar', (el) => {
    if (detener) { detener(); detener = null; return; }
    if (!dictadoDisponible()) return toast('Tu navegador no permite dictar aquí. Usa el micrófono del teclado.', { tipo: 'error', duracion: 6000 });
    const ta = document.getElementById('reg-texto');
    const parcial = document.getElementById('reg-parcial');
    const pintarBoton = (on) => { el.classList.toggle('grabando', on); el.querySelector('span').textContent = on ? 'Detener' : 'Dictar'; };
    pintarBoton(true);
    detener = iniciarDictado({
        alTexto: (texto) => { ta.value = agregarDictado(ta.value, texto); crecer(ta); programarGuardado(); },
        alParcial: (texto) => { if (parcial) { parcial.textContent = texto; parcial.hidden = !texto; } },
        alTerminar: (error) => {
            pintarBoton(false); detener = null;
            if (error === 'not-allowed' || error === 'service-not-allowed') toast('Permite el micrófono para dictar (Configuración › Safari › Micrófono).', { tipo: 'error', duracion: 7000 });
            else if (error && error !== 'no-disponible') toast('Se detuvo el dictado', { tipo: 'error' });
        },
    });
});

export { detenerDictado };
