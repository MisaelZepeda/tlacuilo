// Hoja para crear o editar un evento de la agenda (cita, junta, cumpleaños…),
// y el selector del botón + (pendiente o evento).

import { sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { guardarEvento, borrarEvento } from '../core/actions.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { abrirHoja, cerrarHoja, hojaAbierta, toast } from './capas.js';
import { abrirTarea } from './tarea-form.js';
import { hoyISO } from '../domain/fechas.js';

export const COLORES_EVENTO = ['#5b3df5', '#2a78d6', '#13855c', '#d97706', '#d92d3a', '#c2185b'];
const REPETIR = [['', 'No se repite'], ['semana', 'Cada semana'], ['mes', 'Cada mes'], ['anio', 'Cada año']];

let f = null;

// Una hora después de la de inicio (para sugerir la de fin).
const masUnaHora = (h) => { const [a, b] = h.split(':').map(Number); return `${String(Math.min(23, a + 1)).padStart(2, '0')}:${String(b).padStart(2, '0')}`; };

// abrirEvento({ id }) edita; abrirEvento({ fecha, horaInicio }) crea.
export function abrirEvento(opts = {}) {
    const e = opts.id ? sel.evento(opts.id) : null;
    const horaInicio = e?.horaInicio || opts.horaInicio || '';
    f = {
        id: e?.id || null,
        titulo: e?.titulo || '',
        fecha: e?.fecha || opts.fecha || hoyISO(),
        todoElDia: e ? !!e.todoElDia : !horaInicio && !!opts.todoElDia,
        horaInicio, horaFin: e?.horaFin || (horaInicio ? masUnaHora(horaInicio) : ''),
        lugar: e?.lugar || '', nota: e?.nota || '',
        color: e?.color || COLORES_EVENTO[0],
        repetir: e?.repetir?.unidad || '',
    };
    abrirHoja({
        titulo: f.id ? 'Editar evento' : 'Nuevo evento',
        html: '<div id="ef"></div>',
        alMontar: (hoja) => { pintar(); if (!f.id && matchMedia('(hover: hover)').matches) hoja.querySelector('#ef-titulo')?.focus(); },
        alCerrar: () => { f = null; },
    });
}

function cuerpoHTML() {
    return `
        <div class="field"><input id="ef-titulo" class="tf-titulo" placeholder="¿Qué evento es?" value="${escapeHtml(f.titulo)}" data-input="efTitulo" autocomplete="off" aria-label="Título"></div>
        <div class="field"><label for="ef-fecha">Fecha</label><input id="ef-fecha" type="date" value="${f.fecha}" data-change="efFecha"></div>
        <label class="check-fav"><input type="checkbox" data-change="efTodoDia" ${f.todoElDia ? 'checked' : ''}> Todo el día</label>
        ${f.todoElDia ? '' : `<div class="tf-fila">
            <div class="field"><label for="ef-ini">Empieza</label><input id="ef-ini" type="time" value="${escapeHtml(f.horaInicio)}" data-change="efIni"></div>
            <div class="field"><label for="ef-fin">Termina</label><input id="ef-fin" type="time" value="${escapeHtml(f.horaFin)}" data-change="efFin"></div></div>`}
        <div class="field"><label for="ef-lugar">Lugar (opcional)</label><input id="ef-lugar" placeholder="Dirección, sala, liga de la llamada" value="${escapeHtml(f.lugar)}" data-input="efLugar" autocomplete="off"></div>
        <div class="field"><span class="label">Repetir</span><div class="chips">${REPETIR.map(([v, t]) => `<button type="button" class="chip chip-sm ${f.repetir === v ? 'activo' : ''}" data-action="efRepetir" data-v="${v}">${t}</button>`).join('')}</div></div>
        <div class="field"><span class="label">Color</span><div class="colores">${COLORES_EVENTO.map(c => `<button type="button" class="color ${f.color === c ? 'activo' : ''}" style="--c:${c}" data-action="efColor" data-c="${c}" aria-label="Color"></button>`).join('')}</div></div>
        <div class="field"><label for="ef-nota">Nota</label><textarea id="ef-nota" class="tf-nota" placeholder="Qué llevar, con quién, detalles" data-input="efNota">${escapeHtml(f.nota)}</textarea></div>
        <div class="hoja-foot">
            ${f.id ? `<button type="button" class="btn btn-danger-soft" data-action="efBorrar" style="flex:0 0 auto;" aria-label="Borrar">${icon('trash')}</button>` : ''}
            <button type="button" class="btn btn-primary" data-action="efGuardar" style="flex:1;">Guardar</button>
        </div>`;
}

function pintar() { const el = hojaAbierta()?.querySelector('#ef'); if (el) el.innerHTML = cuerpoHTML(); }

async function guardar() {
    const titulo = f.titulo.trim();
    if (!titulo) { toast('Escribe el nombre del evento', { tipo: 'error' }); return; }
    if (!f.fecha) { toast('Elige la fecha', { tipo: 'error' }); return; }
    if (!f.todoElDia && f.horaInicio && f.horaFin && f.horaFin < f.horaInicio) { toast('La hora de fin es antes que la de inicio', { tipo: 'error' }); return; }
    const e = {
        titulo, fecha: f.fecha, todoElDia: f.todoElDia || !f.horaInicio,
        horaInicio: f.todoElDia ? null : (f.horaInicio || null), horaFin: f.todoElDia ? null : (f.horaFin || null),
        lugar: f.lugar.trim() || null, nota: f.nota.trim() || null, color: f.color,
        repetir: f.repetir ? { unidad: f.repetir, cada: 1 } : null,
    };
    if (f.id) e.id = f.id;
    const nuevo = !f.id;
    await guardarEvento(e);
    cerrarHoja();
    toast(nuevo ? 'Evento agregado' : 'Evento guardado');
}

on('efTitulo', (el) => { f.titulo = el.value; }, 'input');
on('efLugar', (el) => { f.lugar = el.value; }, 'input');
on('efNota', (el) => { f.nota = el.value; }, 'input');
on('efFecha', (el) => { f.fecha = el.value; }, 'change');
on('efTodoDia', (el) => { f.todoElDia = el.checked; if (!f.todoElDia && !f.horaInicio) { f.horaInicio = '09:00'; f.horaFin = '10:00'; } pintar(); }, 'change');
on('efIni', (el) => { const antes = f.horaInicio; f.horaInicio = el.value; if (!f.horaFin || f.horaFin === masUnaHora(antes || '00:00') || f.horaFin < f.horaInicio) f.horaFin = el.value ? masUnaHora(el.value) : ''; pintar(); }, 'change');
on('efFin', (el) => { f.horaFin = el.value; }, 'change');
on('efRepetir', (el) => { f.repetir = el.dataset.v; pintar(); });
on('efColor', (el) => { f.color = el.dataset.c; pintar(); });
on('efGuardar', () => guardar());
on('efBorrar', async () => {
    const id = f.id;
    const repite = !!sel.evento(id)?.repetir;
    cerrarHoja();
    const deshacer = await borrarEvento(id);
    toast(repite ? 'Evento borrado (todas sus repeticiones)' : 'Evento borrado', { deshacer });
});

// ---------- Botón +: ¿pendiente o evento? ----------
export function abrirNuevo({ fecha } = {}) {
    abrirHoja({
        titulo: 'Agregar',
        html: `<div class="nuevo-opciones">
            <button class="nuevo-opcion" data-action="nuevoTipo" data-t="tarea" data-f="${fecha || ''}"><span class="mas-ico">${icon('check-circle')}</span><span><b>Pendiente</b><small>Algo que tienes que hacer</small></span></button>
            <button class="nuevo-opcion" data-action="nuevoTipo" data-t="evento" data-f="${fecha || ''}"><span class="mas-ico">${icon('calendar')}</span><span><b>Evento</b><small>Cita, junta o algo con fecha y hora</small></span></button>
            <button class="nuevo-opcion" data-action="nuevoTipo" data-t="registro"><span class="mas-ico">${icon('note')}</span><span><b>Registro</b><small>Nota, apunte o dictado</small></span></button>
        </div>`,
    });
}
on('nuevoTipo', (el) => {
    const fecha = el.dataset.f || undefined;
    cerrarHoja();
    if (el.dataset.t === 'registro') location.hash = '#/registro/nuevo';
    else if (el.dataset.t === 'evento') abrirEvento({ fecha });
    else abrirTarea(fecha ? { fecha } : {});
});
