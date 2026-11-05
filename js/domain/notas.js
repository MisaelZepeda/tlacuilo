// Registros: notas, apuntes, transcripciones y listas. Funciones puras.
//
// Un registro: { titulo?, contenido, tipo: 'nota'|'apunte'|'transcripcion'|'lista',
//   items? { id: { texto, hecho, orden } } (solo listas), etiquetas? [], fijada?,
//   fecha 'AAAA-MM-DD' (día al que pertenece), creadoEn, editadoEn }

export const TIPOS_NOTA = {
    nota: { nombre: 'Nota', icono: 'note', vacio: 'Escribe lo que quieras recordar…' },
    apunte: { nombre: 'Apunte', icono: 'file-text', vacio: 'Ideas, clases, juntas…' },
    transcripcion: { nombre: 'Transcripción', icono: 'sparkle', vacio: 'Toca el micrófono y habla; aquí aparece el texto.' },
    lista: { nombre: 'Lista', icono: 'check-circle', vacio: 'Agregar elemento' },
};

export const normalizarTexto = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- Listas (elementos que se marcan y se tachan) ----------
export const itemsDe = (n) => Object.entries(n?.items || {})
    .map(([id, x]) => ({ id, texto: x.texto || '', hecho: !!x.hecho, orden: x.orden ?? 0 }))
    .sort((a, b) => a.orden - b.orden);

export function progresoLista(n) {
    const items = itemsDe(n).filter(x => x.texto.trim());
    return { hechos: items.filter(x => x.hecho).length, total: items.length };
}

// Texto → elementos: cada renglón es uno; "[x]", "✓" o "- [x]" lo marcan como hecho.
export function lineasALista(texto) {
    return String(texto || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const hecho = /^(?:[-*•]\s*)?(?:\[[xX✓]\]|✓|✔)/.test(l);
        const limpio = l.replace(/^(?:[-*•]\s*)?(?:\[[ xX✓]?\]|✓|✔)?\s*/, '').replace(/^[-*•]\s+/, '').trim();
        return { texto: limpio, hecho };
    }).filter(x => x.texto);
}

// Elementos → texto (al cambiar una lista a nota): los marcados llevan ✓.
export const listaATexto = (items) => items.filter(x => x.texto.trim()).map(x => `${x.hecho ? '✓ ' : ''}${x.texto.trim()}`).join('\n');

// Lo dictado en una lista: "leche, huevo y pan" → tres elementos.
export const dictadoALista = (texto) => String(texto || '').split(/,|\s+y\s+|\n/).map(x => x.trim()).filter(Boolean)
    .map(x => x.charAt(0).toUpperCase() + x.slice(1));

// Texto de un registro para buscar, titular y sacar etiquetas (en listas, sus elementos).
const textoDe = (n) => (n.tipo === 'lista' ? itemsDe(n).map(x => x.texto).join('\n') : String(n.contenido || ''));

// Título visible: el que tenga o la primera línea (o el primer elemento de la lista).
export function tituloNota(n) {
    const t = (n.titulo || '').trim();
    if (t) return t;
    const linea = textoDe(n).split('\n').map(x => x.trim()).find(Boolean) || '';
    return linea.length > 60 ? `${linea.slice(0, 57)}…` : (linea || 'Sin título');
}

// Vista previa: en listas, el avance; en lo demás, el texto sin la línea del título.
export function resumenNota(n, largo = 140) {
    if (n.tipo === 'lista') {
        const { hechos, total } = progresoLista(n);
        return total ? `${hechos} de ${total} marcados` : '';
    }
    let lineas = String(n.contenido || '').split('\n').map(x => x.trim()).filter(Boolean);
    if (!(n.titulo || '').trim()) lineas = lineas.slice(1);
    const texto = lineas.join(' · ');
    return texto.length > largo ? `${texto.slice(0, largo - 1)}…` : texto;
}

export const contarPalabras = (t) => (String(t || '').trim().match(/\S+/g) || []).length;

// Etiquetas desde el texto (#etiqueta) más las guardadas, sin repetir.
export function etiquetasDe(n) {
    const delTexto = (textoDe(n).match(/(^|\s)#([\p{L}\p{N}_-]{2,30})/gu) || []).map(x => x.trim().slice(1).toLowerCase());
    return [...new Set([...(n.etiquetas || []).map(e => e.toLowerCase()), ...delTexto])];
}

export function etiquetasUsadas(notas) {
    const cuenta = {};
    notas.forEach(n => etiquetasDe(n).forEach(e => { cuenta[e] = (cuenta[e] || 0) + 1; }));
    return Object.entries(cuenta).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([e]) => e);
}

// Fijadas primero; luego lo editado más recientemente.
export function ordenarNotas(notas) {
    return [...notas].sort((a, b) => Number(!!b.fijada) - Number(!!a.fijada) || (b.editadoEn || b.creadoEn || 0) - (a.editadoEn || a.creadoEn || 0));
}

// Filtro por tipo ('todas' | 'fijadas' | tipo), etiqueta y búsqueda (sin acentos).
export function filtrarNotas(notas, { tipo = 'todas', etiqueta = '', q = '' } = {}) {
    const busca = normalizarTexto(q.trim());
    return ordenarNotas(notas.filter(n =>
        (tipo === 'todas' || (tipo === 'fijadas' ? n.fijada : (n.tipo || 'nota') === tipo))
        && (!etiqueta || etiquetasDe(n).includes(etiqueta))
        && (!busca || normalizarTexto(`${n.titulo || ''} ${textoDe(n)}`).includes(busca))));
}

export const notasDelDia = (notas, fecha) => ordenarNotas(notas.filter(n => n.fecha === fecha));

// Une lo dictado al texto: agrega espacio o salto según haga falta y mayúscula al iniciar.
export function agregarDictado(texto, dictado) {
    const d = String(dictado || '').trim();
    if (!d) return texto;
    const base = String(texto || '');
    const inicio = !base.trim() || /[.!?]\s*$/.test(base) || /\n\s*$/.test(base);
    const pieza = inicio ? d.charAt(0).toUpperCase() + d.slice(1) : d;
    if (!base) return pieza;
    return base + (/\s$/.test(base) ? '' : ' ') + pieza;
}
