# Tlacuilo

*El que escribe y recuerda.* Agenda, pendientes y notas personales, hermana de
[Morralla](https://github.com/MisaelZepeda/financiapp). Teco, el tecolote, te recuerda
lo que toca y te da consejos de organización.

**App:** https://misaelzepeda.github.io/tlacuilo/

## Cómo se conecta con Morralla

- Usa el mismo proyecto de Firebase y la misma cuenta: entras con tu usuario de Morralla.
- Sus datos viven aparte, en `Usuarios/{uid}/agenda`.
- Lee `Usuarios/{uid}/v4` (Morralla) **solo para mostrar**: qué tarjeta vence, pagos fijos,
  cobros de "Te deben" y lo gastado en el día. Nunca escribe ahí.
- Los cálculos de pagos son copias de los de Morralla en `js/domain/morralla/`. Si cambian
  allá, se copian de nuevo.

## Estructura

- `js/domain/`: lógica pura con pruebas (`npm test`): pendientes, Teco y lo que se lee de Morralla.
- `js/core/`: datos (Firebase o demo), estado, acciones, rutas y eventos.
- `js/views/` y `js/components/`: pantallas y piezas de interfaz.
- `sw.js`: funciona sin conexión; al publicar se sube `CACHE_NAME` para que aparezca el aviso de actualización.

## Fases

1. **Base, Hoy y Pendientes** (listas, fecha y hora, prioridad, subtareas, repetición).
2. **Calendario** (mes, semana y día) con eventos y capas de Morralla: pagos, cobros y gasto por día.
3. **Notas**: notas, apuntes y transcripciones por voz, con etiquetas (#así), fijadas y guardado automático.
4. **Avisos y Siri**: resumen de la mañana, aviso a la hora de cada pendiente y antes de cada evento, vistazo a mañana; "Oye Siri, pendiente" con fecha y hora. Usa el Worker `morralla-push` (repositorio de Morralla) con `?app=tlacuilo`.
