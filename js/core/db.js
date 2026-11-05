// Acceso a datos. Tlacuilo vive en Usuarios/{uid}/agenda (lectura y escritura)
// y lee Usuarios/{uid}/v4 de Morralla solo para mostrar (nunca escribe ahí).
// El modo demo usa objetos en memoria con la misma interfaz.

import { userRef } from '../firebase-init.js';

export const RAIZ = 'agenda';
const RAIZ_MORRALLA = 'v4';

let modo = null;          // 'firebase' | 'demo'
let refAgenda = null, refMorralla = null;
let avisar = null;        // { agenda(d), morralla(d), error(e) }
let memoria = null;

export function conectarFirebase(uid, callbacks) {
    desconectar();
    modo = 'firebase';
    avisar = callbacks;
    refAgenda = userRef(uid, RAIZ);
    refMorralla = userRef(uid, RAIZ_MORRALLA);
    refAgenda.on('value', snap => avisar?.agenda(snap.val() || {}), e => avisar?.error(e));
    // Si no hay datos de Morralla (o no se pueden leer), Tlacuilo funciona igual.
    refMorralla.on('value', snap => avisar?.morralla(snap.val() || {}), () => avisar?.morralla({}));
}

export function conectarDemo(agenda, v4, callbacks) {
    desconectar();
    modo = 'demo';
    avisar = callbacks;
    memoria = structuredClone(agenda);
    queueMicrotask(() => { avisar?.morralla(structuredClone(v4)); avisar?.agenda(structuredClone(memoria)); });
}

export function desconectar() {
    refAgenda?.off(); refMorralla?.off();
    refAgenda = refMorralla = null; memoria = null; avisar = null; modo = null;
}

export const esDemo = () => modo === 'demo';

export function nuevoId() {
    if (modo === 'firebase') return refAgenda.push().key;
    return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Firebase rechaza `undefined`: se eliminan antes de escribir.
function limpiar(v) {
    if (Array.isArray(v)) return v.map(limpiar);
    if (v && typeof v === 'object') {
        const out = {};
        Object.entries(v).forEach(([k, x]) => { if (x !== undefined) out[k] = limpiar(x); });
        return out;
    }
    return v;
}

// updates: { 'ruta/relativa/a/agenda': valor | null }
export function actualizar(updates) {
    const limpio = limpiar(updates);
    if (modo === 'firebase') return refAgenda.update(limpio);
    if (modo === 'demo') {
        Object.entries(limpio).forEach(([ruta, valor]) => asignarRuta(memoria, ruta.split('/'), valor));
        avisar?.agenda(structuredClone(memoria));
        return Promise.resolve();
    }
    return Promise.reject(new Error('Sin conexión a datos'));
}

function asignarRuta(obj, partes, valor) {
    const [k, ...resto] = partes;
    if (!resto.length) { if (valor === null) delete obj[k]; else obj[k] = valor; return; }
    if (obj[k] == null || typeof obj[k] !== 'object') { if (valor === null) return; obj[k] = {}; }
    asignarRuta(obj[k], resto, valor);
}
