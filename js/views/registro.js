// Editor de una nota: título, texto que se guarda solo, tipo, fijar,
// etiquetas (#así), dictado por voz y listas con casillas que se tachan.

import { sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { guardarNota, borrarNota, nuevoId } from '../core/actions.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { toast, confirmar } from '../components/capas.js';
import { TIPOS_NOTA, etiquetasDe, contarPalabras, agregarDictado, itemsDe, lineasALista, listaATexto, dictadoALista } from '../domain/notas.js';
import { iniciarDictado, dictadoDisponible, detenerDictado } from '../lib/dictado.js';
import { cuandoNota } from './registros.js';

let ed = null;        // { id, nuevo, tipo, items (solo listas), timer }
let detener = null;   // detiene el dictado en curso

export const titulo = () => ({ titulo: ed?.nuevo ? 'Nueva nota' : 'Nota', atras: '#/registros' });

// Mientras el editor está abierto no se repinta con cada guardado (se perdería el cursor).
export const conservar = () => !!ed && !!(document.getElementById('reg-texto') || document.getElementById('reg-lista'));

const esLista = () => ed?.tipo === 'lista';

export function alEntrar(params) {
    guardarYa();
    if (params.id === 'nuevo') {
        const id = nuevoId();
        ed = { id, nuevo: true, tipo: TIPOS_NOTA[params.tipo] ? params.tipo : 'nota', dictar: params.dictar === '1', items: [] };
        history.replaceState(null, '', `#/registro/${id}`);
    } else {
        const n = sel.nota(params.id);
        ed = { id: params.id, nuevo: !n, tipo: n?.tipo || 'nota', items: itemsDe(n).map(({ id, texto, hecho }) => ({ id, texto, hecho })) };
    }
}

export function render({ id }) {
    if (!ed || (id !== 'nuevo' && ed.id !== id)) alEntrar({ id });
    const n = sel.nota(ed.id) || { titulo: '', contenido: '', tipo: ed.tipo };
    const t = TIPOS_NOTA[ed.tipo] || TIPOS_NOTA.nota;
    return `<div class="editor">
        <div class="editor-barra">
            <div class="seg editor-tipos">${Object.entries(TIPOS_NOTA).map(([k, x]) => `<button class="${ed.tipo === k ? 'activo' : ''}" data-action="regTipo" data-v="${k}">${x.nombre}</button>`).join('')}</div>
            <button class="icon-btn ${n.fijada ? 'activo-pin' : ''}" data-action="regFijar" aria-label="${n.fijada ? 'Quitar de fijadas' : 'Fijar arriba'}" title="${n.fijada ? 'Quitar de fijadas' : 'Fijar arriba'}">${icon('star')}</button>
            ${sel.nota(ed.id) ? `<button class="icon-btn" data-action="regBorrarNota" aria-label="Borrar nota">${icon('trash')}</button>` : ''}
        </div>
        <input id="reg-titulo" class="editor-titulo" placeholder="${esLista() ? 'Nombre de la lista' : 'Título (opcional)'}" value="${escapeHtml(n.titulo || '')}" data-input="regEscribir" autocomplete="off" aria-label="Título">
        ${esLista()
            ? `<div id="reg-lista" class="checklist">${listaHTML()}</div>`
            : `<textarea id="reg-texto" class="editor-texto" placeholder="${escapeHtml(t.vacio)}" data-input="regEscribir" aria-label="Texto">${escapeHtml(n.contenido || '')}</textarea>`}
        <p id="reg-parcial" class="editor-parcial" hidden></p>
        <div id="reg-etiquetas" class="chips">${etiquetasHTML(n)}</div>
        <div class="editor-pie">
            <button class="btn ${ed.tipo === 'transcripcion' ? 'btn-primary' : 'btn-soft'} editor-mic" data-action="regDictar">${icon('sparkle')}<span>Dictar</span></button>
            <span id="reg-estado" class="hint">${estadoTexto(n)}</span>
        </div>
    </div>`;
}

// ---------- Lista con casillas ----------
function listaHTML() {
    const hechos = ed.items.filter(x => x.hecho && x.texto.trim()).length;
    const total = ed.items.filter(x => x.texto.trim()).length;
    return `${ed.items.map((x, i) => `<div class="ck-item ${x.hecho ? 'hecho' : ''}">
            <button class="ck-check" data-action="ckMarcar" data-i="${i}" aria-label="${x.hecho ? 'Desmarcar' : 'Marcar'}" aria-pressed="${x.hecho}">${icon('check')}</button>
            <input class="ck-texto" value="${escapeHtml(x.texto)}" data-input="ckTexto" data-i="${i}" aria-label="Elemento ${i + 1}" autocomplete="off">
            <button class="icon-btn ck-quitar" data-action="ckQuitar" data-i="${i}" aria-label="Quitar elemento">${icon('x')}</button>
        </div>`).join('')}
        <div class="ck-nuevo"><span>${icon('plus')}</span><input id="ck-nuevo" placeholder="Agregar elemento" autocomplete="off" aria-label="Agregar elemento" enterkeyhint="next"></div>
        ${total ? `<div class="ck-acciones"><span class="hint">${hechos} de ${total} marcados</span>
            ${hechos ? `<button class="link" data-action="ckDesmarcar">Desmarcar todo</button><button class="link neg" data-action="ckBorrarHechos">Borrar marcados</button>` : ''}</div>` : ''}`;
}

function pintarLista(enfocar) {
    const el = document.getElementById('reg-lista');
    if (!el) return;
    el.innerHTML = listaHTML();
    if (enfocar === 'nuevo') el.querySelector('#ck-nuevo')?.focus();
    else if (enfocar != null) { const inp = el.querySelector(`.ck-texto[data-i="${enfocar}"]`); inp?.focus(); inp?.setSelectionRange(inp.value.length, inp.value.length); }
}

function agregarItems(textos, enfocar = 'nuevo') {
    textos.map(t => t.trim()).filter(Boolean).forEach(texto => ed.items.push({ id: nuevoId(), texto, hecho: false }));
    pintarLista(enfocar);
    programarGuardado();
}

const itemsParaGuardar = () => Object.fromEntries(ed.items.filter(x => x.texto.trim()).map((x, i) => [x.id, { texto: x.texto.trim(), hecho: !!x.hecho, orden: i }]));

// ---------- Estado y guardado ----------
const etiquetasHTML = (n) => etiquetasDe(n).map(e => `<a class="chip chip-sm chip-outline" href="#/registros?etiqueta=${encodeURIComponent(e)}">#${escapeHtml(e)}</a>`).join('');
function estadoTexto(n) {
    const guardado = n.editadoEn ? `Guardado ${escapeHtml(cuandoNota(n))}` : '';
    if (esLista()) return guardado;
    return `${contarPalabras(n.contenido)} palabras${guardado ? ` · ${guardado}` : ''}`;
}

export function montar(el) {
    const ta = el.querySelector('#reg-texto');
    if (ta) crecer(ta);
    if (!ta && !el.querySelector('#reg-lista')) return;
    if (ed?.dictar) { ed.dictar = false; setTimeout(() => el.querySelector('[data-action="regDictar"]')?.click(), 300); }
    else if (ed?.nuevo && matchMedia('(hover: hover)').matches) (ta || el.querySelector('#ck-nuevo'))?.focus();
}

function crecer(ta) { ta.style.height = 'auto'; ta.style.height = `${Math.max(220, ta.scrollHeight + 4)}px`; }

// Guardado automático: medio segundo después del último cambio.
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
    if (titulo === null) return;
    const lista = esLista();
    const contenido = lista ? '' : (document.getElementById('reg-texto')?.value ?? null);
    if (contenido === null) return;
    const items = lista ? itemsParaGuardar() : null;
    const previo = sel.nota(ed.id);
    // Un registro nuevo vacío no se guarda.
    if (!previo && !titulo.trim() && !contenido.trim() && !(items && Object.keys(items).length)) return;
    if (previo && previo.titulo === titulo && (previo.contenido || '') === contenido && previo.tipo === ed.tipo
        && JSON.stringify(previo.items || null) === JSON.stringify(items && Object.keys(items).length ? items : null)) return;
    const id = ed.id;
    ed.nuevo = false;
    guardarNota(id, { titulo, contenido, tipo: ed.tipo, items: items && Object.keys(items).length ? items : null }).then(() => {
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

// Repinta el editor completo (al cambiar entre texto y lista).
function repintarEditor() {
    const v = document.getElementById('vista');
    if (!v || !ed) return;
    v.innerHTML = render({ id: ed.id });
    montar(v);
}

on('regEscribir', (el) => { if (el.id === 'reg-texto') crecer(el); programarGuardado(); }, 'input');
on('regTipo', (el) => {
    const antes = ed.tipo, despues = el.dataset.v;
    if (antes === despues) return;
    // Texto ↔ lista: cada renglón se vuelve un elemento (y al revés).
    if (despues === 'lista' && antes !== 'lista') {
        const texto = document.getElementById('reg-texto')?.value || '';
        ed.items = lineasALista(texto).map(x => ({ id: nuevoId(), ...x }));
        ed.tipo = despues; guardarYa(); repintarEditor(); return;
    }
    if (antes === 'lista' && despues !== 'lista') {
        const titulo = document.getElementById('reg-titulo')?.value || '';
        const contenido = listaATexto(ed.items);
        ed.tipo = despues; ed.items = [];
        if (sel.nota(ed.id) || contenido || titulo.trim()) guardarNota(ed.id, { titulo, contenido, tipo: despues, items: null }).then(repintarEditor);
        else repintarEditor();
        return;
    }
    ed.tipo = despues;
    document.querySelectorAll('.editor-tipos button').forEach(b => b.classList.toggle('activo', b.dataset.v === ed.tipo));
    document.getElementById('reg-texto').placeholder = TIPOS_NOTA[ed.tipo].vacio;
    document.querySelector('.editor-mic')?.classList.toggle('btn-primary', ed.tipo === 'transcripcion');
    document.querySelector('.editor-mic')?.classList.toggle('btn-soft', ed.tipo !== 'transcripcion');
    guardarYa();
});

// ---------- Acciones de la lista ----------
on('ckMarcar', (el) => {
    const x = ed.items[Number(el.dataset.i)];
    if (!x) return;
    x.hecho = !x.hecho;
    pintarLista();
    programarGuardado();
});
on('ckTexto', (el) => { const x = ed.items[Number(el.dataset.i)]; if (x) { x.texto = el.value; programarGuardado(); } }, 'input');
on('ckQuitar', (el) => { ed.items.splice(Number(el.dataset.i), 1); pintarLista(); programarGuardado(); });
on('ckDesmarcar', () => { ed.items.forEach(x => { x.hecho = false; }); pintarLista(); programarGuardado(); });
on('ckBorrarHechos', async () => {
    const n = ed.items.filter(x => x.hecho).length;
    if (!(await confirmar({ titulo: 'Borrar marcados', texto: `Se quitan ${n} elemento${n === 1 ? '' : 's'} marcado${n === 1 ? '' : 's'} de la lista.`, aceptar: 'Borrar', peligro: true }))) return;
    ed.items = ed.items.filter(x => !x.hecho);
    pintarLista();
    programarGuardado();
});

// Teclado en la lista: Enter agrega el siguiente elemento; borrar en uno vacío lo quita.
document.addEventListener('keydown', (e) => {
    if (!esLista() || !e.target.closest?.('#reg-lista')) return;
    const nuevo = e.target.id === 'ck-nuevo';
    if (e.key === 'Enter') {
        e.preventDefault();
        if (nuevo) { const v = e.target.value; e.target.value = ''; if (v.trim()) agregarItems([v]); return; }
        const i = Number(e.target.dataset.i);
        ed.items.splice(i + 1, 0, { id: nuevoId(), texto: '', hecho: false });
        pintarLista(i + 1);
        return;
    }
    if (e.key === 'Backspace' && !nuevo && !e.target.value) {
        e.preventDefault();
        const i = Number(e.target.dataset.i);
        ed.items.splice(i, 1);
        pintarLista(i > 0 ? i - 1 : 'nuevo');
        programarGuardado();
    }
});
// En iPhone el teclado puede no mandar Enter: al salir del campo nuevo, se agrega lo escrito.
document.addEventListener('focusout', (e) => {
    if (e.target.id === 'ck-nuevo' && e.target.value.trim() && esLista()) { const v = e.target.value; e.target.value = ''; agregarItems([v], null); }
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
    if (!(await confirmar({ titulo: 'Borrar nota', texto: 'Se borra esta nota.', aceptar: 'Borrar', peligro: true }))) return;
    const id = ed.id;
    detener?.(); detener = null;
    ed = null;
    const deshacer = await borrarNota(id);
    location.hash = '#/registros';
    toast('Nota borrada', { deshacer });
});

on('regDictar', (el) => {
    if (detener) { detener(); detener = null; return; }
    if (!dictadoDisponible()) return toast('Tu navegador no permite dictar aquí. Usa el micrófono del teclado.', { tipo: 'error', duracion: 6000 });
    const parcial = document.getElementById('reg-parcial');
    const pintarBoton = (activo) => { el.classList.toggle('grabando', activo); el.querySelector('span').textContent = activo ? 'Detener' : 'Dictar'; };
    pintarBoton(true);
    detener = iniciarDictado({
        // En una lista, lo dictado se vuelve elementos ("leche, huevo y pan").
        alTexto: (texto) => {
            if (esLista()) { agregarItems(dictadoALista(texto), null); return; }
            const ta = document.getElementById('reg-texto');
            ta.value = agregarDictado(ta.value, texto); crecer(ta); programarGuardado();
        },
        alParcial: (texto) => { if (parcial) { parcial.textContent = texto; parcial.hidden = !texto; } },
        alTerminar: (error) => {
            pintarBoton(false); detener = null;
            if (error === 'not-allowed' || error === 'service-not-allowed') toast('Permite el micrófono para dictar (Configuración › Safari › Micrófono).', { tipo: 'error', duracion: 7000 });
            else if (error && error !== 'no-disponible') toast('Se detuvo el dictado', { tipo: 'error' });
        },
    });
});

export { detenerDictado };
