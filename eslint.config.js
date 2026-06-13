module.exports = [
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                // Custom Globals from utils.js
                calculateEmissions: "readonly",
                calculateSimulatorSavings: "readonly",
                getCarbonGrade: "readonly",
                // Browser globals
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                parseFloat: "readonly",
                parseInt: "readonly",
                Math: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                alert: "readonly",
                lucide: "readonly",
                Chart: "readonly",
                // Node globals
                module: "readonly",
                require: "readonly",
                process: "readonly",
                // Jest globals
                describe: "readonly",
                test: "readonly",
                expect: "readonly",
                jest: "readonly",
                beforeEach: "readonly"
            }
        },
        rules: {
            "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
            "no-undef": "error",
            "eqeqeq": "error",
            "no-var": "error",
            "prefer-const": "error",
            "curly": "error",
            "no-eval": "error",
            "no-implied-eval": "error",
            "no-shadow": "error",
            "no-duplicate-imports": "error",
            "no-unused-expressions": "error"
        }
    }
];
