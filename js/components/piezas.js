// Piezas de HTML reutilizadas por varias pantallas.

import { sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { completarTarea, marcarSubtarea } from '../core/actions.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { toast } from './capas.js';
import { cuando, progreso, textoRepetir } from '../domain/tareas.js';
import { hoyISO } from '../domain/fechas.js';
import { tecoSVG } from './teco.js';

export const COLORES_LISTA = ['#5b3df5', '#2a78d6', '#13855c', '#d97706', '#d92d3a', '#c2185b', '#6b6585'];

export function vacioHTML(ico, texto, extra = '') {
    return `<div class="vacio">${icon(ico)}<div>${escapeHtml(texto)}</div>${extra}</div>`;
}

export function vacioTecoHTML(titulo, texto, estado = 'tranquilo') {
    return `<div class="vacio-teco">${tecoSVG(estado, { tamano: 80 })}<b>${escapeHtml(titulo)}</b><span>${escapeHtml(texto)}</span></div>`;
}

// Fila de un pendiente: casilla (con el color de su prioridad) y datos.
export function tareaHTML(t, { mostrarFecha = true, mostrarHora = true } = {}) {
    const h = hoyISO();
    const lista = t.listaId ? sel.lista(t.listaId) : null;
    const p = progreso(t);
    const meta = [];
    if (mostrarFecha && t.fecha) meta.push(`<span class="${!t.hecha && t.fecha < h ? 'atrasada' : t.fecha === h ? 'hoy' : ''}">${icon('calendar')}${escapeHtml(cuando(t))}</span>`);
    else if (mostrarHora && t.hora) meta.push(`<span>${icon('clock')}${escapeHtml(t.hora)}</span>`);
    if (lista) meta.push(`<span class="chip-lista"><i class="punto" style="--c:${escapeHtml(lista.color || COLORES_LISTA[0])}"></i>${escapeHtml(lista.nombre)}</span>`);
    if (p.total) meta.push(`<span>${icon('list')}${p.hechas}/${p.total}</span>`);
    if (t.repetir?.unidad) meta.push(`<span>${icon('repeat')}${escapeHtml(textoRepetir(t.repetir))}</span>`);
    if (t.nota) meta.push(`<span>${icon('note')}Nota</span>`);
    if (t.origen?.morralla) meta.push(`<span>${icon('coin')}Morralla</span>`);
    if (t.origen?.siri) meta.push(`<span>${icon('sparkle')}Siri</span>`);
    return `<div class="tarea ${t.hecha ? 'hecha' : ''}">
        <button class="check p${Number(t.prioridad) || 0}" data-action="tareaCheck" data-id="${escapeHtml(t.id)}" aria-label="${t.hecha ? 'Marcar como pendiente' : 'Marcar como hecho'}">${icon('check')}</button>
        <div class="tarea-body" data-action="editarTarea" data-id="${escapeHtml(t.id)}" role="button" tabindex="0">
            <div class="tarea-titulo">${escapeHtml(t.titulo)}</div>
            ${meta.length ? `<div class="tarea-meta">${meta.join('')}</div>` : ''}
        </div>
    </div>`;
}

on('tareaCheck', async (el) => {
    const t = sel.tarea(el.dataset.id);
    if (!t) return;
    const r = await completarTarea(t.id, !t.hecha);
    if (t.hecha) return toast('Pendiente reabierto', { deshacer: r.deshacer });
    toast(r.siguiente ? `¡Listo! Vuelve el ${cuando({ fecha: r.siguiente })}` : '¡Listo!', { deshacer: r.deshacer });
});
on('subCheck', (el) => marcarSubtarea(el.dataset.id, el.dataset.sub, el.dataset.hecha !== '1'));
