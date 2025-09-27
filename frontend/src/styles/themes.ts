// Theme configuration for all 5 color palette options

export interface ColorPalette {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  accent: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  vibe: string;
  light: ColorPalette & {
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
  };
  dark: ColorPalette & {
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
  };
}

export const themes: Record<string, Theme> = {
  warm: {
    id: 'warm',
    name: 'Warm & Appetizing',
    description: 'Cozy restaurant ambiance, perfect for evening dining',
    vibe: 'Cozy restaurant ambiance, works great for evening dining browsing',
    light: {
      // Deep Burgundy as primary
      primary: {
        50: '#FDF2F4',
        100: '#FCE7EA',
        200: '#F9CFD6',
        300: '#F5A6B6',
        400: '#EE758F',
        500: '#E3486A',
        600: '#D4365A',
        700: '#B22847',
        800: '#8B2635', // Main brand color
        900: '#7A1E2B',
      },
      // Golden Amber as secondary
      secondary: {
        50: '#FFFBF0',
        100: '#FFF8E1',
        200: '#FFEFB3',
        300: '#FFE485',
        400: '#FFD94A',
        500: '#D4A574', // Main golden amber
        600: '#C19660',
        700: '#A6804D',
        800: '#8B6A3A',
        900: '#705527',
      },
      // Soft Peach as accent
      accent: {
        50: '#FFF8F3',
        100: '#FFF0E6',
        200: '#FFE1CC',
        300: '#FFD2B3',
        400: '#FFCC9C', // Main peach
        500: '#FFB885',
        600: '#FF9F5C',
        700: '#FF8633',
        800: '#E6701A',
        900: '#CC5A00',
      },
      // Cream and Browns for neutrals
      neutral: {
        50: '#FFF8E7', // Cream white backgrounds
        100: '#F5F0E1',
        200: '#E8DCC8',
        300: '#DBC8AF',
        400: '#CEB496',
        500: '#A8967D',
        600: '#8A7A64',
        700: '#6C5E4B',
        800: '#5D4037', // Rich brown text
        900: '#4E2A23',
      },
      background: '#FFF8E7',
      surface: '#FFFFFF',
      text: {
        primary: '#5D4037',
        secondary: '#8B2635',
        muted: '#A8967D',
      },
    },
    dark: {
      primary: {
        50: '#2A1B1F',
        100: '#3D2529',
        200: '#502F35',
        300: '#633941',
        400: '#76434D',
        500: '#8B2635',
        600: '#A63041',
        700: '#C13A4D',
        800: '#DC4459',
        900: '#F74E65',
      },
      secondary: {
        50: '#2B2318',
        100: '#3F321A',
        200: '#53411C',
        300: '#67501E',
        400: '#7B5F20',
        500: '#E6B885', // Lighter golden amber
        600: '#F2C799',
        700: '#FED6AD',
        800: '#FFE5C1',
        900: '#FFF4D5',
      },
      accent: {
        50: '#2B1F1A',
        100: '#3F2D26',
        200: '#533B32',
        300: '#67493E',
        400: '#7B574A',
        500: '#D4A574', // Toned down peach
        600: '#E0B888',
        700: '#ECCB9C',
        800: '#F8DEB0',
        900: '#FFF1C4',
      },
      neutral: {
        50: '#1A0D10', // Dark burgundy background
        100: '#2A1B1F', // Card background
        200: '#3A2B2F',
        300: '#4A3B3F',
        400: '#5A4B4F',
        500: '#8A7B7F',
        600: '#AABBAF',
        700: '#CABBBF',
        800: '#EADBDF',
        900: '#F5F5F5', // Warm white text
      },
      background: '#1A0D10',
      surface: '#2A1B1F',
      text: {
        primary: '#F5F5F5',
        secondary: '#EADBDF',
        muted: '#AABBAF',
      },
    },
  },

  fresh: {
    id: 'fresh',
    name: 'Fresh & Modern',
    description: 'Clean and healthy, perfect for health-conscious diners',
    vibe: 'Clean, healthy, perfect for health-conscious diners',
    light: {
      // Forest Green as primary
      primary: {
        50: '#F1F8F2',
        100: '#E3F1E5',
        200: '#C7E3CB',
        300: '#ABD5B1',
        400: '#8FC797',
        500: '#2E7D32', // Main forest green
        600: '#26692A',
        700: '#1E5522',
        800: '#16411A',
        900: '#0E2D12',
      },
      // Bright Orange as secondary
      secondary: {
        50: '#FFF8F0',
        100: '#FFF1E0',
        200: '#FFE3C2',
        300: '#FFD5A3',
        400: '#FFC785',
        500: '#FF6F00', // Main bright orange
        600: '#E66300',
        700: '#CC5700',
        800: '#B34B00',
        900: '#993F00',
      },
      // Sage Green as accent
      accent: {
        50: '#F4F8F4',
        100: '#E9F1E9',
        200: '#D3E3D3',
        300: '#BDD5BD',
        400: '#A7C7A7',
        500: '#81C784', // Main sage green
        600: '#6AB16E',
        700: '#539B58',
        800: '#3C8542',
        900: '#256F2C',
      },
      neutral: {
        50: '#FFFFFF', // Clean white backgrounds
        100: '#F5F5F5',
        200: '#EEEEEE',
        300: '#E0E0E0',
        400: '#BDBDBD',
        500: '#9E9E9E',
        600: '#757575',
        700: '#616161',
        800: '#424242', // Dark gray text
        900: '#212121',
      },
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: {
        primary: '#424242',
        secondary: '#2E7D32',
        muted: '#757575',
      },
    },
    dark: {
      primary: {
        50: '#0D1B0F',
        100: '#1A2F1C',
        200: '#274329',
        300: '#345736',
        400: '#416B43',
        500: '#2E7D32',
        600: '#419547',
        700: '#54AD5C',
        800: '#67C571',
        900: '#7ADD86',
      },
      secondary: {
        50: '#1F1506',
        100: '#332409',
        200: '#47330C',
        300: '#5B420F',
        400: '#6F5112',
        500: '#FF8F00', // Slightly brighter orange
        600: '#FFA033',
        700: '#FFB166',
        800: '#FFC299',
        900: '#FFD3CC',
      },
      accent: {
        50: '#0F1B0F',
        100: '#1F2F1F',
        200: '#2F432F',
        300: '#3F573F',
        400: '#4F6B4F',
        500: '#A5D6A7', // Light sage green
        600: '#B8DFB8',
        700: '#CBE8CB',
        800: '#DEF1DE',
        900: '#F1FAF1',
      },
      neutral: {
        50: '#0D1B0F', // Deep forest background
        100: '#1B2B1D', // Card background
        200: '#293B2B',
        300: '#374B39',
        400: '#455B47',
        500: '#637663',
        600: '#81917F',
        700: '#9FAC9B',
        800: '#BDC7B7',
        900: '#E8F5E8', // Off white text
      },
      background: '#0D1B0F',
      surface: '#1B2B1D',
      text: {
        primary: '#E8F5E8',
        secondary: '#BDC7B7',
        muted: '#81917F',
      },
    },
  },

  premium: {
    id: 'premium',
    name: 'Premium & Sophisticated',
    description: 'Upscale dining, perfect for fine dining experiences',
    vibe: 'Upscale dining, perfect for fine dining and premium experiences',
    light: {
      // Midnight Blue as primary
      primary: {
        50: '#F1F2F9',
        100: '#E3E6F3',
        200: '#C7CDE7',
        300: '#ABB4DB',
        400: '#8F9BCF',
        500: '#1A237E', // Main midnight blue
        600: '#15206B',
        700: '#101C58',
        800: '#0B1945',
        900: '#061532',
      },
      // Gold as secondary
      secondary: {
        50: '#FFFBF0',
        100: '#FFF7E0',
        200: '#FFEFC2',
        300: '#FFE7A3',
        400: '#FFDF85',
        500: '#FFB300', // Main gold
        600: '#E6A200',
        700: '#CC9100',
        800: '#B38000',
        900: '#996F00',
      },
      // Slate Gray as accent
      accent: {
        50: '#F8F9FA',
        100: '#F1F3F4',
        200: '#E3E7EA',
        300: '#D5DBE0',
        400: '#C7CFD6',
        500: '#455A64', // Main slate gray
        600: '#3A4D57',
        700: '#2F404A',
        800: '#24333D',
        900: '#192630',
      },
      neutral: {
        50: '#FAFAFA', // Warm white backgrounds
        100: '#F5F5F5',
        200: '#EEEEEE',
        300: '#E0E0E0',
        400: '#BDBDBD',
        500: '#9E9E9E',
        600: '#757575',
        700: '#616161',
        800: '#424242',
        900: '#212121', // Deep charcoal text
      },
      background: '#FAFAFA',
      surface: '#FFFFFF',
      text: {
        primary: '#212121',
        secondary: '#1A237E',
        muted: '#455A64',
      },
    },
    dark: {
      primary: {
        50: '#0A0C1A',
        100: '#151829',
        200: '#202438',
        300: '#2B3047',
        400: '#363C56',
        500: '#1A237E',
        600: '#2D3693',
        700: '#4049A8',
        800: '#535CBD',
        900: '#666FD2',
      },
      secondary: {
        50: '#1F1A06',
        100: '#33290A',
        200: '#47380E',
        300: '#5B4712',
        400: '#6F5616',
        500: '#FFC107', // More vibrant gold
        600: '#FFCD3A',
        700: '#FFD96D',
        800: '#FFE5A0',
        900: '#FFF1D3',
      },
      accent: {
        50: '#151829',
        100: '#232A3D',
        200: '#313C51',
        300: '#3F4E65',
        400: '#4D6079',
        500: '#90A4AE', // Light blue gray
        600: '#A3B3BE',
        700: '#B6C2CE',
        800: '#C9D1DE',
        900: '#DCE0EE',
      },
      neutral: {
        50: '#0A0C1A', // Rich black background
        100: '#151829', // Card background
        200: '#202438',
        300: '#2B3047',
        400: '#363C56',
        500: '#5A6578',
        600: '#7E8E9A',
        700: '#A2B7BC',
        800: '#C6E0DE',
        900: '#FFFFFF', // Pure white text
      },
      background: '#0A0C1A',
      surface: '#151829',
      text: {
        primary: '#FFFFFF',
        secondary: '#DCE0EE',
        muted: '#90A4AE',
      },
    },
  },

  bold: {
    id: 'bold',
    name: 'Bold & Energetic',
    description: 'Dynamic and vibrant, perfect for trendy food discovery',
    vibe: 'Dynamic, perfect for food discovery and trendy spots',
    light: {
      // Deep Teal as primary
      primary: {
        50: '#F0F9F8',
        100: '#E0F3F1',
        200: '#C2E7E3',
        300: '#A3DBD5',
        400: '#85CFC7',
        500: '#00695C', // Main deep teal
        600: '#005D50',
        700: '#005144',
        800: '#004538',
        900: '#00392C',
      },
      // Vibrant Coral as secondary
      secondary: {
        50: '#FFF4F2',
        100: '#FFE9E5',
        200: '#FFD3CB',
        300: '#FFBDB1',
        400: '#FFA797',
        500: '#FF5722', // Main vibrant coral
        600: '#E64E1F',
        700: '#CC451C',
        800: '#B33C19',
        900: '#993316',
      },
      // Light Teal as accent
      accent: {
        50: '#F2F8F7',
        100: '#E6F1EF',
        200: '#CCE3DF',
        300: '#B3D5CF',
        400: '#99C7BF',
        500: '#4DB6AC', // Main light teal
        600: '#42A399',
        700: '#379086',
        800: '#2C7D73',
        900: '#216A60',
      },
      neutral: {
        50: '#F8F9FA', // Off white backgrounds
        100: '#F1F3F4',
        200: '#E8EAED',
        300: '#DADCE0',
        400: '#BDC1C6',
        500: '#9AA0A6',
        600: '#80868B',
        700: '#5F6368',
        800: '#424242', // Dark gray text
        900: '#202124',
      },
      background: '#F8F9FA',
      surface: '#FFFFFF',
      text: {
        primary: '#424242',
        secondary: '#00695C',
        muted: '#5F6368',
      },
    },
    dark: {
      primary: {
        50: '#003D36',
        100: '#0A5B52',
        200: '#14796E',
        300: '#1E978A',
        400: '#28B5A6',
        500: '#00695C',
        600: '#009688',
        700: '#26A69A',
        800: '#4DB6AC',
        900: '#80CBC4',
      },
      secondary: {
        50: '#1F0A06',
        100: '#33140A',
        200: '#471E0E',
        300: '#5B2812',
        400: '#6F3216',
        500: '#FF6D3A', // Slightly warmer coral
        600: '#FF8666',
        700: '#FF9F92',
        800: '#FFB8BE',
        900: '#FFD1EA',
      },
      accent: {
        50: '#0A1F1C',
        100: '#143330',
        200: '#1E4744',
        300: '#285B58',
        400: '#326F6C',
        500: '#80CBC4', // Mint teal
        600: '#99D5CE',
        700: '#B2DFD8',
        800: '#CBE9E2',
        900: '#E4F3EC',
      },
      neutral: {
        50: '#003D36', // Dark teal background
        100: '#0A1F1C', // Card background
        200: '#142B28',
        300: '#1E3734',
        400: '#284340',
        500: '#4A5C58',
        600: '#6C7570',
        700: '#8E8E88',
        800: '#B0A7A0',
        900: '#E0F2F1', // Light gray text
      },
      background: '#003D36',
      surface: '#0A1F1C',
      text: {
        primary: '#E0F2F1',
        secondary: '#CBE9E2',
        muted: '#8E8E88',
      },
    },
  },

  classic: {
    id: 'classic',
    name: 'Classic & Trustworthy',
    description: 'Reliable and professional, like established platforms',
    vibe: 'Reliable, professional, like established review platforms',
    light: {
      // Navy Blue as primary
      primary: {
        50: '#F1F4F9',
        100: '#E3E9F3',
        200: '#C7D3E7',
        300: '#ABBDDB',
        400: '#8FA7CF',
        500: '#1565C0', // Main navy blue
        600: '#1258A8',
        700: '#0F4B90',
        800: '#0C3E78',
        900: '#093160',
      },
      // Warm Red as secondary
      secondary: {
        50: '#FFF5F5',
        100: '#FFEBEB',
        200: '#FFD7D7',
        300: '#FFC3C3',
        400: '#FFAFAF',
        500: '#D32F2F', // Main warm red
        600: '#C12828',
        700: '#AF2121',
        800: '#9D1A1A',
        900: '#8B1313',
      },
      // Success Green as accent
      accent: {
        50: '#F1F8F2',
        100: '#E3F1E5',
        200: '#C7E3CB',
        300: '#ABD5B1',
        400: '#8FC797',
        500: '#388E3C', // Main success green
        600: '#307F33',
        700: '#28702A',
        800: '#206121',
        900: '#185218',
      },
      neutral: {
        50: '#FFFFFF', // Pure white backgrounds
        100: '#F5F5F5',
        200: '#EEEEEE',
        300: '#E0E0E0',
        400: '#BDBDBD',
        500: '#9E9E9E',
        600: '#757575',
        700: '#616161', // Medium gray secondary text
        800: '#424242',
        900: '#212121',
      },
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: {
        primary: '#212121',
        secondary: '#1565C0',
        muted: '#616161',
      },
    },
    dark: {
      primary: {
        50: '#0A1929',
        100: '#1E2A3A',
        200: '#32404B',
        300: '#46565C',
        400: '#5A6C6D',
        500: '#1565C0',
        600: '#2979CC',
        700: '#3D8DD8',
        800: '#51A1E4',
        900: '#90CAF9',
      },
      secondary: {
        50: '#1F0808',
        100: '#330E0E',
        200: '#471414',
        300: '#5B1A1A',
        400: '#6F2020',
        500: '#F44336', // More vibrant red
        600: '#F66969',
        700: '#F88F9C',
        800: '#FAB5CF',
        900: '#FCDBF2',
      },
      accent: {
        50: '#0F1F0F',
        100: '#1F331F',
        200: '#2F472F',
        300: '#3F5B3F',
        400: '#4F6F4F',
        500: '#66BB6A', // Mint green
        600: '#85C789',
        700: '#A4D3A8',
        800: '#C3DFC7',
        900: '#E2EBE6',
      },
      neutral: {
        50: '#0A1929', // Deep navy background
        100: '#1E2A3A', // Card background
        200: '#32404B',
        300: '#46565C',
        400: '#5A6C6D',
        500: '#7A8A8D',
        600: '#9AA8AD',
        700: '#BAC6CD',
        800: '#DAE4ED',
        900: '#FFFFFF',
      },
      background: '#0A1929',
      surface: '#1E2A3A',
      text: {
        primary: '#FFFFFF',
        secondary: '#90CAF9',
        muted: '#BAC6CD',
      },
    },
  },
};

