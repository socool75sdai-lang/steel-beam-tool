// Source: InfraBuild Standard Section Tables (Grade 300), reference: InfraBuild Profile Series Catalogue.
import type { SectionType, SteelSection } from '@/types';

const UB: SteelSection[] = [
  { designation: '150UB14.0', type: 'UB', mass_kg_m: 14.0, d: 150, bf: 75,  tf: 7.0,  tw: 5.0, Ag: 1780, Ix: 6.66e6,  Sx: 102e3, Zx: 88.8e3,  Iy: 0.495e6, J: 27.0e3,  Iw: 2.53e9 },
  { designation: '150UB18.0', type: 'UB', mass_kg_m: 18.0, d: 155, bf: 75,  tf: 9.5,  tw: 6.0, Ag: 2300, Ix: 9.05e6,  Sx: 135e3, Zx: 117e3,   Iy: 0.672e6, J: 58.0e3,  Iw: 3.56e9 },
  { designation: '180UB16.1', type: 'UB', mass_kg_m: 16.1, d: 173, bf: 90,  tf: 7.0,  tw: 4.5, Ag: 2040, Ix: 9.63e6,  Sx: 123e3, Zx: 111e3,   Iy: 0.853e6, J: 26.5e3,  Iw: 5.79e9 },
  { designation: '180UB18.1', type: 'UB', mass_kg_m: 18.1, d: 175, bf: 90,  tf: 8.0,  tw: 5.0, Ag: 2300, Ix: 11.3e6,  Sx: 142e3, Zx: 129e3,   Iy: 0.975e6, J: 39.0e3,  Iw: 6.69e9 },
  { designation: '180UB22.2', type: 'UB', mass_kg_m: 22.2, d: 179, bf: 90,  tf: 10.0, tw: 6.0, Ag: 2820, Ix: 15.3e6,  Sx: 195e3, Zx: 171e3,   Iy: 1.22e6,  J: 81.6e3,  Iw: 8.71e9 },
  { designation: '200UB18.2', type: 'UB', mass_kg_m: 18.2, d: 198, bf: 99,  tf: 7.0,  tw: 4.5, Ag: 2320, Ix: 15.8e6,  Sx: 180e3, Zx: 160e3,   Iy: 1.14e6,  J: 30.0e3,  Iw: 10.5e9 },
  { designation: '200UB22.3', type: 'UB', mass_kg_m: 22.3, d: 202, bf: 133, tf: 7.0,  tw: 5.0, Ag: 2870, Ix: 21.0e6,  Sx: 232e3, Zx: 209e3,   Iy: 2.75e6,  J: 38.6e3,  Iw: 25.5e9 },
  { designation: '200UB25.4', type: 'UB', mass_kg_m: 25.4, d: 203, bf: 133, tf: 7.8,  tw: 5.8, Ag: 3230, Ix: 23.6e6,  Sx: 260e3, Zx: 232e3,   Iy: 3.06e6,  J: 53.4e3,  Iw: 28.6e9 },
  { designation: '200UB29.8', type: 'UB', mass_kg_m: 29.8, d: 207, bf: 134, tf: 9.6,  tw: 6.3, Ag: 3820, Ix: 29.1e6,  Sx: 316e3, Zx: 281e3,   Iy: 3.86e6,  J: 89.9e3,  Iw: 36.7e9 },
  { designation: '250UB25.7', type: 'UB', mass_kg_m: 25.7, d: 248, bf: 124, tf: 8.0,  tw: 5.0, Ag: 3270, Ix: 35.4e6,  Sx: 319e3, Zx: 285e3,   Iy: 2.55e6,  J: 51.5e3,  Iw: 36.7e9 },
  { designation: '250UB31.4', type: 'UB', mass_kg_m: 31.4, d: 252, bf: 146, tf: 8.6,  tw: 6.1, Ag: 4010, Ix: 44.5e6,  Sx: 397e3, Zx: 354e3,   Iy: 4.47e6,  J: 73.6e3,  Iw: 65.9e9 },
  { designation: '250UB37.3', type: 'UB', mass_kg_m: 37.3, d: 256, bf: 146, tf: 10.9, tw: 6.4, Ag: 4750, Ix: 55.7e6,  Sx: 486e3, Zx: 435e3,   Iy: 5.66e6,  J: 124e3,   Iw: 85.2e9 },
  { designation: '310UB32.0', type: 'UB', mass_kg_m: 32.0, d: 298, bf: 149, tf: 8.0,  tw: 5.5, Ag: 4080, Ix: 63.2e6,  Sx: 475e3, Zx: 424e3,   Iy: 4.42e6,  J: 65.2e3,  Iw: 92.9e9 },
  { designation: '310UB40.4', type: 'UB', mass_kg_m: 40.4, d: 304, bf: 165, tf: 10.2, tw: 6.1, Ag: 5210, Ix: 86.4e6,  Sx: 633e3, Zx: 569e3,   Iy: 7.65e6,  J: 117e3,   Iw: 165e9 },
  { designation: '310UB46.2', type: 'UB', mass_kg_m: 46.2, d: 307, bf: 166, tf: 11.8, tw: 6.7, Ag: 5930, Ix: 100e6,   Sx: 729e3, Zx: 654e3,   Iy: 9.01e6,  J: 168e3,   Iw: 197e9 },
  { designation: '360UB44.7', type: 'UB', mass_kg_m: 44.7, d: 352, bf: 171, tf: 9.7,  tw: 6.9, Ag: 5720, Ix: 121e6,   Sx: 777e3, Zx: 689e3,   Iy: 8.10e6,  J: 119e3,   Iw: 237e9 },
  { designation: '360UB50.7', type: 'UB', mass_kg_m: 50.7, d: 356, bf: 171, tf: 11.5, tw: 7.3, Ag: 6470, Ix: 142e6,   Sx: 897e3, Zx: 798e3,   Iy: 9.60e6,  J: 174e3,   Iw: 284e9 },
  { designation: '360UB56.7', type: 'UB', mass_kg_m: 56.7, d: 359, bf: 172, tf: 13.0, tw: 8.0, Ag: 7240, Ix: 161e6,   Sx: 1010e3, Zx: 899e3,  Iy: 11.0e6,  J: 241e3,   Iw: 330e9 },
  { designation: '410UB53.7', type: 'UB', mass_kg_m: 53.7, d: 403, bf: 178, tf: 10.9, tw: 7.6, Ag: 6840, Ix: 188e6,   Sx: 1060e3, Zx: 933e3,  Iy: 10.3e6,  J: 187e3,   Iw: 394e9 },
  { designation: '410UB59.7', type: 'UB', mass_kg_m: 59.7, d: 406, bf: 178, tf: 12.8, tw: 7.8, Ag: 7610, Ix: 216e6,   Sx: 1200e3, Zx: 1060e3, Iy: 12.1e6,  J: 268e3,   Iw: 466e9 },
  { designation: '460UB67.1', type: 'UB', mass_kg_m: 67.1, d: 454, bf: 190, tf: 12.7, tw: 8.5, Ag: 8580, Ix: 296e6,   Sx: 1470e3, Zx: 1300e3, Iy: 14.5e6,  J: 290e3,   Iw: 708e9 },
  { designation: '460UB74.6', type: 'UB', mass_kg_m: 74.6, d: 457, bf: 190, tf: 14.5, tw: 9.1, Ag: 9520, Ix: 335e6,   Sx: 1660e3, Zx: 1460e3, Iy: 16.6e6,  J: 393e3,   Iw: 815e9 },
  { designation: '460UB82.1', type: 'UB', mass_kg_m: 82.1, d: 460, bf: 191, tf: 16.0, tw: 9.9, Ag: 10500, Ix: 372e6,  Sx: 1840e3, Zx: 1610e3, Iy: 18.6e6,  J: 526e3,   Iw: 919e9 },
  { designation: '530UB82.0', type: 'UB', mass_kg_m: 82.0, d: 528, bf: 209, tf: 13.2, tw: 9.6, Ag: 10500, Ix: 477e6,  Sx: 2070e3, Zx: 1810e3, Iy: 20.1e6,  J: 444e3,   Iw: 1330e9 },
  { designation: '530UB92.4', type: 'UB', mass_kg_m: 92.4, d: 533, bf: 209, tf: 15.6, tw: 10.2, Ag: 11800, Ix: 554e6, Sx: 2370e3, Zx: 2080e3, Iy: 23.8e6,  J: 657e3,   Iw: 1590e9 },
  { designation: '610UB101',  type: 'UB', mass_kg_m: 101,  d: 602, bf: 228, tf: 14.8, tw: 10.6, Ag: 13000, Ix: 761e6, Sx: 2900e3, Zx: 2530e3, Iy: 29.3e6,  J: 701e3,   Iw: 2530e9 },
  { designation: '610UB113',  type: 'UB', mass_kg_m: 113,  d: 607, bf: 228, tf: 17.3, tw: 11.2, Ag: 14500, Ix: 875e6, Sx: 3290e3, Zx: 2880e3, Iy: 34.3e6,  J: 1040e3,  Iw: 2980e9 },
  { designation: '610UB125',  type: 'UB', mass_kg_m: 125,  d: 612, bf: 229, tf: 19.6, tw: 11.9, Ag: 16000, Ix: 986e6, Sx: 3680e3, Zx: 3220e3, Iy: 39.3e6,  J: 1430e3,  Iw: 3450e9 },
];

