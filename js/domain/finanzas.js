// Lo que Tlacuilo lee de Morralla (solo lectura, nunca escribe ahí): qué vence
// hoy y mañana, cobros de "Te deben" y cuánto llevas gastado hoy.
// Los cálculos de pagos son copias de los de Morralla (js/domain/morralla/).

import { hoyISO, sumarDias, mesKey, sumarMeses } from './fechas.js';
import { eventosMes } from './morralla/calendario.js';
import { deudasTerceros } from './morralla/terceros.js';

const r2 = (n) => Math.round(n * 100) / 100;
const lista = (obj) => Object.entries(obj || {}).map(([id, v]) => ({ ...v, id }));

// v4: el nodo Usuarios/{uid}/v4 de Morralla tal como viene de Firebase.
export function datosMorralla(v4) {
    return { cuentas: lista(v4?.cuentas), transacciones: lista(v4?.transacciones), recurrentes: lista(v4?.recurrentes) };
}

// Eventos de dinero entre hoy y `dias` días después (y los pagos ya vencidos sin pagar).
// Cada uno: { clave, fecha, tipo, titulo, monto, cuentaId, vencido }
export function pendientesDeDinero(v4, hoy = new Date(), dias = 1) {
    const d = datosMorralla(v4);
    if (!d.cuentas.length) return [];
    const h = hoyISO(hoy), hasta = sumarDias(h, dias);
    const mes = mesKey(hoy);
    const eventos = [sumarMeses(mes, -1), mes, sumarMeses(mes, 1)].flatMap(k => eventosMes(k, d, hoy));
    const nombre = (id) => d.cuentas.find(c => c.id === id)?.nombre || 'tu tarjeta';
    const out = [];
    eventos.forEach(e => {
        if (e.tipo === 'pago' && !e.pagado && e.monto > 0 && e.fecha <= hasta && e.fecha >= sumarDias(h, -20)) {
            out.push({ clave: `pago:${e.cuentaId}:${e.fecha}`, fecha: e.fecha, tipo: 'pago', titulo: `Pagar ${nombre(e.cuentaId)}`, monto: r2(e.monto), cuentaId: e.cuentaId, vencido: e.fecha < h });
        } else if (e.tipo === 'recurrente' && e.fecha >= h && e.fecha <= hasta) {
            out.push({ clave: `rec:${e.recurrenteId}:${e.fecha}`, fecha: e.fecha, tipo: e.ingreso ? 'ingreso' : 'recurrente', titulo: e.titulo, monto: r2(e.monto), cuentaId: e.cuentaId, vencido: false });
        }
    });
    deudasTerceros(d.cuentas, d.transacciones, hoy).filter(x => !x.saldada && x.proximo && x.proximo.fecha <= hasta).forEach(x => {
        out.push({ clave: `cobro:${x.nombre}:${x.proximo.fecha}`, fecha: x.proximo.fecha, tipo: 'cobro', titulo: `Cobrarle a ${x.nombre}`, monto: x.proximo.monto, vencido: x.proximo.fecha < h });
    });
    return out.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.titulo.localeCompare(b.titulo));
}

// Gasto propio de un día (sin traspasos ni compras para alguien más).
export function gastoDelDia(v4, fecha) {
    return r2(datosMorralla(v4).transacciones
        .filter(t => t.tipo === 'gasto' && t.fecha === fecha && !t.paraTercero)
        .reduce((a, t) => a + (Number(t.monto) || 0), 0));
}

// ¿Ya se cubrió en Morralla lo que originó un pendiente? (clave de pendientesDeDinero)
//   pago:<cuentaId>:<fechaLímite>   → el estado de esa tarjeta ya está pagado
//   rec:<recurrenteId>:<fecha>      → el pago fijo ya se registró (su próxima fecha avanzó)
//   cobro:<nombre>:<fecha>          → esa persona ya abonó esa mensualidad (o ya saldó)
export function pagoCubierto(clave, v4, hoy = new Date()) {
    const [tipo, ...resto] = String(clave || '').split(':');
    const fecha = resto[resto.length - 1];
    const ref = resto.slice(0, -1).join(':');
    const d = datosMorralla(v4);
    if (tipo === 'rec') {
        const r = d.recurrentes.find(x => x.id === ref);
        return !!r && (r.activo === false || (r.proximaFecha || '') > fecha);
    }
    if (tipo === 'cobro') {
        const deuda = deudasTerceros(d.cuentas, d.transacciones, hoy).find(x => x.nombre.toLowerCase() === ref.toLowerCase());
        return !deuda || deuda.saldada || (deuda.proximo && deuda.proximo.fecha > fecha);
    }
    if (tipo === 'pago') {
        const mes = fecha.slice(0, 7);
        const ev = [sumarMeses(mes, -1), mes].flatMap(k => eventosMes(k, d, hoy)).find(e => e.tipo === 'pago' && e.cuentaId === ref && e.fecha === fecha);
        return !!ev?.pagado;
    }
    return false;
}