export type ThemeId = keyof typeof themes;
export type ThemeMode = 'light' | 'dark';

// Utility functions for theme management
export const getTheme = (themeId: ThemeId, mode: ThemeMode = 'light'): Theme[ThemeMode] => {
  return themes[themeId][mode];
};

export const getAllThemes = (): Theme[] => {
  return Object.values(themes);
};

// CSS custom properties generation
export const generateCSSVariables = (themeId: ThemeId, mode: ThemeMode = 'light'): string => {
  const theme = getTheme(themeId, mode);

  return `
    /* Primary Colors */
    --color-primary-50: ${theme.primary[50]};
    --color-primary-100: ${theme.primary[100]};
    --color-primary-200: ${theme.primary[200]};
    --color-primary-300: ${theme.primary[300]};
    --color-primary-400: ${theme.primary[400]};
    --color-primary-500: ${theme.primary[500]};
    --color-primary-600: ${theme.primary[600]};
    --color-primary-700: ${theme.primary[700]};
    --color-primary-800: ${theme.primary[800]};
    --color-primary-900: ${theme.primary[900]};

    /* Secondary Colors */
    --color-secondary-50: ${theme.secondary[50]};
    --color-secondary-100: ${theme.secondary[100]};
    --color-secondary-200: ${theme.secondary[200]};
    --color-secondary-300: ${theme.secondary[300]};
    --color-secondary-400: ${theme.secondary[400]};
    --color-secondary-500: ${theme.secondary[500]};
    --color-secondary-600: ${theme.secondary[600]};
    --color-secondary-700: ${theme.secondary[700]};
    --color-secondary-800: ${theme.secondary[800]};
    --color-secondary-900: ${theme.secondary[900]};

    /* Accent Colors */
    --color-accent-50: ${theme.accent[50]};
    --color-accent-100: ${theme.accent[100]};
    --color-accent-200: ${theme.accent[200]};
    --color-accent-300: ${theme.accent[300]};
    --color-accent-400: ${theme.accent[400]};
    --color-accent-500: ${theme.accent[500]};
    --color-accent-600: ${theme.accent[600]};
    --color-accent-700: ${theme.accent[700]};
    --color-accent-800: ${theme.accent[800]};
    --color-accent-900: ${theme.accent[900]};

    /* Neutral Colors */
    --color-neutral-50: ${theme.neutral[50]};
    --color-neutral-100: ${theme.neutral[100]};
    --color-neutral-200: ${theme.neutral[200]};
    --color-neutral-300: ${theme.neutral[300]};
    --color-neutral-400: ${theme.neutral[400]};
    --color-neutral-500: ${theme.neutral[500]};
    --color-neutral-600: ${theme.neutral[600]};
    --color-neutral-700: ${theme.neutral[700]};
    --color-neutral-800: ${theme.neutral[800]};
    --color-neutral-900: ${theme.neutral[900]};

    /* Background and Surface */
    --color-background: ${theme.background};
    --color-surface: ${theme.surface};

    /* Text Colors */
    --color-text-primary: ${theme.text.primary};
    --color-text-secondary: ${theme.text.secondary};
    --color-text-muted: ${theme.text.muted};

    /* Theme-aware gradients */
    --gradient-primary: linear-gradient(135deg, ${theme.primary[500]} 0%, ${theme.primary[600]} 100%);
    --gradient-secondary: linear-gradient(135deg, ${theme.secondary[500]} 0%, ${theme.secondary[600]} 100%);
    --gradient-accent: linear-gradient(135deg, ${theme.accent[500]} 0%, ${theme.accent[600]} 100%);
    --gradient-sunset: linear-gradient(135deg, ${theme.primary[500]} 0%, ${theme.accent[500]} 50%, ${theme.secondary[500]} 100%);
    --gradient-story: linear-gradient(45deg, ${theme.primary[500]}, ${theme.accent[500]}, ${theme.secondary[500]}, ${theme.primary[400]});
  `;
};