const UC: SteelSection[] = [
  { designation: '100UC14.8', type: 'UC', mass_kg_m: 14.8, d: 97,  bf: 99,  tf: 7.0,  tw: 5.0, Ag: 1890, Ix: 3.18e6,  Sx: 73.6e3,  Zx: 65.6e3,  Iy: 1.14e6,  J: 34.8e3,  Iw: 2.40e9 },
  { designation: '150UC23.4', type: 'UC', mass_kg_m: 23.4, d: 152, bf: 152, tf: 6.8,  tw: 6.1, Ag: 2980, Ix: 12.6e6,  Sx: 184e3,   Zx: 166e3,   Iy: 3.98e6,  J: 38.8e3,  Iw: 20.2e9 },
  { designation: '150UC30.0', type: 'UC', mass_kg_m: 30.0, d: 158, bf: 153, tf: 9.4,  tw: 6.6, Ag: 3860, Ix: 17.6e6,  Sx: 250e3,   Zx: 222e3,   Iy: 5.62e6,  J: 92.0e3,  Iw: 29.7e9 },
  { designation: '150UC37.2', type: 'UC', mass_kg_m: 37.2, d: 162, bf: 154, tf: 11.5, tw: 8.1, Ag: 4730, Ix: 22.2e6,  Sx: 310e3,   Zx: 274e3,   Iy: 7.01e6,  J: 168e3,   Iw: 38.4e9 },
  { designation: '200UC46.2', type: 'UC', mass_kg_m: 46.2, d: 203, bf: 203, tf: 11.0, tw: 7.3, Ag: 5900, Ix: 45.9e6,  Sx: 495e3,   Zx: 451e3,   Iy: 15.3e6,  J: 197e3,   Iw: 142e9 },
  { designation: '200UC52.2', type: 'UC', mass_kg_m: 52.2, d: 206, bf: 204, tf: 12.5, tw: 8.0, Ag: 6660, Ix: 52.8e6,  Sx: 570e3,   Zx: 512e3,   Iy: 17.7e6,  J: 280e3,   Iw: 167e9 },
  { designation: '200UC59.5', type: 'UC', mass_kg_m: 59.5, d: 210, bf: 205, tf: 14.2, tw: 9.3, Ag: 7580, Ix: 61.3e6,  Sx: 656e3,   Zx: 584e3,   Iy: 20.4e6,  J: 415e3,   Iw: 197e9 },
  { designation: '250UC72.9', type: 'UC', mass_kg_m: 72.9, d: 254, bf: 254, tf: 14.2, tw: 8.6, Ag: 9290, Ix: 114e6,   Sx: 990e3,   Zx: 897e3,   Iy: 38.8e6,  J: 510e3,   Iw: 575e9 },
  { designation: '250UC89.5', type: 'UC', mass_kg_m: 89.5, d: 260, bf: 256, tf: 17.3, tw: 10.5, Ag: 11400, Ix: 143e6,  Sx: 1230e3,  Zx: 1100e3,  Iy: 48.4e6,  J: 933e3,   Iw: 736e9 },
  { designation: '310UC96.8', type: 'UC', mass_kg_m: 96.8, d: 308, bf: 305, tf: 15.4, tw: 9.9, Ag: 12300, Ix: 222e6,  Sx: 1600e3,  Zx: 1440e3,  Iy: 72.9e6,  J: 826e3,   Iw: 1560e9 },
  { designation: '310UC118',  type: 'UC', mass_kg_m: 118,  d: 315, bf: 307, tf: 18.7, tw: 11.9, Ag: 15000, Ix: 277e6, Sx: 1960e3,  Zx: 1760e3,  Iy: 90.2e6,  J: 1450e3,  Iw: 1980e9 },
  { designation: '310UC137',  type: 'UC', mass_kg_m: 137,  d: 320, bf: 309, tf: 21.7, tw: 13.8, Ag: 17500, Ix: 329e6, Sx: 2300e3,  Zx: 2060e3,  Iy: 107e6,   J: 2240e3,  Iw: 2390e9 },
  { designation: '310UC158',  type: 'UC', mass_kg_m: 158,  d: 327, bf: 311, tf: 25.0, tw: 15.7, Ag: 20100, Ix: 388e6, Sx: 2680e3,  Zx: 2370e3,  Iy: 125e6,   J: 3420e3,  Iw: 2860e9 },
];

