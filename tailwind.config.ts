// export default {
//   content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
//   theme: { extend: {} },
//   plugins: [],
// };

import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
} satisfies Config