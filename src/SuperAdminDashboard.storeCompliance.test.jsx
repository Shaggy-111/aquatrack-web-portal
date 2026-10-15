import fs from "fs";
import path from "path";

// Dashboard has a large unrelated render surface; verify the surgical integration boundary.
test("keeps one outer tab and limits new SuperAdmin bypass to Store Compliance", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "src/SuperAdminDashboard.jsx"), "utf8");
  expect(source).toContain('import StoreCompliance from "./pages/StoreCompliance"');
  expect(source.match(/storeCompliance:\s*\(\) => <StoreCompliance \/>/g)).toHaveLength(1);
  expect(source).toContain('!(currentTab === "storeCompliance" && isSuperAdminRole)');
  expect(source).not.toContain('import StoreComplianceDashboard from');
});