const PFC: SteelSection[] = [
  { designation: '75PFC',  type: 'PFC', mass_kg_m: 5.92,  d: 75,  bf: 40,  tf: 6.1,  tw: 3.8, Ag: 753,  Ix: 0.683e6, Sx: 22.6e3,  Zx: 18.2e3,  Iy: 0.0890e6, J: 9.34e3,  Iw: 0.121e9 },
  { designation: '100PFC', type: 'PFC', mass_kg_m: 8.33,  d: 100, bf: 50,  tf: 6.7,  tw: 4.2, Ag: 1060, Ix: 1.67e6,  Sx: 41.7e3,  Zx: 33.4e3,  Iy: 0.190e6,  J: 14.4e3,  Iw: 0.412e9 },
  { designation: '125PFC', type: 'PFC', mass_kg_m: 11.9,  d: 125, bf: 65,  tf: 7.5,  tw: 4.7, Ag: 1520, Ix: 3.85e6,  Sx: 75.1e3,  Zx: 61.6e3,  Iy: 0.408e6,  J: 23.3e3,  Iw: 1.31e9 },
  { designation: '150PFC', type: 'PFC', mass_kg_m: 17.7,  d: 150, bf: 75,  tf: 9.5,  tw: 6.0, Ag: 2250, Ix: 8.34e6,  Sx: 135e3,   Zx: 111e3,   Iy: 0.795e6,  J: 51.7e3,  Iw: 3.46e9 },
  { designation: '180PFC', type: 'PFC', mass_kg_m: 20.9,  d: 180, bf: 75,  tf: 10.5, tw: 6.1, Ag: 2660, Ix: 14.1e6,  Sx: 195e3,   Zx: 156e3,   Iy: 0.847e6,  J: 67.9e3,  Iw: 5.45e9 },
  { designation: '200PFC', type: 'PFC', mass_kg_m: 22.9,  d: 200, bf: 75,  tf: 11.0, tw: 6.1, Ag: 2920, Ix: 19.1e6,  Sx: 236e3,   Zx: 191e3,   Iy: 0.862e6,  J: 79.8e3,  Iw: 6.94e9 },
  { designation: '230PFC', type: 'PFC', mass_kg_m: 25.1,  d: 230, bf: 75,  tf: 12.0, tw: 6.5, Ag: 3200, Ix: 26.8e6,  Sx: 285e3,   Zx: 233e3,   Iy: 0.935e6,  J: 105e3,   Iw: 9.69e9 },
  { designation: '250PFC', type: 'PFC', mass_kg_m: 35.5,  d: 250, bf: 90,  tf: 15.0, tw: 8.0, Ag: 4520, Ix: 45.0e6,  Sx: 425e3,   Zx: 360e3,   Iy: 1.85e6,   J: 252e3,   Iw: 22.5e9 },
  { designation: '300PFC', type: 'PFC', mass_kg_m: 40.1,  d: 300, bf: 90,  tf: 16.0, tw: 8.0, Ag: 5110, Ix: 72.4e6,  Sx: 568e3,   Zx: 483e3,   Iy: 1.99e6,   J: 311e3,   Iw: 35.0e9 },
  { designation: '380PFC', type: 'PFC', mass_kg_m: 55.2,  d: 380, bf: 100, tf: 17.5, tw: 10.0, Ag: 7030, Ix: 152e6,   Sx: 933e3,   Zx: 802e3,   Iy: 3.20e6,   J: 510e3,   Iw: 87.0e9 },
];

