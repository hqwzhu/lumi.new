// Branch connection API — employee connects to company server
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { connectToOrg, disconnectFromOrg, getBranchState, syncWorkData } from "../org/branch";

export function mountBranchConnectionRoutes(router: Router, _jwtSecret: string) {
  // Get current branch connection state
  router.get("/branch/state", (req, res) => {
    try {
      res.json(getBranchState());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Connect to org — employee joins a company
  router.post("/branch/connect", requireAuth, async (req, res) => {
    try {
      const { orgId, companyUrl, token } = req.body;
      if (!orgId || !companyUrl) {
        return res.status(400).json({ error: 'orgId and companyUrl are required' });
      }
      const result = await connectToOrg(orgId, companyUrl, token);
      if (result.success) {
        res.json({ success: true, state: getBranchState() });
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Disconnect from org
  router.post("/branch/disconnect", requireAuth, (req, res) => {
    try {
      disconnectFromOrg();
      res.json({ success: true, state: getBranchState() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sync work data on demand
  router.post("/branch/sync", requireAuth, async (req, res) => {
    try {
      const result = await syncWorkData();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
