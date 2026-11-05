// Pendientes: agrupar por cuándo tocan, ordenar y repetir. Funciones puras.
//
// Un pendiente: { titulo, nota?, listaId?, fecha? 'AAAA-MM-DD', hora? 'HH:MM',
//   prioridad 0–3, hecha, hechaEn?, subtareas? { id: { texto, hecha, orden } },
//   repetir? { cada: n, unidad: 'dia'|'semana'|'mes'|'anio' }, origen?, creadoEn }

import { hoyISO, sumarDias, sumarMeses, fechaEnMes, diasEntre } from './fechas.js';

export const PRIORIDADES = [
    { valor: 0, nombre: 'Sin prioridad' },
    { valor: 1, nombre: 'Baja' },
    { valor: 2, nombre: 'Media' },
    { valor: 3, nombre: 'Alta' },
];

export const REPETICIONES = {
    dia: { nombre: 'Diario', cada: 'día', varios: 'días' },
    semana: { nombre: 'Semanal', cada: 'semana', varios: 'semanas' },
    mes: { nombre: 'Mensual', cada: 'mes', varios: 'meses' },
    anio: { nombre: 'Anual', cada: 'año', varios: 'años' },
};

// Orden dentro de un grupo: primero los que tienen hora (por hora), luego por
// prioridad (alta primero) y al final por antigüedad.
export function ordenar(tareas) {
    return [...tareas].sort((a, b) =>
        (a.fecha || '9999').localeCompare(b.fecha || '9999')
        || (a.hora ? 0 : 1) - (b.hora ? 0 : 1)
        || (a.hora || '').localeCompare(b.hora || '')
        || (Number(b.prioridad) || 0) - (Number(a.prioridad) || 0)
        || (a.creadoEn || 0) - (b.creadoEn || 0));
}

// Grupos: atrasadas, hoy, mañana, próximos 7 días, después, sin fecha (algún día) y hechas.
export function clasificar(tareas, hoy = new Date()) {
    const h = hoyISO(hoy), manana = sumarDias(h, 1), semana = sumarDias(h, 7);
    const g = { atrasadas: [], hoy: [], manana: [], proximas: [], despues: [], sinFecha: [], hechas: [] };
    tareas.forEach(t => {
        if (t.hecha) g.hechas.push(t);
        else if (!t.fecha) g.sinFecha.push(t);
        else if (t.fecha < h) g.atrasadas.push(t);
        else if (t.fecha === h) g.hoy.push(t);
        else if (t.fecha === manana) g.manana.push(t);
        else if (t.fecha <= semana) g.proximas.push(t);
        else g.despues.push(t);
    });
    Object.keys(g).forEach(k => { g[k] = k === 'hechas' ? g[k].sort((a, b) => (b.hechaEn || 0) - (a.hechaEn || 0)) : ordenar(g[k]); });
    return g;
}

// Siguiente fecha de un pendiente que se repite, contando desde la fecha que tenía
// (o desde hoy si no tenía). Nunca queda en el pasado.
export function siguienteFecha(fecha, repetir, hoy = new Date()) {
    const h = hoyISO(hoy);
    const cada = Math.max(1, Number(repetir?.cada) || 1);
    const avanzar = (f) => {
        if (repetir.unidad === 'dia') return sumarDias(f, cada);
        if (repetir.unidad === 'semana') return sumarDias(f, 7 * cada);
        const meses = repetir.unidad === 'anio' ? 12 * cada : cada;
        return fechaEnMes(sumarMeses(f.slice(0, 7), meses), Number((fecha || f).slice(8)));
    };
    let f = avanzar(fecha || h);
    for (let i = 0; f <= h && i < 400; i++) f = avanzar(f);
    return f;
}

export function textoRepetir(repetir) {
    if (!repetir?.unidad || !REPETICIONES[repetir.unidad]) return '';
    const r = REPETICIONES[repetir.unidad], cada = Number(repetir.cada) || 1;
    return cada === 1 ? `Cada ${r.cada}` : `Cada ${cada} ${r.varios}`;
}

export function progreso(t) {
    const subs = Object.values(t.subtareas || {});
    return { hechas: subs.filter(s => s.hecha).length, total: subs.length };
}

// Texto corto de cuándo toca: "Hoy 9:30", "Mañana", "Vencido hace 2 días", "Vie 14 nov".
export function cuando(t, hoy = new Date()) {
    if (!t.fecha) return '';
    const h = hoyISO(hoy);
    const d = diasEntre(h, t.fecha);
    const hora = t.hora ? ` ${t.hora}` : '';
    if (d === 0) return `Hoy${hora}`;
    if (d === 1) return `Mañana${hora}`;
    if (d === -1) return `Ayer${hora}`;
    if (d < 0) return `Hace ${-d} días`;
    const [y, m, dia] = t.fecha.split('-').map(Number);
    const semana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][new Date(y, m - 1, dia).getDay()];
    const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][m - 1];
    return `${semana} ${dia} ${mes}${y !== hoy.getFullYear() ? ` ${y}` : ''}${hora}`;
}

// Resumen para Hoy y para Teco.
export function resumenDia(tareas, hoy = new Date()) {
    const g = clasificar(tareas, hoy);
    const h = hoyISO(hoy);
    const hechasHoy = g.hechas.filter(t => t.hechaEn && hoyISO(new Date(t.hechaEn)) === h).length;
    return { atrasadas: g.atrasadas.length, hoy: g.hoy.length, hechasHoy, manana: g.manana.length, sinFecha: g.sinFecha.length, total: tareas.filter(t => !t.hecha).length };
}

// ---------- Posponer ----------
// 'manana' → mañana; 'semana' → el lunes que viene; 'sinfecha' → sin fecha (Algún día).
export function fechaPospuesta(opcion, hoy = new Date()) {
    const h = hoyISO(hoy);
    if (opcion === 'hoy') return h;
    if (opcion === 'manana') return sumarDias(h, 1);
    if (opcion === 'semana') { const dow = hoy.getDay(); return sumarDias(h, ((8 - dow) % 7) || 7); }
    return null;
}

// Avance del día: lo hecho hoy contra lo que tocaba hoy (hecho + por hacer + atrasado).
export function avanceDia(tareas, hoy = new Date()) {
    const r = resumenDia(tareas, hoy);
    const total = r.hechasHoy + r.hoy + r.atrasadas;
    return { hechas: r.hechasHoy, total, fraccion: total ? r.hechasHoy / total : 0, completo: total > 0 && r.hechasHoy === total };
}