const EA: SteelSection[] = [
  { designation: 'EA50x50x3',    type: 'EA', mass_kg_m: 2.31,  d: 50,  bf: 50,  tf: 3.0,  tw: 3.0,  Ag: 294,  Ix: 0.0723e6, Sx: 2.85e3,  Zx: 2.00e3,  Iy: 0.0723e6, J: 0.882e3,  Iw: 0 },
  { designation: 'EA50x50x5',    type: 'EA', mass_kg_m: 3.77,  d: 50,  bf: 50,  tf: 5.0,  tw: 5.0,  Ag: 480,  Ix: 0.113e6,  Sx: 4.55e3,  Zx: 3.20e3,  Iy: 0.113e6,  J: 4.00e3,   Iw: 0 },
  { designation: 'EA65x65x6',    type: 'EA', mass_kg_m: 5.91,  d: 65,  bf: 65,  tf: 6.0,  tw: 6.0,  Ag: 753,  Ix: 0.296e6,  Sx: 9.18e3,  Zx: 6.43e3,  Iy: 0.296e6,  J: 9.04e3,   Iw: 0 },
  { designation: 'EA75x75x6',    type: 'EA', mass_kg_m: 6.85,  d: 75,  bf: 75,  tf: 6.0,  tw: 6.0,  Ag: 873,  Ix: 0.460e6,  Sx: 12.4e3,  Zx: 8.55e3,  Iy: 0.460e6,  J: 10.5e3,   Iw: 0 },
  { designation: 'EA75x75x8',    type: 'EA', mass_kg_m: 8.99,  d: 75,  bf: 75,  tf: 8.0,  tw: 8.0,  Ag: 1150, Ix: 0.589e6,  Sx: 16.2e3,  Zx: 11.1e3,  Iy: 0.589e6,  J: 24.5e3,   Iw: 0 },
  { designation: 'EA90x90x8',    type: 'EA', mass_kg_m: 10.9,  d: 90,  bf: 90,  tf: 8.0,  tw: 8.0,  Ag: 1390, Ix: 1.04e6,   Sx: 23.6e3,  Zx: 16.4e3,  Iy: 1.04e6,   J: 29.6e3,   Iw: 0 },
  { designation: 'EA100x100x8',  type: 'EA', mass_kg_m: 12.2,  d: 100, bf: 100, tf: 8.0,  tw: 8.0,  Ag: 1550, Ix: 1.45e6,   Sx: 29.4e3,  Zx: 20.3e3,  Iy: 1.45e6,   J: 33.1e3,   Iw: 0 },
  { designation: 'EA100x100x10', type: 'EA', mass_kg_m: 15.0,  d: 100, bf: 100, tf: 10.0, tw: 10.0, Ag: 1910, Ix: 1.76e6,   Sx: 36.4e3,  Zx: 24.9e3,  Iy: 1.76e6,   J: 63.7e3,   Iw: 0 },
  { designation: 'EA125x125x10', type: 'EA', mass_kg_m: 19.0,  d: 125, bf: 125, tf: 10.0, tw: 10.0, Ag: 2420, Ix: 3.55e6,   Sx: 58.4e3,  Zx: 39.9e3,  Iy: 3.55e6,   J: 80.7e3,   Iw: 0 },
  { designation: 'EA150x150x12', type: 'EA', mass_kg_m: 27.3,  d: 150, bf: 150, tf: 12.0, tw: 12.0, Ag: 3480, Ix: 7.34e6,   Sx: 100e3,   Zx: 68.8e3,  Iy: 7.34e6,   J: 167e3,    Iw: 0 },
  { designation: 'EA200x200x13', type: 'EA', mass_kg_m: 39.7,  d: 200, bf: 200, tf: 13.0, tw: 13.0, Ag: 5060, Ix: 19.2e6,   Sx: 197e3,   Zx: 134e3,   Iy: 19.2e6,   J: 285e3,    Iw: 0 },
  { designation: 'EA200x200x16', type: 'EA', mass_kg_m: 48.7,  d: 200, bf: 200, tf: 16.0, tw: 16.0, Ag: 6190, Ix: 23.2e6,   Sx: 241e3,   Zx: 164e3,   Iy: 23.2e6,   J: 528e3,    Iw: 0 },
];

