// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
    // 1. OBRIGATÓRIO: Define onde o Tailwind deve procurar pelas classes.
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}", 
    ],
    
    // 2. Dark mode: usa a classe .dark no <html> (ThemeContext / index.html).
    // NÃO usar ['class', "class"] — isso faz o Tailwind usar seletor .class e quebra o tema.
    darkMode: 'class',
    theme: {
    	extend: {
    		colors: {
    			'brand-s3e': '#0a1a2f',
    			'brand-blue': '#3B82F6',
    			'brand-blue-light': '#EFF6FF',
    			'brand-green': '#10B981',
    			'brand-purple': '#8B5CF6',
    			'brand-orange': '#F97316',
    			'brand-red': '#EF4444',
    			'brand-gray': {
    				'50': '#F9FAFB',
    				'100': '#F3F4F6',
    				'200': '#E5E7EB',
    				'300': '#D1D5DB',
    				'400': '#9CA3AF',
    				'500': '#6B7280',
    				'600': '#4B5563',
    				'700': '#374151',
    				'800': '#1F2937',
    				'900': '#11182C'
    			},
    			'dark-bg': '#0a1a2f',
    			'dark-card': '#1E293B',
    			'dark-border': '#334155',
    			'dark-hover': '#334155',
    			'dark-text': '#F8FAFC',
    			'dark-text-secondary': '#CBD5E1',
    			sidebar: {
    				DEFAULT: 'hsl(var(--sidebar-background))',
    				foreground: 'hsl(var(--sidebar-foreground))',
    				primary: 'hsl(var(--sidebar-primary))',
    				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    				accent: 'hsl(var(--sidebar-accent))',
    				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    				border: 'hsl(var(--sidebar-border))',
    				ring: 'hsl(var(--sidebar-ring))'
    			}
    		},
    		keyframes: {
    			fadeIn: {
    				'0%': {
    					opacity: '0'
    				},
    				'100%': {
    					opacity: '1'
    				}
    			},
    			slideUp: {
    				'0%': {
    					transform: 'translateY(20px)',
    					opacity: '0'
    				},
    				'100%': {
    					transform: 'translateY(0)',
    					opacity: '1'
    				}
    			},
    			scaleIn: {
    				'0%': {
    					transform: 'scale(0.95)',
    					opacity: '0'
    				},
    				'100%': {
    					transform: 'scale(1)',
    					opacity: '1'
    				}
    			}
    		},
    		animation: {
    			fadeIn: 'fadeIn 0.2s ease-out',
    			slideUp: 'slideUp 0.3s ease-out',
    			scaleIn: 'scaleIn 0.2s ease-out'
    		}
    	}
    },
    
    // 3. Plugin vazio, mas necessário
    plugins: [],
  }