import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { DbResetUtil } from "./db-reset.util";

describe("Sanity (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    try {
      console.log("Sanity: Compilation...");
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
        providers: [DbResetUtil],
      }).compile();

      console.log("Sanity: Init App...");
      app = moduleFixture.createNestApplication();
      await app.init();

      console.log("Sanity: Reset DB...");
      const dbReset = app.get(DbResetUtil);
      await dbReset.reset();
      console.log("Sanity: Success!");
    } catch (e) {
      console.error("SANITY APP INIT FAILED", e);
      throw e;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("should pass", () => {
    expect(true).toBe(true);
  });
});
