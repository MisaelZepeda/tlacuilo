// Calendario de Tlacuilo: eventos (con repetición) y lo que pasa cada día:
// eventos, pendientes, pagos de Morralla y gasto. Funciones puras.
//
// Un evento: { titulo, fecha 'AAAA-MM-DD', todoElDia?, horaInicio? 'HH:MM', horaFin?,
//   lugar?, nota?, color?, repetir? { unidad: 'semana'|'mes'|'anio', cada } , creadoEn }

import { hoyISO, sumarDias, sumarMeses, fechaEnMes, ultimoDiaMes, aFecha, diasEntre } from './fechas.js';
import { eventosMes } from './morralla/calendario.js';
import { cobrosDeCompra } from './morralla/terceros.js';
import { datosMorralla } from './finanzas.js';

const r2 = (n) => Math.round(n * 100) / 100;

// Fechas en que ocurre un evento dentro de [desde, hasta].
export function ocurrencias(evento, desde, hasta) {
    const base = evento.fecha;
    if (!base || base > hasta) return [];
    const r = evento.repetir;
    if (!r?.unidad) return base >= desde ? [base] : [];
    const cada = Math.max(1, Number(r.cada) || 1);
    const out = [];
    if (r.unidad === 'dia' || r.unidad === 'semana') {
        const paso = (r.unidad === 'dia' ? 1 : 7) * cada;
        // Primera ocurrencia dentro del rango, sin recorrer las anteriores.
        let i = Math.max(0, Math.ceil(diasEntre(base, desde) / paso));
        for (let f = sumarDias(base, i * paso); f <= hasta; f = sumarDias(base, ++i * paso)) out.push(f);
        return out;
    }
    // Mensual y anual: conservan el día (recortado en meses cortos, p. ej. 31 → 30).
    const meses = cada * (r.unidad === 'anio' ? 12 : 1);
    const dia = Number(base.slice(8));
    for (let i = 0; i < 2400; i++) {
        const f = fechaEnMes(sumarMeses(base.slice(0, 7), i * meses), dia);
        if (f > hasta) break;
        if (f >= desde) out.push(f);
    }
    return out;
}

// Eventos con sus ocurrencias en el rango: [{ ...evento, fecha (la ocurrencia), baseId }]
export function eventosEnRango(eventos, desde, hasta) {
    return eventos.flatMap(e => ocurrencias(e, desde, hasta).map(fecha => ({ ...e, fecha, baseId: e.id })))
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || ordenHora(a) - ordenHora(b));
}

const ordenHora = (e) => (e.todoElDia || !e.horaInicio ? -1 : Number(e.horaInicio.replace(':', '')));

// Lo de dinero en el rango, por día: vencimientos de Morralla, cobros de Te deben,
// movimientos y gasto. → { 'AAAA-MM-DD': { pagos: [...], movimientos: [...], gasto } }
export function dineroEnRango(v4, desde, hasta, hoy = new Date()) {
    const d = datosMorralla(v4);
    const dias = {};
    const dia = (f) => dias[f] || (dias[f] = { pagos: [], movimientos: [], gasto: 0 });
    if (!d.cuentas.length && !d.transacciones.length) return dias;
    const nombre = (id) => d.cuentas.find(c => c.id === id)?.nombre || 'Tarjeta';

    // Meses que toca el rango (eventosMes trabaja por mes).
    const meses = [];
    for (let k = desde.slice(0, 7); k <= hasta.slice(0, 7); k = sumarMeses(k, 1)) meses.push(k);
    meses.flatMap(k => eventosMes(k, d, hoy)).forEach(e => {
        if (e.fecha < desde || e.fecha > hasta) return;
        if (e.tipo === 'pago') dia(e.fecha).pagos.push({ tipo: 'pago', titulo: `Pago ${nombre(e.cuentaId)}`, monto: r2(e.monto), pagado: !!e.pagado, cuentaId: e.cuentaId });
        else if (e.tipo === 'recurrente') dia(e.fecha).pagos.push({ tipo: e.ingreso ? 'ingreso' : 'recurrente', titulo: e.titulo, monto: r2(e.monto), pagado: false });
        else if (e.tipo === 'msi') dia(e.fecha).pagos.push({ tipo: 'msi', titulo: e.titulo, monto: r2(e.monto), pagado: false });
        else if (e.tipo === 'corte') dia(e.fecha).pagos.push({ tipo: 'corte', titulo: e.titulo, monto: null, pagado: false });
    });

    // Cobros de Te deben (mismas fechas que el banco).
    d.transacciones.filter(t => t.tipo === 'gasto' && t.paraTercero).forEach(t => {
        cobrosDeCompra(t, d.cuentas.find(c => c.id === t.cuentaId)).forEach(c => {
            if (c.fecha >= desde && c.fecha <= hasta) dia(c.fecha).pagos.push({ tipo: 'cobro', titulo: `Cobrar a ${t.paraTercero}`, monto: c.monto, pagado: false });
        });
    });

    // Movimientos y gasto propio de cada día.
    d.transacciones.filter(t => t.fecha >= desde && t.fecha <= hasta).forEach(t => {
        const x = dia(t.fecha);
        x.movimientos.push(t);
        if (t.tipo === 'gasto' && !t.paraTercero) x.gasto = r2(x.gasto + (Number(t.monto) || 0));
    });
    Object.values(dias).forEach(x => x.movimientos.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0)));
    return dias;
}

// Cuadrícula del mes (semanas de lunes a domingo), con los días de afuera en null.
export function cuadriculaMes(key) {
    const primero = `${key}-01`, ultimo = ultimoDiaMes(key);
    const vacios = (aFecha(primero).getDay() + 6) % 7;
    const celdas = Array.from({ length: vacios }, () => null);
    for (let f = primero; f <= ultimo; f = sumarDias(f, 1)) celdas.push(f);
    while (celdas.length % 7) celdas.push(null);
    const semanas = [];
    for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
    return semanas;
}

// Lunes de la semana de una fecha.
export function inicioSemana(iso) {
    return sumarDias(iso, -((aFecha(iso).getDay() + 6) % 7));
}

// Nivel 0–4 de gasto para teñir el día (percentil 85 como tope, como en Morralla).
export function nivelesGasto(dias) {
    const valores = Object.values(dias).map(d => d.gasto).filter(v => v > 0).sort((a, b) => a - b);
    const ref = valores.length ? valores[Math.min(valores.length - 1, Math.floor(valores.length * 0.85))] : 0;
    return (v) => (!v || !ref ? 0 : Math.min(4, Math.max(1, Math.ceil((v / ref) * 4))));
}

export const hoyCal = () => hoyISO();
