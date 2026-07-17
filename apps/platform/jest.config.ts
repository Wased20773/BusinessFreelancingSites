import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
    dir: "./",
});

const config: Config = {
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    testEnvironment: "jsdom",

    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },

    testMatch: [
        "<rootDir>/src/__tests__/**/*.test.ts",
        "<rootDir>/src/__tests__/**/*.test.tsx",
    ],

    clearMocks: true,
};

export default createJestConfig(config);