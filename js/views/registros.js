// Notas: notas, apuntes, transcripciones y listas, con búsqueda, filtros y etiquetas.

import { sel } from '../core/store.js';
import { on } from '../core/eventos.js';
import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';
import { vacioTecoHTML } from '../components/piezas.js';
import { TIPOS_NOTA, tituloNota, resumenNota, etiquetasDe, etiquetasUsadas, filtrarNotas, itemsDe } from '../domain/notas.js';
import { hoyISO, diasEntre } from '../domain/fechas.js';

const FILTROS = { todas: 'Todas', fijadas: 'Fijadas', lista: 'Listas', nota: 'Notas', apunte: 'Apuntes', transcripcion: 'Transcripciones' };
const f = { tipo: 'todas', etiqueta: '', q: '' };

export const titulo = () => ({ titulo: 'Notas' });
export function alEntrar(params) { if (params.etiqueta !== undefined) f.etiqueta = params.etiqueta; }

export function cuandoNota(n) {
    const ts = n.editadoEn || n.creadoEn;
    if (!ts) return '';
    const d = new Date(ts), iso = hoyISO(d), dias = diasEntre(iso, hoyISO());
    const hora = d.toTimeString().slice(0, 5);
    if (dias === 0) return `Hoy ${hora}`;
    if (dias === 1) return `Ayer ${hora}`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }).replace('.', '');
}

// Primeros elementos de una lista, con los marcados tachados, y su avance.
function listaPreviaHTML(n) {
    const items = itemsDe(n).filter(x => x.texto.trim());
    if (!items.length) return '';
    return `<ul class="nota-lista">${items.slice(0, 5).map(x => `<li class="${x.hecho ? 'hecho' : ''}">${escapeHtml(x.texto)}</li>`).join('')}</ul>
        ${items.length > 5 ? `<span class="hint">y ${items.length - 5} más</span>` : ''}
        <span class="nota-avance">${escapeHtml(resumenNota(n))}</span>`;
}

export function notaCardHTML(n) {
    const t = TIPOS_NOTA[n.tipo] || TIPOS_NOTA.nota;
    const etiquetas = etiquetasDe(n).slice(0, 3);
    return `<a class="nota-card ${n.fijada ? 'fijada' : ''}" href="#/registro/${encodeURIComponent(n.id)}">
        <div class="nota-cab"><span class="nota-tipo">${icon(t.icono)}${t.nombre}</span>${n.fijada ? `<span class="nota-pin">${icon('star')}</span>` : ''}</div>
        <b class="nota-titulo">${escapeHtml(tituloNota(n))}</b>
        ${n.tipo === 'lista' ? listaPreviaHTML(n) : resumenNota(n) ? `<p class="nota-resumen">${escapeHtml(resumenNota(n))}</p>` : ''}
        <div class="nota-pie"><span>${escapeHtml(cuandoNota(n))}</span>${etiquetas.map(e => `<span class="nota-tag">#${escapeHtml(e)}</span>`).join('')}</div>
    </a>`;
}

function listaHTML() {
    const notas = filtrarNotas(sel.notas(), f);
    if (!sel.notas().length) return `<section class="card">${vacioTecoHTML('Tu primera nota', 'Guarda ideas, apuntes de clase o de juntas, o dicta y Teco lo transcribe.', 'contento')}</section>`;
    if (!notas.length) return `<section class="card">${vacioTecoHTML('Sin resultados', 'Prueba con otra palabra o quita los filtros.', 'tranquilo')}</section>`;
    return `<div class="notas-grid">${notas.map(notaCardHTML).join('')}</div>`;
}

export function render() {
    const etiquetas = etiquetasUsadas(sel.notas());
    return `<div class="notas-acciones">
            <a class="btn btn-primary" href="#/registro/nuevo">${icon('plus')}Nota</a>
            <a class="btn btn-soft" href="#/registro/nuevo?tipo=lista">${icon('check-circle')}Lista</a>
            <a class="btn btn-soft" href="#/registro/nuevo?tipo=transcripcion&dictar=1">${icon('sparkle')}Dictar</a>
        </div>
        <div class="search" style="margin-bottom:10px;"><span>${icon('search')}</span><input type="search" placeholder="Buscar en tus notas" value="${escapeHtml(f.q)}" data-input="rBuscar" aria-label="Buscar notas"></div>
        <div class="chips chips-scroll" style="margin:0 -16px 8px;">${Object.entries(FILTROS).map(([k, n]) => `<button class="chip chip-sm ${f.tipo === k ? 'activo' : ''}" data-action="rTipo" data-v="${k}">${n}</button>`).join('')}</div>
        ${etiquetas.length ? `<div class="chips chips-scroll" style="margin:0 -16px 12px;">${etiquetas.slice(0, 20).map(e => `<button class="chip chip-sm chip-outline ${f.etiqueta === e ? 'activo' : ''}" data-action="rEtiqueta" data-v="${escapeHtml(e)}">#${escapeHtml(e)}</button>`).join('')}</div>` : ''}
        <div id="r-lista">${listaHTML()}</div>`;
}

const repintar = () => { const v = document.getElementById('vista'); if (v) v.innerHTML = render(); };
on('rBuscar', (el) => { f.q = el.value; const l = document.getElementById('r-lista'); if (l) l.innerHTML = listaHTML(); }, 'input');
on('rTipo', (el) => { f.tipo = el.dataset.v; repintar(); });
on('rEtiqueta', (el) => { f.etiqueta = f.etiqueta === el.dataset.v ? '' : el.dataset.v; repintar(); });
