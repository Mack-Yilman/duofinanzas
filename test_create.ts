import { createUser } from "./lib/repos/users";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function run() {
  try {
    const user = await createUser({
      name: "Test User",
      email: "test2@example.com",
      passwordHash: "12345"
    });
    console.log("Success:", user);
  } catch (err: any) {
    console.error("Notion API Error:", err.body || err.message || err);
  }
}
run();
