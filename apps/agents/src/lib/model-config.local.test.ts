import { getModelFromConfigLocal } from "./model-config.local.js";
import { describe, it, expect } from "@jest/globals";

describe("getModelFromConfigLocal", () => {
  it("should return a Model object", () => {
    const model = getModelFromConfigLocal();
    expect(model).toBeDefined();
  });
});
