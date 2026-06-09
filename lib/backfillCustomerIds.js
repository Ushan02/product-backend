import Users from "../models/Users.js";
import { generateUniqueCustomerId } from "./customerId.js";

export async function backfillCustomerIds() {
  const users = await Users.find({
    role: "customer",
    $or: [{ customerId: null }, { customerId: { $exists: false } }, { customerId: "" }],
  });

  if (users.length === 0) return 0;

  let count = 0;
  for (const user of users) {
    user.customerId = await generateUniqueCustomerId();
    await user.save();
    count += 1;
  }

  console.log(`Assigned customer IDs to ${count} existing customer(s).`);
  return count;
}
