import fs from "fs";
import path from "path";

test("adds permission management to the existing Channel Admin flow without changing creation", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "src/SuperAdminDashboard.jsx"), "utf8");
  expect(source).toContain('/partners/partners/superadmin/create-channel-admin');
  expect(source).toContain('Create Channel Admin');
  expect(source).toMatch(/String\(admin\.channel \|\| ["']{2}\)\.toUpperCase\(\) === ["']BLINKIT["']/);
  expect(source).toMatch(/<ChannelAdminPermissionManager[\s\S]*admin=\{channelAdminForPermissions\}/);
  expect((source.match(/Manage Permissions/g) || [])).toHaveLength(1);
});
