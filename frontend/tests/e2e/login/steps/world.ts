// /workspaces/simpler-grants-gov/frontend/tests/e2e/login/steps/world.ts
import { setWorldConstructor, World } from "@cucumber/cucumber";
import { Browser, BrowserContext, Page } from "playwright";

export class CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
}

setWorldConstructor(CustomWorld);
