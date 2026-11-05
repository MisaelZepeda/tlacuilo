// Todas las escrituras pasan por aquí (rutas relativas a Usuarios/{uid}/agenda).

import { store } from './store.js';
import { actualizar, nuevoId } from './db.js';
import { siguienteFecha } from '../domain/tareas.js';
import { hoyISO } from '../domain/fechas.js';

const agenda = () => store.agenda;

// ---------- Pendientes ----------
export function guardarTarea(t) {
    const id = t.id || nuevoId();
    const previo = agenda().tareas[id];
    const registro = { ...t, id: undefined, creadoEn: previo?.creadoEn || Date.now() };
    return actualizar({ [`tareas/${id}`]: registro }).then(() => id);
}

// Devuelve una función para deshacer el borrado.
export async function borrarTarea(id) {
    const previo = agenda().tareas[id];
    await actualizar({ [`tareas/${id}`]: null });
    return () => actualizar({ [`tareas/${id}`]: { ...previo, id: undefined } });
}

// Completar. Si se repite, no se marca hecha: avanza a su siguiente fecha y
// reinicia sus subtareas. Devuelve { siguiente } y una función para deshacer.
export async function completarTarea(id, hecha = true) {
    const t = agenda().tareas[id];
    if (!t) return {};
    const previo = { ...t, id: undefined };
    const deshacer = () => actualizar({ [`tareas/${id}`]: previo });
    if (hecha && t.repetir?.unidad) {
        const siguiente = siguienteFecha(t.fecha || hoyISO(), t.repetir);
        const subtareas = Object.fromEntries(Object.entries(t.subtareas || {}).map(([k, s]) => [k, { ...s, hecha: false }]));
        await actualizar({
            [`tareas/${id}/fecha`]: siguiente,
            [`tareas/${id}/subtareas`]: Object.keys(subtareas).length ? subtareas : null,
            [`tareas/${id}/completadas`]: (Number(t.completadas) || 0) + 1,
            [`tareas/${id}/ultimaVez`]: Date.now(),
        });
        return { siguiente, deshacer };
    }
    await actualizar({ [`tareas/${id}/hecha`]: hecha, [`tareas/${id}/hechaEn`]: hecha ? Date.now() : null });
    return { deshacer };
}

export function marcarSubtarea(id, subId, hecha) {
    return actualizar({ [`tareas/${id}/subtareas/${subId}/hecha`]: hecha });
}

export function moverTarea(id, fecha) {
    return actualizar({ [`tareas/${id}/fecha`]: fecha || null, ...(fecha ? {} : { [`tareas/${id}/hora`]: null }) });
}

// ---------- Eventos ----------
export function guardarEvento(e) {
    const id = e.id || nuevoId();
    const previo = agenda().eventos[id];
    return actualizar({ [`eventos/${id}`]: { ...e, id: undefined, creadoEn: previo?.creadoEn || Date.now() } }).then(() => id);
}

export async function borrarEvento(id) {
    const previo = agenda().eventos[id];
    await actualizar({ [`eventos/${id}`]: null });
    return () => actualizar({ [`eventos/${id}`]: { ...previo, id: undefined } });
}

// ---------- Listas ----------
export function guardarLista(l) {
    const id = l.id || nuevoId();
    const previo = agenda().listas[id] || {};
    return actualizar({ [`listas/${id}`]: { orden: Object.keys(agenda().listas).length, ...previo, ...l, id: undefined } }).then(() => id);
}

// Los pendientes de la lista se conservan, sin lista.
export function borrarLista(id) {
    const updates = { [`listas/${id}`]: null };
    Object.values(agenda().tareas).filter(t => t.listaId === id).forEach(t => { updates[`tareas/${t.id}/listaId`] = null; });
    return actualizar(updates);
}

// ---------- Ajustes ----------
export function guardarAjustes(cambios) {
    const updates = {};
    Object.entries(cambios).forEach(([k, v]) => { updates[`ajustes/${k}`] = v; });
    return actualizar(updates);
}

// Primera vez: listas de ejemplo.
export function iniciarAgenda() {
    const updates = { meta: { version: 1, creado: Date.now() } };
    [['Personal', 0], ['Trabajo', 1], ['Casa', 2], ['Compras', 3]].forEach(([nombre, orden]) => { updates[`listas/${nuevoId()}`] = { nombre, orden }; });
    return actualizar(updates);
}
