import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

process.env.JWT_SECRET = "test-secret";

expect.extend(matchers);
