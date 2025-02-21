/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  testTimeout: 10000,
  maxWorkers: 1,
  verbose: false,
  moduleNameMapper: {
    "@/helpers": "<rootDir>/tests/helpers",
    "@/sdk": "<rootDir>/sdk/src",
  },
};

process.env = Object.assign(process.env, {
  ANCHOR_WALLET: "id.json",
});
