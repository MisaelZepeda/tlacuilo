// Estado de la app: datos de la agenda, datos de Morralla (solo lectura) y UI.
// Los selectores se memorizan hasta el siguiente cambio de datos.

import { ordenar } from '../domain/tareas.js';

export const store = {
    usuario: null,
    demo: false,
    cargado: false,
    agenda: vacio(),
    v4: {},           // Morralla, tal cual
    ui: { privacidad: false },
};

function vacio() { return { meta: null, ajustes: {}, listas: {}, tareas: {}, eventos: {}, notas: {} }; }

const oyentes = new Set();
export function suscribir(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function avisar() { memo.clear(); oyentes.forEach(fn => fn()); }

function normalizar(d = {}) {
    const out = vacio();
    Object.keys(out).forEach(k => { if (d[k] != null) out[k] = d[k]; });
    ['listas', 'tareas', 'eventos', 'notas'].forEach(k => {
        const col = {};
        Object.entries(out[k] || {}).forEach(([id, v]) => { if (v) col[id] = { ...v, id }; });
        out[k] = col;
    });
    return out;
}

export function setAgenda(d) { store.agenda = normalizar(d); store.cargado = true; avisar(); }
export function setMorralla(d) { store.v4 = d || {}; avisar(); }
export function setUi(cambios) { Object.assign(store.ui, cambios); avisar(); }
export function reiniciar() { store.agenda = vacio(); store.v4 = {}; store.cargado = false; memo.clear(); }

const memo = new Map();
function memorizar(clave, fn) {
    if (!memo.has(clave)) memo.set(clave, fn());
    return memo.get(clave);
}

export const sel = {
    tareas: () => memorizar('tareas', () => ordenar(Object.values(store.agenda.tareas))),
    tarea: (id) => store.agenda.tareas[id] || null,
    listas: () => memorizar('listas', () => Object.values(store.agenda.listas).sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99) || a.nombre.localeCompare(b.nombre))),
    lista: (id) => store.agenda.listas[id] || null,
    eventos: () => memorizar('eventos', () => Object.values(store.agenda.eventos)),
    evento: (id) => store.agenda.eventos[id] || null,
    notas: () => memorizar('notas', () => Object.values(store.agenda.notas)),
    nota: (id) => store.agenda.notas[id] || null,
    ajustes: () => store.agenda.ajustes || {},
    // Tu perfil es el de Morralla (mismo usuario); Tlacuilo no guarda otro.
    perfil: () => store.v4?.perfil || {},
    v4: () => store.v4,
};
