// Hoja para crear o editar un pendiente: título, nota, fecha y hora, lista,
// prioridad, repetición y subtareas.

import { sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { guardarTarea, borrarTarea } from '../core/actions.js';
import { nuevoId } from '../core/db.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { abrirHoja, cerrarHoja, hojaAbierta, toast } from './capas.js';
import { COLORES_LISTA } from './piezas.js';
import { PRIORIDADES, REPETICIONES } from '../domain/tareas.js';
import { hoyISO, sumarDias, aFecha } from '../domain/fechas.js';

let f = null;   // estado del formulario

// abrirTarea({ id }) edita; abrirTarea({ fecha, listaId, titulo, origen }) crea con valores.
export function abrirTarea(opts = {}) {
    const t = opts.id ? sel.tarea(opts.id) : null;
    f = {
        id: t?.id || null,
        titulo: t?.titulo || opts.titulo || '',
        nota: t?.nota || '',
        fecha: t ? (t.fecha || null) : (opts.fecha === undefined ? hoyISO() : opts.fecha),
        hora: t?.hora || opts.hora || '',
        listaId: t?.listaId || opts.listaId || null,
        prioridad: Number(t?.prioridad) || 0,
        repetir: t?.repetir || null,
        subtareas: Object.entries(t?.subtareas || {}).map(([id, s]) => ({ id, ...s })).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
        origen: t?.origen || opts.origen || null,
        hecha: !!t?.hecha, hechaEn: t?.hechaEn || null,
    };
    abrirHoja({
        titulo: f.id ? 'Editar pendiente' : 'Nuevo pendiente',
        html: '<div id="tf"></div>',
        alMontar: (hoja) => { pintar(); if (!f.id && matchMedia('(hover: hover)').matches) hoja.querySelector('#tf-titulo')?.focus(); hoja.addEventListener('keydown', teclas); },
        alCerrar: () => { f = null; },
    });
}

function proximoSabado() {
    const h = hoyISO(), d = aFecha(h).getDay();
    return sumarDias(h, d === 6 ? 7 : (6 - d));
}

function cuerpoHTML() {
    const h = hoyISO(), manana = sumarDias(h, 1), sabado = proximoSabado();
    const opcionesFecha = [[h, 'Hoy'], [manana, 'Mañana'], [sabado, 'Fin de semana'], [null, 'Algún día']];
    const otra = f.fecha && !opcionesFecha.some(([v]) => v === f.fecha);
    const chip = (accion, valor, activo, texto, extra = '') => `<button type="button" class="chip chip-sm ${activo ? 'activo' : ''}" data-action="${accion}" data-v="${escapeHtml(valor ?? '')}" ${extra}>${texto}</button>`;
    return `
        <div class="field"><input id="tf-titulo" class="tf-titulo" placeholder="¿Qué tienes que hacer?" value="${escapeHtml(f.titulo)}" data-input="tfTitulo" autocomplete="off" aria-label="Título"></div>
        <div class="field"><span class="label">Cuándo</span><div class="chips">
            ${opcionesFecha.map(([v, t]) => chip('tfFecha', v, f.fecha === v, t)).join('')}
            <label class="chip chip-sm ${otra ? 'activo' : ''}" style="position:relative;">${icon('calendar')}${otra ? escapeHtml(f.fecha.split('-').reverse().slice(0, 2).join('/')) : 'Otra'}
                <input type="date" value="${f.fecha || ''}" data-change="tfFechaInput" style="position:absolute; inset:0; opacity:0; cursor:pointer; height:auto;" aria-label="Elegir fecha"></label>
        </div></div>
        ${f.fecha ? `<div class="field"><label for="tf-hora">Hora (opcional)</label>
            <div style="display:flex; gap:8px; align-items:center;"><input id="tf-hora" type="time" value="${escapeHtml(f.hora)}" data-change="tfHora" style="max-width:160px;">
            ${f.hora ? `<button type="button" class="link" data-action="tfSinHora">Quitar hora</button>` : ''}</div></div>` : ''}
        <div class="field"><span class="label">Lista</span><div class="chips">
            ${chip('tfLista', '', !f.listaId, 'Sin lista')}
            ${sel.listas().map(l => chip('tfLista', l.id, f.listaId === l.id, `<i class="punto" style="--c:${escapeHtml(l.color || COLORES_LISTA[0])}"></i>${escapeHtml(l.nombre)}`)).join('')}
        </div></div>
        <div class="field"><span class="label">Prioridad</span><div class="chips">
            ${PRIORIDADES.map(p => chip('tfPrioridad', p.valor, f.prioridad === p.valor, `${p.valor ? icon('flag', `prio prio-${p.valor}`) : ''}${p.nombre}`)).join('')}
        </div></div>
        <div class="field"><span class="label">Repetir</span><div class="chips">
            ${chip('tfRepetir', '', !f.repetir, 'No se repite')}
            ${Object.entries(REPETICIONES).map(([k, r]) => chip('tfRepetir', k, f.repetir?.unidad === k, r.nombre)).join('')}
        </div>${f.repetir ? `<span class="hint">Al marcarlo como hecho, vuelve a aparecer en su siguiente fecha.</span>` : ''}</div>
        <div class="field"><span class="label">Subtareas</span><div class="subtareas" id="tf-subs">${subtareasHTML()}</div></div>
        <div class="field"><label for="tf-nota">Nota</label><textarea id="tf-nota" class="tf-nota" placeholder="Detalles, ligas, lo que quieras recordar" data-input="tfNota">${escapeHtml(f.nota)}</textarea></div>
        <div class="hoja-foot">
            ${f.id ? `<button type="button" class="btn btn-danger-soft" data-action="tfBorrar" style="flex:0 0 auto;" aria-label="Borrar">${icon('trash')}</button>` : ''}
            <button type="button" class="btn btn-primary" data-action="tfGuardar" style="flex:1;">Guardar</button>
        </div>`;
}

function subtareasHTML() {
    return `${f.subtareas.map((s, i) => `<div class="subtarea ${s.hecha ? 'hecha' : ''}">
            <button type="button" class="check ${s.hecha ? '' : ''}" data-action="tfSubCheck" data-i="${i}" aria-label="Marcar subtarea" style="${s.hecha ? 'background:var(--accent);border-color:var(--accent);color:var(--on-accent)' : ''}">${icon('check')}</button>
            <input value="${escapeHtml(s.texto)}" data-input="tfSubTexto" data-i="${i}" aria-label="Subtarea ${i + 1}">
            <button type="button" class="icon-btn" data-action="tfSubQuitar" data-i="${i}" aria-label="Quitar subtarea">${icon('x')}</button></div>`).join('')}
        <button type="button" class="link" data-action="tfSubAgregar" style="align-self:flex-start;">${icon('plus')}Agregar subtarea</button>`;
}

function pintar() { const el = hojaAbierta()?.querySelector('#tf'); if (el) el.innerHTML = cuerpoHTML(); }
const pintarSubs = () => { const el = hojaAbierta()?.querySelector('#tf-subs'); if (el) el.innerHTML = subtareasHTML(); };

function teclas(e) {
    if (e.key === 'Enter' && e.target.id === 'tf-titulo') { e.preventDefault(); guardar(); }
    if (e.key === 'Enter' && e.target.dataset.input === 'tfSubTexto') { e.preventDefault(); agregarSub(); }
}

function agregarSub() {
    f.subtareas.push({ id: nuevoId(), texto: '', hecha: false });
    pintarSubs();
    const inputs = hojaAbierta()?.querySelectorAll('[data-input="tfSubTexto"]');
    inputs?.[inputs.length - 1]?.focus();
}

async function guardar() {
    const titulo = f.titulo.trim();
    if (!titulo) { toast('Escribe qué tienes que hacer', { tipo: 'error' }); hojaAbierta()?.querySelector('#tf-titulo')?.focus(); return; }
    const subs = f.subtareas.filter(s => s.texto.trim());
    const t = {
        titulo, nota: f.nota.trim() || null, fecha: f.fecha || null, hora: (f.fecha && f.hora) || null,
        listaId: f.listaId || null, prioridad: f.prioridad || 0, repetir: f.repetir || null,
        subtareas: subs.length ? Object.fromEntries(subs.map((s, i) => [s.id, { texto: s.texto.trim(), hecha: !!s.hecha, orden: i }])) : null,
        origen: f.origen || null, hecha: f.hecha, hechaEn: f.hechaEn,
    };
    if (f.id) t.id = f.id;
    const nuevo = !f.id;
    await guardarTarea(t);
    cerrarHoja();
    toast(nuevo ? 'Pendiente agregado' : 'Pendiente guardado');
}

on('tfTitulo', (el) => { f.titulo = el.value; }, 'input');
on('tfNota', (el) => { f.nota = el.value; }, 'input');
on('tfFecha', (el) => { f.fecha = el.dataset.v || null; if (!f.fecha) f.hora = ''; pintar(); });
on('tfFechaInput', (el) => { f.fecha = el.value || null; pintar(); }, 'change');
on('tfHora', (el) => { f.hora = el.value; pintar(); }, 'change');
on('tfSinHora', () => { f.hora = ''; pintar(); });
on('tfLista', (el) => { f.listaId = el.dataset.v || null; pintar(); });
on('tfPrioridad', (el) => { f.prioridad = Number(el.dataset.v) || 0; pintar(); });
on('tfRepetir', (el) => { f.repetir = el.dataset.v ? { cada: 1, unidad: el.dataset.v } : null; if (f.repetir && !f.fecha) f.fecha = hoyISO(); pintar(); });
on('tfSubAgregar', () => agregarSub());
on('tfSubTexto', (el) => { f.subtareas[Number(el.dataset.i)].texto = el.value; }, 'input');
on('tfSubCheck', (el) => { const s = f.subtareas[Number(el.dataset.i)]; s.hecha = !s.hecha; pintarSubs(); });
on('tfSubQuitar', (el) => { f.subtareas.splice(Number(el.dataset.i), 1); pintarSubs(); });
on('tfGuardar', () => guardar());
on('tfBorrar', async () => {
    const id = f.id;
    cerrarHoja();
    const deshacer = await borrarTarea(id);
    toast('Pendiente borrado', { deshacer });
});
