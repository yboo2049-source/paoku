import * as THREE from 'three';

const createTexture = (svg: string, repeatX = 1, repeatY = 1) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const loader = new THREE.TextureLoader();
    const texture = loader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    if (repeatX !== 1 || repeatY !== 1) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
    }
    return texture;
};

// SVG Definitions
const coinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#FFD700" stroke="#DAA520" stroke-width="4"/>
  <text x="32" y="44" font-family="Arial, sans-serif" font-weight="bold" font-size="36" fill="#DAA520" text-anchor="middle">$</text>
</svg>`;

const crateSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <rect width="128" height="128" fill="#8B4513"/>
  <rect x="4" y="4" width="120" height="120" fill="none" stroke="#654321" stroke-width="8"/>
  <line x1="4" y1="4" x2="124" y2="124" stroke="#654321" stroke-width="8"/>
  <line x1="124" y1="4" x2="4" y2="124" stroke="#654321" stroke-width="8"/>
  <rect x="0" y="0" width="128" height="128" fill="none" stroke="#5C3A21" stroke-width="8"/>
</svg>`;

const trainFrontSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <rect width="128" height="128" fill="${color}"/>
  <rect x="16" y="20" width="96" height="50" fill="#333" rx="10"/> <!-- Windshield -->
  <circle cx="32" cy="100" r="12" fill="#FFFFCC"/> <!-- Headlight L -->
  <circle cx="96" cy="100" r="12" fill="#FFFFCC"/> <!-- Headlight R -->
  <rect x="48" y="100" width="32" height="10" fill="#222"/> <!-- Grill -->
</svg>`;

const trainSideSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="128">
  <rect width="256" height="128" fill="${color}"/>
  <rect x="20" y="30" width="40" height="40" fill="#333" rx="5"/>
  <rect x="80" y="30" width="40" height="40" fill="#333" rx="5"/>
  <rect x="140" y="20" width="30" height="80" fill="#555" rx="2"/> <!-- Door -->
  <rect x="190" y="30" width="40" height="40" fill="#333" rx="5"/>
  <line x1="0" y1="90" x2="256" y2="90" stroke="#222" stroke-width="4"/> <!-- Stripe -->
</svg>`;

const playerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="64" height="64" fill="#FFA07A"/> <!-- Skin tone -->
  <circle cx="20" cy="30" r="5" fill="#222"/> <!-- Eye L -->
  <circle cx="44" cy="30" r="5" fill="#222"/> <!-- Eye R -->
  <path d="M 20 45 Q 32 55 44 45" stroke="#222" stroke-width="4" fill="none"/> <!-- Smile -->
  <rect x="0" y="0" width="64" height="15" fill="#333"/> <!-- Hair -->
</svg>`;

const shirtSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="64" height="64" fill="${color}"/>
  <polygon points="32,10 20,64 44,64" fill="#222" opacity="0.2"/>
</svg>`;

const playerSpriteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <path d="M 40 50 L 88 50 L 96 90 L 32 90 Z" fill="#4169E1"/>
  <circle cx="64" cy="35" r="20" fill="#FFA07A"/>
  <path d="M 44 25 Q 64 10 84 25 L 84 35 L 44 35 Z" fill="#DC143C"/>
  <path d="M 80 25 L 95 30 L 84 35 Z" fill="#DC143C"/>
  <path d="M 40 50 L 25 80" stroke="#FFA07A" stroke-width="8" stroke-linecap="round"/>
  <path d="M 88 50 L 103 80" stroke="#FFA07A" stroke-width="8" stroke-linecap="round"/>
  <path d="M 45 90 L 45 115" stroke="#FFA07A" stroke-width="10" stroke-linecap="round"/>
  <path d="M 83 90 L 83 115" stroke="#FFA07A" stroke-width="10" stroke-linecap="round"/>
  <ellipse cx="45" cy="120" rx="8" ry="5" fill="#333"/>
  <ellipse cx="83" cy="120" rx="8" ry="5" fill="#333"/>
