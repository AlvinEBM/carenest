// =================================================================
// Configuración de Jest (pruebas automatizadas)
//
//   npm test                  → unitarias + integración
//   npm run test:unit         → solo unitarias (no necesita MySQL)
//   npm run test:integracion  → integración contra MySQL real
//   npm run test:cobertura    → reporte de cobertura (carpeta coverage/)
// =================================================================
const base = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    },
    setupFiles: ['<rootDir>/tests/helpers/entorno.ts'],
};

module.exports = {
    projects: [
        {
            ...base,
            displayName: 'unitarias',
            testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
        },
        {
            ...base,
            displayName: 'integracion',
            testMatch: ['<rootDir>/tests/integracion/**/*.test.ts'],
            globalSetup: '<rootDir>/tests/helpers/globalSetup.ts',
        },
    ],
    collectCoverageFrom: [
        'src/modules/medicos/**/*.ts',
        'src/modules/pagos/**/*.ts',
        'src/modules/citas/domain/**/*.ts',
        'src/modules/administracion/application/**/*.ts',
        'src/shared/**/*.ts',
        '!src/shared/cron/**',
        '!src/**/*.model.ts',
    ],
    coverageReporters: ['text-summary', 'html', 'lcov'],
};