const SHS: SteelSection[] = [
  { designation: 'SHS50x50x3',     type: 'SHS', mass_kg_m: 4.25,  d: 50,  bf: 50,  tf: 3.0, tw: 3.0, Ag: 542,  Ix: 0.206e6,  Sx: 9.71e3,  Zx: 8.24e3,  Iy: 0.206e6,  J: 0.327e6,  Iw: 0 },
  { designation: 'SHS65x65x4',     type: 'SHS', mass_kg_m: 7.23,  d: 65,  bf: 65,  tf: 4.0, tw: 4.0, Ag: 921,  Ix: 0.566e6,  Sx: 20.8e3,  Zx: 17.4e3,  Iy: 0.566e6,  J: 0.898e6,  Iw: 0 },
  { designation: 'SHS75x75x4',     type: 'SHS', mass_kg_m: 8.49,  d: 75,  bf: 75,  tf: 4.0, tw: 4.0, Ag: 1081, Ix: 0.892e6,  Sx: 28.5e3,  Zx: 23.8e3,  Iy: 0.892e6,  J: 1.41e6,   Iw: 0 },
  { designation: 'SHS100x100x5',   type: 'SHS', mass_kg_m: 14.2,  d: 100, bf: 100, tf: 5.0, tw: 5.0, Ag: 1810, Ix: 2.71e6,   Sx: 63.7e3,  Zx: 54.2e3,  Iy: 2.71e6,   J: 4.28e6,   Iw: 0 },
  { designation: 'SHS100x100x6',   type: 'SHS', mass_kg_m: 16.9,  d: 100, bf: 100, tf: 6.0, tw: 6.0, Ag: 2150, Ix: 3.16e6,   Sx: 75.0e3,  Zx: 63.2e3,  Iy: 3.16e6,   J: 5.02e6,   Iw: 0 },
  { designation: 'SHS125x125x6',   type: 'SHS', mass_kg_m: 21.4,  d: 125, bf: 125, tf: 6.0, tw: 6.0, Ag: 2730, Ix: 6.42e6,   Sx: 121e3,   Zx: 103e3,   Iy: 6.42e6,   J: 10.1e6,   Iw: 0 },
  { designation: 'SHS150x150x6',   type: 'SHS', mass_kg_m: 26.1,  d: 150, bf: 150, tf: 6.0, tw: 6.0, Ag: 3330, Ix: 11.4e6,   Sx: 178e3,   Zx: 152e3,   Iy: 11.4e6,   J: 17.9e6,   Iw: 0 },
  { designation: 'SHS150x150x9',   type: 'SHS', mass_kg_m: 37.7,  d: 150, bf: 150, tf: 9.0, tw: 9.0, Ag: 4810, Ix: 15.7e6,   Sx: 253e3,   Zx: 209e3,   Iy: 15.7e6,   J: 25.0e6,   Iw: 0 },
  { designation: 'SHS200x200x9',   type: 'SHS', mass_kg_m: 51.8,  d: 200, bf: 200, tf: 9.0, tw: 9.0, Ag: 6610, Ix: 40.4e6,   Sx: 477e3,   Zx: 404e3,   Iy: 40.4e6,   J: 63.5e6,   Iw: 0 },
  { designation: 'SHS250x250x9',   type: 'SHS', mass_kg_m: 65.9,  d: 250, bf: 250, tf: 9.0, tw: 9.0, Ag: 8410, Ix: 82.4e6,   Sx: 770e3,   Zx: 659e3,   Iy: 82.4e6,   J: 128e6,    Iw: 0 },
];

