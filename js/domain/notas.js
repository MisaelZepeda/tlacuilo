// Registros: notas, apuntes y transcripciones. Funciones puras.
//
// Un registro: { titulo?, contenido, tipo: 'nota'|'apunte'|'transcripcion',
//   etiquetas? [], fijada?, fecha 'AAAA-MM-DD' (día al que pertenece), creadoEn, editadoEn }

export const TIPOS_NOTA = {
    nota: { nombre: 'Nota', icono: 'note', vacio: 'Escribe lo que quieras recordar…' },
    apunte: { nombre: 'Apunte', icono: 'file-text', vacio: 'Ideas, clases, juntas…' },
    transcripcion: { nombre: 'Transcripción', icono: 'sparkle', vacio: 'Toca el micrófono y habla; aquí aparece el texto.' },
};

export const normalizarTexto = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Título visible: el que tenga o la primera línea del contenido.
export function tituloNota(n) {
    const t = (n.titulo || '').trim();
    if (t) return t;
    const linea = String(n.contenido || '').split('\n').map(x => x.trim()).find(Boolean) || '';
    return linea.length > 60 ? `${linea.slice(0, 57)}…` : (linea || 'Sin título');
}

// Vista previa: el texto sin la línea que se usó de título, en una sola línea.
export function resumenNota(n, largo = 140) {
    let lineas = String(n.contenido || '').split('\n').map(x => x.trim()).filter(Boolean);
    if (!(n.titulo || '').trim()) lineas = lineas.slice(1);
    const texto = lineas.join(' · ');
    return texto.length > largo ? `${texto.slice(0, largo - 1)}…` : texto;
}

export const contarPalabras = (t) => (String(t || '').trim().match(/\S+/g) || []).length;

// Etiquetas desde el texto (#etiqueta) más las guardadas, sin repetir.
export function etiquetasDe(n) {
    const delTexto = (String(n.contenido || '').match(/(^|\s)#([\p{L}\p{N}_-]{2,30})/gu) || []).map(x => x.trim().slice(1).toLowerCase());
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
        && (!busca || normalizarTexto(`${n.titulo || ''} ${n.contenido || ''}`).includes(busca))));
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