</svg>`;

const hurdleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="64" viewBox="0 0 128 64">
  <rect x="10" y="0" width="8" height="64" fill="#8B4513"/>
  <rect x="110" y="0" width="8" height="64" fill="#8B4513"/>
  <rect x="5" y="10" width="118" height="15" fill="#A0522D"/>
  <rect x="5" y="35" width="118" height="10" fill="#A0522D"/>
</svg>`;

const barrierSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="64" viewBox="0 0 128 64">
  <rect x="0" y="0" width="128" height="64" fill="#fff"/>
  <path d="M 0 64 L 64 0 L 96 0 L 32 64 Z" fill="#ff0000"/>
  <path d="M 64 64 L 128 0 L 128 32 L 96 64 Z" fill="#ff0000"/>
  <path d="M 0 0 L 32 0 L 0 32 Z" fill="#ff0000"/>
  <rect x="0" y="0" width="128" height="64" fill="none" stroke="#222" stroke-width="4"/>
</svg>`;

const magnetSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <path d="M 34 20 L 34 70 A 30 30 0 0 0 94 70 L 94 20 L 74 20 L 74 70 A 10 10 0 0 1 54 70 L 54 20 Z" fill="#E63946"/>
  <rect x="34" y="20" width="20" height="20" fill="#A8DADC"/>
  <rect x="74" y="20" width="20" height="20" fill="#A8DADC"/>
</svg>`;

const shieldSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <path d="M 64 10 L 20 30 L 20 60 C 20 90 64 118 64 118 C 64 118 108 90 108 60 L 108 30 Z" fill="#457B9D" stroke="#F1FAEE" stroke-width="6"/>
  <circle cx="64" cy="60" r="15" fill="#F1FAEE"/>
</svg>`;

const doubleScoreSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <polygon points="64,10 79,50 118,50 86,75 98,115 64,90 30,115 42,75 10,50 49,50" fill="#FFB703"/>
  <text x="64" y="80" font-family="Arial, sans-serif" font-weight="bold" font-size="36" fill="#023047" text-anchor="middle">x2</text>
</svg>`;

const jetpackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect x="30" y="20" width="24" height="60" rx="10" fill="#E63946"/>
  <rect x="74" y="20" width="24" height="60" rx="10" fill="#E63946"/>
  <rect x="54" y="40" width="20" height="20" fill="#1D3557"/>
  <polygon points="32,80 52,80 42,110" fill="#FFB703"/>
  <polygon points="76,80 96,80 86,110" fill="#FFB703"/>
</svg>`;

const sneakersSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <path d="M 20 90 C 20 60 50 60 60 80 L 100 80 C 110 80 110 100 100 100 L 20 100 Z" fill="#8338EC"/>
  <rect x="20" y="100" width="80" height="10" rx="5" fill="#F1FAEE"/>
  <path d="M 60 80 L 40 50 L 50 40 L 70 80 Z" fill="#FF006E"/>
  <circle cx="85" cy="85" r="5" fill="#FFBE0B"/>
</svg>`;

export const textures = {
    coin: createTexture(coinSvg),
    crate: createTexture(crateSvg),
    movingTrainFront: createTexture(trainFrontSvg('#cc0000')),
    movingTrainSide: createTexture(trainSideSvg('#cc0000'), 10, 1),
    movingTrainTop: new THREE.MeshLambertMaterial({ color: 0xcc0000 }),
    staticTrainFront: createTexture(trainFrontSvg('#0044cc')),
    staticTrainSide: createTexture(trainSideSvg('#0044cc'), 10, 1),
    staticTrainTop: new THREE.MeshLambertMaterial({ color: 0x0044cc }),
    playerFace: createTexture(playerSvg),
    playerShirtBlue: createTexture(shirtSvg('#4169E1')),
    playerShirtRed: createTexture(shirtSvg('#DC143C')),
    playerSprite: createTexture(playerSpriteSvg),
    hurdle: createTexture(hurdleSvg),
    barrier: createTexture(barrierSvg),
    magnet: createTexture(magnetSvg),
    shield: createTexture(shieldSvg),
    doubleScore: createTexture(doubleScoreSvg),
    jetpack: createTexture(jetpackSvg),
    sneakers: createTexture(sneakersSvg),
};