const RHS: SteelSection[] = [
  { designation: 'RHS75x50x3',     type: 'RHS', mass_kg_m: 5.35,  d: 75,  bf: 50,  tf: 3.0,  tw: 3.0,  Ag: 681,  Ix: 0.485e6,  Sx: 15.8e3,  Zx: 12.9e3,  Iy: 0.252e6,  J: 0.561e6,  Iw: 0 },
  { designation: 'RHS100x50x4',    type: 'RHS', mass_kg_m: 8.49,  d: 100, bf: 50,  tf: 4.0,  tw: 4.0,  Ag: 1081, Ix: 1.31e6,   Sx: 33.4e3,  Zx: 26.2e3,  Iy: 0.418e6,  J: 1.13e6,   Iw: 0 },
  { designation: 'RHS100x75x5',    type: 'RHS', mass_kg_m: 12.7,  d: 100, bf: 75,  tf: 5.0,  tw: 5.0,  Ag: 1610, Ix: 2.04e6,   Sx: 51.0e3,  Zx: 40.8e3,  Iy: 1.27e6,   J: 2.30e6,   Iw: 0 },
  { designation: 'RHS125x75x5',    type: 'RHS', mass_kg_m: 14.2,  d: 125, bf: 75,  tf: 5.0,  tw: 5.0,  Ag: 1810, Ix: 3.43e6,   Sx: 73.3e3,  Zx: 55.0e3,  Iy: 1.48e6,   J: 2.94e6,   Iw: 0 },
  { designation: 'RHS150x100x5',   type: 'RHS', mass_kg_m: 18.7,  d: 150, bf: 100, tf: 5.0,  tw: 5.0,  Ag: 2380, Ix: 6.96e6,   Sx: 122e3,   Zx: 92.7e3,  Iy: 3.74e6,   J: 7.18e6,   Iw: 0 },
  { designation: 'RHS150x100x6',   type: 'RHS', mass_kg_m: 22.1,  d: 150, bf: 100, tf: 6.0,  tw: 6.0,  Ag: 2810, Ix: 8.06e6,   Sx: 144e3,   Zx: 107e3,   Iy: 4.33e6,   J: 8.40e6,   Iw: 0 },
  { designation: 'RHS200x100x6',   type: 'RHS', mass_kg_m: 26.8,  d: 200, bf: 100, tf: 6.0,  tw: 6.0,  Ag: 3410, Ix: 16.7e6,   Sx: 226e3,   Zx: 167e3,   Iy: 5.36e6,   J: 12.0e6,   Iw: 0 },
  { designation: 'RHS200x150x6',   type: 'RHS', mass_kg_m: 31.5,  d: 200, bf: 150, tf: 6.0,  tw: 6.0,  Ag: 4010, Ix: 22.0e6,   Sx: 269e3,   Zx: 220e3,   Iy: 14.0e6,   J: 25.6e6,   Iw: 0 },
  { designation: 'RHS250x150x6',   type: 'RHS', mass_kg_m: 36.2,  d: 250, bf: 150, tf: 6.0,  tw: 6.0,  Ag: 4610, Ix: 36.1e6,   Sx: 384e3,   Zx: 289e3,   Iy: 16.5e6,   J: 33.2e6,   Iw: 0 },
  { designation: 'RHS300x200x10',  type: 'RHS', mass_kg_m: 73.7,  d: 300, bf: 200, tf: 10.0, tw: 10.0, Ag: 9390, Ix: 110e6,    Sx: 902e3,   Zx: 733e3,   Iy: 58.8e6,   J: 117e6,    Iw: 0 },
];

