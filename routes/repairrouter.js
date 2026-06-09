import express from "express";
import {
  getRepairs,
  createRepair,
  updateRepair,
  lookupCustomerForRepair,
} from "../Controller/repairCont.js";

const repairRouter = express.Router();

repairRouter.get("/customer-lookup", lookupCustomerForRepair);
repairRouter.get("/", getRepairs);
repairRouter.post("/", createRepair);
repairRouter.patch("/:repairId", updateRepair);

export default repairRouter;
