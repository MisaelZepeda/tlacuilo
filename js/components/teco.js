// Teco, el tecolote de Tlacuilo: sabio, ordenado y primo de Tlaco.
// tecoSVG(estado, { tamano, animado }) → SVG en texto (sin datos del usuario).

const PLUMA = '#5b3df5', PANZA = '#e9e3ff', PICO = '#f2b544', OJO = '#1a1530', ALA = '#4a2fd6';

const CUERPO = `
    <path d="M44 74 L52 30 L78 58 Z" fill="${ALA}"/><path d="M156 74 L148 30 L122 58 Z" fill="${ALA}"/>
    <ellipse cx="100" cy="128" rx="68" ry="80" fill="${PLUMA}"/>
    <ellipse cx="100" cy="150" rx="44" ry="52" fill="${PANZA}"/>
    <path d="M80 140 q6 6 12 0 M108 140 q6 6 12 0 M90 162 q6 6 12 0 M98 182 q4 4 8 0" stroke="#c9bdfb" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="80" cy="210" rx="12" ry="7" fill="${PICO}"/><ellipse cx="120" cy="210" rx="12" ry="7" fill="${PICO}"/>`;
const ANTIFAZ = `<circle cx="74" cy="98" r="27" fill="#fff"/><circle cx="126" cy="98" r="27" fill="#fff"/>`;
const PICO_CERRADO = `<path d="M92 116 L108 116 L100 130 Z" fill="${PICO}"/>`;
const alas = (izq, der) => `<path d="${izq}" fill="${ALA}"/><path d="${der}" fill="${ALA}"/>`;
const ALAS_ABAJO = alas('M36 120 q-8 40 22 64 q-4 -36 4 -60 z', 'M164 120 q8 40 -22 64 q4 -36 -4 -60 z');
const ojos = (r = 11, dy = 0) => `<g class="teco-ojos"><circle cx="74" cy="${100 + dy}" r="${r}" fill="${OJO}"/><circle cx="126" cy="${100 + dy}" r="${r}" fill="${OJO}"/>
    <circle cx="78" cy="${95 + dy}" r="3.6" fill="#fff"/><circle cx="130" cy="${95 + dy}" r="3.6" fill="#fff"/></g>`;
// Lápiz: Tlacuilo es "el que escribe".
const LAPIZ = `<g transform="rotate(-35 168 150)"><rect x="160" y="118" width="12" height="48" rx="2" fill="${PICO}"/><rect x="160" y="118" width="12" height="8" fill="#e5675a"/><path d="M160 166 L172 166 L166 180 Z" fill="#f6e2c0"/><path d="M164 174 L168 174 L166 180 Z" fill="${OJO}"/></g>`;

const CARAS = {
    tranquilo: () => `${ALAS_ABAJO}${CUERPO}${ANTIFAZ}${ojos(10, 3)}
        <path d="M60 92 q14 -8 28 0 M112 92 q14 -8 28 0" stroke="${PLUMA}" stroke-width="6" fill="none" stroke-linecap="round"/>${PICO_CERRADO}${LAPIZ}`,
    contento: () => `${alas('M36 120 q-8 40 22 64 q-4 -36 4 -60 z', 'M162 118 q30 -10 30 -44 q-24 14 -36 30 z')}${CUERPO}${ANTIFAZ}${ojos()}
        <path d="M92 116 L108 116 L100 132 Z" fill="${PICO}"/><path d="M95 124 q5 4 10 0" stroke="#c98a1e" stroke-width="2" fill="none"/>`,
    celebrando: () => `
        <path class="teco-brillo" d="M30 40 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z" fill="${PICO}"/>
        <path class="teco-brillo" d="M170 26 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="${PICO}"/>
        ${alas('M38 118 q-34 -12 -30 -50 q22 16 38 34 z', 'M162 118 q34 -12 30 -50 q-22 16 -38 34 z')}${CUERPO}${ANTIFAZ}
        <path d="M62 102 q12 -14 24 0 M114 102 q12 -14 24 0" stroke="${OJO}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M90 116 L110 116 L100 136 Z" fill="${PICO}"/>`,
    preocupado: () => `${ALAS_ABAJO}${CUERPO}${ANTIFAZ}${ojos(9, 4)}
        <path d="M56 80 l26 8 M144 80 l-26 8" stroke="${OJO}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M162 60 q9 13 0 20 q-9 -7 0 -20z" fill="#8ec9f0"/>${PICO_CERRADO}`,
    sorprendido: () => `${alas('M38 112 q-30 -6 -32 -38 q20 12 34 22 z', 'M162 112 q30 -6 32 -38 q-20 12 -34 22 z')}${CUERPO}${ANTIFAZ}
        <g class="teco-ojos"><circle cx="74" cy="98" r="14" fill="${OJO}"/><circle cx="126" cy="98" r="14" fill="${OJO}"/><circle cx="79" cy="92" r="4.5" fill="#fff"/><circle cx="131" cy="92" r="4.5" fill="#fff"/></g>
        <ellipse cx="100" cy="126" rx="8" ry="10" fill="${PICO}"/><ellipse cx="100" cy="127" rx="4" ry="5.5" fill="#c98a1e"/>`,
    dormido: () => `${ALAS_ABAJO}${CUERPO}${ANTIFAZ}
        <path d="M60 100 q14 10 28 0 M112 100 q14 10 28 0" stroke="${OJO}" stroke-width="5" fill="none" stroke-linecap="round"/>${PICO_CERRADO}
        <g class="teco-zzz" fill="${PLUMA}" font-family="Bricolage Grotesque, Inter, sans-serif" font-weight="700">
            <text x="140" y="48" font-size="24">Z</text><text x="162" y="30" font-size="17">z</text><text x="176" y="16" font-size="12">z</text></g>`,
};

export const ESTADOS_TECO = Object.keys(CARAS);

export function tecoSVG(estado = 'tranquilo', { tamano = 96, animado = true } = {}) {
    const cara = (CARAS[estado] || CARAS.tranquilo)();
    const alto = Math.round(tamano * 1.15);
    return `<svg class="teco ${animado ? 'teco-animado' : ''} teco-${estado}" width="${tamano}" height="${alto}" viewBox="0 0 200 230" role="img" aria-label="Teco ${estado}">
        <ellipse class="teco-sombra" cx="100" cy="220" rx="48" ry="7" fill="#000" opacity="0.18"/><g class="teco-cuerpo">${cara}</g></svg>`;
}
