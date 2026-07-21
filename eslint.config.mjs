import next from 'eslint-config-next'

export default [
  { ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'dist/**'] },
  ...next,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-img-element': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
]
