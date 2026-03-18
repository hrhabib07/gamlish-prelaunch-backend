import express from "express";
import cors from "cors";
import leadRoutes from "./routes/lead.route";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use("/api/lead", leadRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

export default app;
