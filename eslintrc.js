module.exports = {
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
  ],
  plugins: ['jest'],
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  ignorePatterns: ["src/lib/**"],
  rules: {
    // Add any specific rule overrides here
  },
};
