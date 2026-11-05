// Datos de ejemplo para la demo: una agenda y un poco de Morralla (para la sección Dinero).

import { hoyISO, sumarDias, mesKey, sumarMeses, aFecha } from '../domain/fechas.js';

export function construirDemo(hoy = new Date()) {
    const h = hoyISO(hoy);
    const d = (n) => sumarDias(h, n);
    const listas = {
        personal: { nombre: 'Personal', color: '#5b3df5', orden: 0 },
        trabajo: { nombre: 'Trabajo', color: '#2a78d6', orden: 1 },
        casa: { nombre: 'Casa', color: '#13855c', orden: 2 },
        compras: { nombre: 'Compras', color: '#d97706', orden: 3 },
    };
    let n = 0;
    const tareas = {};
    const t = (x) => { tareas[`demo${n++}`] = { prioridad: 0, hecha: false, creadoEn: n, ...x }; };
    t({ titulo: 'Junta con el equipo', fecha: h, hora: '10:00', listaId: 'trabajo', prioridad: 2 });
    t({ titulo: 'Dentista', fecha: h, hora: '17:30', listaId: 'personal', nota: 'Llevar la credencial del seguro.' });
    t({ titulo: 'Enviar reporte mensual', fecha: h, listaId: 'trabajo', prioridad: 3, subtareas: { a: { texto: 'Juntar cifras', hecha: true, orden: 0 }, b: { texto: 'Revisar gráficas', hecha: false, orden: 1 }, c: { texto: 'Mandar por correo', hecha: false, orden: 2 } } });
    t({ titulo: 'Regar las plantas', fecha: h, listaId: 'casa', repetir: { cada: 3, unidad: 'dia' } });
    t({ titulo: 'Leer 20 minutos', fecha: h, listaId: 'personal', hecha: true, hechaEn: Date.now() - 3600e3 });
    t({ titulo: 'Renovar licencia', fecha: d(-2), listaId: 'personal', prioridad: 2 });
    t({ titulo: 'Comprar despensa', fecha: d(1), listaId: 'compras', subtareas: { a: { texto: 'Leche', hecha: false, orden: 0 }, b: { texto: 'Huevo', hecha: false, orden: 1 }, c: { texto: 'Café', hecha: false, orden: 2 } } });
    t({ titulo: 'Cambiar filtro del agua', fecha: d(2), listaId: 'casa', repetir: { cada: 3, unidad: 'mes' } });
    t({ titulo: 'Cumpleaños de mamá', fecha: d(4), hora: '19:00', listaId: 'personal', prioridad: 3 });
    t({ titulo: 'Planear vacaciones de diciembre', listaId: 'personal' });
    t({ titulo: 'Aprender a usar atajos de Siri' });

    // Morralla mínima: una tarjeta que vence mañana, un pago fijo hoy y un gasto de hoy.
    const manana = aFecha(d(1));
    const diaPago = manana.getDate();
    const corte = mesKey(sumarMeses(mesKey(hoy), -1));
    const v4 = {
        perfil: { nombre: 'Cuenta Demo' },
        cuentas: {
            platino: { nombre: 'Platino', banco: 'Santander', tipo: 'credito', diaCorte: Math.max(1, diaPago - 18 > 0 ? diaPago - 18 : diaPago + 10), diaPago, limite: 30000, saldoInicial: 0, fechaInicial: `${corte}-01` },
            nomina: { nombre: 'Nómina', tipo: 'debito', saldoInicial: 12000, fechaInicial: `${corte}-01` },
        },
        transacciones: {
            g1: { tipo: 'gasto', monto: 2350, fecha: `${corte}-${String(Math.min(28, diaPago)).padStart(2, '0')}`, cuentaId: 'platino', categoriaId: 'comida', desc: 'Súper' },
            g2: { tipo: 'gasto', monto: 1200, fecha: d(-25), cuentaId: 'platino', categoriaId: 'ocio', desc: 'Cine' },
            g3: { tipo: 'gasto', monto: 185, fecha: h, cuentaId: 'nomina', categoriaId: 'comida', desc: 'Comida' },
        },
        recurrentes: {
            net: { tipo: 'gasto', desc: 'Netflix', monto: 219, cuentaId: 'platino', frecuencia: 'mensual', diaMes: aFecha(h).getDate(), activo: true, proximaFecha: h, categoriaId: 'suscripciones' },
        },
    };
    return { agenda: { meta: { version: 1, origen: 'demo' }, ajustes: {}, listas, tareas }, v4 };
}