// WB (Welded Beam) dimensions and Ix/Iy sourced from steelweb.info (Australian welded beam
// tables, AS/NZS 3679.2 Grade 300). Ag, Sx, Zx, J, Iw computed from plate geometry using exact
// thin-walled doubly-symmetric I-section formulas (welded sections have no fillet radii, so the
// closed form is catalogue-accurate — reproduces published Ix/Iy to within 0.3%).
const WB: SteelSection[] = [
  { designation: '700WB115',  type: 'WB', mass_kg_m: 115, d: 692,  bf: 250, tf: 16, tw: 10, Ag: 14600, Ix: 1150e6, Sx: 3790e3,  Zx: 3320e3,  Iy: 41.7e6, J: 903e3,   Iw: 4760e9 },
  { designation: '700WB130',  type: 'WB', mass_kg_m: 130, d: 700,  bf: 250, tf: 20, tw: 10, Ag: 16600, Ix: 1400e6, Sx: 4490e3,  Zx: 4000e3,  Iy: 52.1e6, J: 1550e3,  Iw: 6020e9 },
  { designation: '700WB150',  type: 'WB', mass_kg_m: 150, d: 710,  bf: 250, tf: 25, tw: 10, Ag: 19100, Ix: 1710e6, Sx: 5370e3,  Zx: 4820e3,  Iy: 65.2e6, J: 2820e3,  Iw: 7650e9 },
  { designation: '700WB173',  type: 'WB', mass_kg_m: 173, d: 716,  bf: 275, tf: 28, tw: 10, Ag: 22000, Ix: 2060e6, Sx: 6390e3,  Zx: 5750e3,  Iy: 97.1e6, J: 4240e3,  Iw: 11500e9 },
  { designation: '800WB122',  type: 'WB', mass_kg_m: 122, d: 792,  bf: 250, tf: 16, tw: 10, Ag: 15600, Ix: 1570e6, Sx: 4550e3,  Zx: 3960e3,  Iy: 41.7e6, J: 936e3,   Iw: 6280e9 },
  { designation: '800WB146',  type: 'WB', mass_kg_m: 146, d: 800,  bf: 275, tf: 20, tw: 10, Ag: 18600, Ix: 2040e6, Sx: 5730e3,  Zx: 5100e3,  Iy: 69.4e6, J: 1720e3,  Iw: 10600e9 },
  { designation: '800WB168',  type: 'WB', mass_kg_m: 168, d: 810,  bf: 275, tf: 25, tw: 10, Ag: 21350, Ix: 2480e6, Sx: 6840e3,  Zx: 6120e3,  Iy: 86.7e6, J: 3120e3,  Iw: 13400e9 },
  { designation: '800WB192',  type: 'WB', mass_kg_m: 192, d: 816,  bf: 300, tf: 28, tw: 10, Ag: 24400, Ix: 2970e6, Sx: 8060e3,  Zx: 7280e3,  Iy: 126e6,  J: 4640e3,  Iw: 19600e9 },
  { designation: '900WB175',  type: 'WB', mass_kg_m: 175, d: 900,  bf: 300, tf: 20, tw: 12, Ag: 22320, Ix: 2960e6, Sx: 7500e3,  Zx: 6580e3,  Iy: 90.1e6, J: 2100e3,  Iw: 17400e9 },
  { designation: '900WB218',  type: 'WB', mass_kg_m: 218, d: 910,  bf: 350, tf: 25, tw: 12, Ag: 27820, Ix: 4060e6, Sx: 9960e3,  Zx: 8920e3,  Iy: 179e6,  J: 4140e3,  Iw: 35000e9 },
  { designation: '900WB257',  type: 'WB', mass_kg_m: 257, d: 916,  bf: 400, tf: 28, tw: 12, Ag: 32720, Ix: 5050e6, Sx: 12200e3, Zx: 11000e3, Iy: 299e6,  J: 6350e3,  Iw: 58900e9 },
  { designation: '1000WB215', type: 'WB', mass_kg_m: 215, d: 1000, bf: 300, tf: 20, tw: 16, Ag: 27360, Ix: 4060e6, Sx: 9570e3,  Zx: 8120e3,  Iy: 90.3e6, J: 2910e3,  Iw: 21700e9 },
  { designation: '1000WB258', type: 'WB', mass_kg_m: 258, d: 1010, bf: 350, tf: 25, tw: 16, Ag: 32860, Ix: 5430e6, Sx: 12300e3, Zx: 10800e3, Iy: 179e6,  J: 4960e3,  Iw: 43400e9 },
  { designation: '1000WB322', type: 'WB', mass_kg_m: 322, d: 1024, bf: 400, tf: 32, tw: 16, Ag: 40960, Ix: 7480e6, Sx: 16400e3, Zx: 14600e3, Iy: 342e6,  J: 10000e3, Iw: 84100e9 },
];

