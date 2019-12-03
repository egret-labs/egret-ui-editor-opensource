module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
        'no-var': "error",
        '@typescript-eslint/consistent-type-definitions': [
            "warn",
            "interface"
		],
		"prefer-const": ["error", {
			"destructuring": "any",
			"ignoreReadBeforeAssign": false
		}]
	},
	parserOptions: {
		"ecmaVersion": 6,
		"sourceType": "module",
		"ecmaFeatures": {
			"modules": true
		},
		"project": "./tsconfig.json"
	  }
}