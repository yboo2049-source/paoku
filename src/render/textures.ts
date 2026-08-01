import * as THREE from 'three';

const createTexture = (svg: string) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const loader = new THREE.TextureLoader();
    const texture = loader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
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

export const textures = {
    coin: createTexture(coinSvg),
    crate: createTexture(crateSvg),
    movingTrainFront: createTexture(trainFrontSvg('#cc0000')),
    movingTrainSide: createTexture(trainSideSvg('#cc0000')),
    movingTrainTop: new THREE.MeshLambertMaterial({ color: 0xcc0000 }),
    staticTrainFront: createTexture(trainFrontSvg('#0044cc')),
    staticTrainSide: createTexture(trainSideSvg('#0044cc')),
    staticTrainTop: new THREE.MeshLambertMaterial({ color: 0x0044cc }),
    playerFace: createTexture(playerSvg),
    playerShirtBlue: createTexture(shirtSvg('#4169E1')),
    playerShirtRed: createTexture(shirtSvg('#DC143C')),
};