const CHS: SteelSection[] = [
  { designation: 'CHS48.3x3.2',    type: 'CHS', mass_kg_m: 3.56,  d: 48.3,  bf: 48.3,  tf: 3.2, tw: 3.2, Ag: 453,  Ix: 0.117e6,  Sx: 6.52e3,  Zx: 4.83e3,  Iy: 0.117e6,  J: 0.234e6,  Iw: 0 },
  { designation: 'CHS60.3x3.6',    type: 'CHS', mass_kg_m: 5.03,  d: 60.3,  bf: 60.3,  tf: 3.6, tw: 3.6, Ag: 641,  Ix: 0.262e6,  Sx: 11.5e3,  Zx: 8.69e3,  Iy: 0.262e6,  J: 0.524e6,  Iw: 0 },
  { designation: 'CHS76.1x3.6',    type: 'CHS', mass_kg_m: 6.44,  d: 76.1,  bf: 76.1,  tf: 3.6, tw: 3.6, Ag: 820,  Ix: 0.544e6,  Sx: 18.7e3,  Zx: 14.3e3,  Iy: 0.544e6,  J: 1.09e6,   Iw: 0 },
  { designation: 'CHS88.9x4.0',    type: 'CHS', mass_kg_m: 8.38,  d: 88.9,  bf: 88.9,  tf: 4.0, tw: 4.0, Ag: 1067, Ix: 0.963e6,  Sx: 28.4e3,  Zx: 21.7e3,  Iy: 0.963e6,  J: 1.93e6,   Iw: 0 },
  { designation: 'CHS114.3x4.5',   type: 'CHS', mass_kg_m: 12.2,  d: 114.3, bf: 114.3, tf: 4.5, tw: 4.5, Ag: 1554, Ix: 2.34e6,   Sx: 53.4e3,  Zx: 41.0e3,  Iy: 2.34e6,   J: 4.69e6,   Iw: 0 },
  { designation: 'CHS139.7x5.0',   type: 'CHS', mass_kg_m: 16.6,  d: 139.7, bf: 139.7, tf: 5.0, tw: 5.0, Ag: 2116, Ix: 4.79e6,   Sx: 89.4e3,  Zx: 68.6e3,  Iy: 4.79e6,   J: 9.59e6,   Iw: 0 },
  { designation: 'CHS168.3x6.4',   type: 'CHS', mass_kg_m: 25.6,  d: 168.3, bf: 168.3, tf: 6.4, tw: 6.4, Ag: 3257, Ix: 10.7e6,   Sx: 162e3,   Zx: 127e3,   Iy: 10.7e6,   J: 21.4e6,   Iw: 0 },
  { designation: 'CHS219.1x6.4',   type: 'CHS', mass_kg_m: 33.6,  d: 219.1, bf: 219.1, tf: 6.4, tw: 6.4, Ag: 4279, Ix: 24.5e6,   Sx: 287e3,   Zx: 223e3,   Iy: 24.5e6,   J: 48.9e6,   Iw: 0 },
  { designation: 'CHS273.1x6.4',   type: 'CHS', mass_kg_m: 42.1,  d: 273.1, bf: 273.1, tf: 6.4, tw: 6.4, Ag: 5365, Ix: 48.5e6,   Sx: 451e3,   Zx: 355e3,   Iy: 48.5e6,   J: 97.0e6,   Iw: 0 },
  { designation: 'CHS323.9x9.5',   type: 'CHS', mass_kg_m: 73.6,  d: 323.9, bf: 323.9, tf: 9.5, tw: 9.5, Ag: 9378, Ix: 116e6,    Sx: 902e3,   Zx: 718e3,   Iy: 116e6,    J: 233e6,    Iw: 0 },
];

const sortByMass = (a: SteelSection, b: SteelSection): number => a.mass_kg_m - b.mass_kg_m;

export const SECTION_DATABASE: Record<SectionType, SteelSection[]> = {
  UB:  [...UB].sort(sortByMass),
  UC:  [...UC].sort(sortByMass),
  PFC: [...PFC].sort(sortByMass),
  EA:  [...EA].sort(sortByMass),
  SHS: [...SHS].sort(sortByMass),
  CHS: [...CHS].sort(sortByMass),
  RHS: [...RHS].sort(sortByMass),
  WB:  [...WB].sort(sortByMass),
};
