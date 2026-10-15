import fs from "fs";
import path from "path";

test("reuses BlinkitReports for the exact backend-driven Channel Admin tab", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "src/ChannelAdminDashboard.jsx"), "utf8");
  expect(source).toMatch(/import BlinkitReports from ["']\.\/pages\/BlinkitReports["']/);
  expect(source).toMatch(/case ["']blinkitReports["']:\s*return <BlinkitReports\s*\/>;/);
  expect((source.match(/case ["']blinkitReports["']:/g) || [])).toHaveLength(1);
  expect(source).not.toMatch(/sidebar[^\n]*Blinkit Report/i);
});
