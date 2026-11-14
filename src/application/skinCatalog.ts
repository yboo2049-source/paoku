export interface SkinConfig {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  price: number;
  description: string;
}

export const SKINS: SkinConfig[] = [
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    color: '#00f3ff',
    secondaryColor: '#0066ff',
    price: 0,
    description: 'Standard high-speed cyber runner suit.',
  },
  {
    id: 'pink',
    name: 'Neon Magenta',
    color: '#ff007f',
    secondaryColor: '#7928ca',
    price: 50,
    description: 'Vibrant neon synthwave pulse color.',
  },
  {
    id: 'gold',
    name: 'Cyber Gold',
    color: '#ffd700',
    secondaryColor: '#ff8800',
    price: 150,
    description: 'Luxury gold casing with high-voltage luster.',
  },
  {
    id: 'green',
    name: 'Matrix Emerald',
    color: '#00ff66',
    secondaryColor: '#008833',
    price: 300,
    description: 'Hacker-grade green matrix energy grid.',
  },
  {
    id: 'purple',
    name: 'Quantum Void',
    color: '#9d4edd',
    secondaryColor: '#3c096c',
    price: 500,
    description: 'Mysterious dark matter quantum armor.',
  },
];
