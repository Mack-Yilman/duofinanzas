import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// Dynamic import ensures dotenv runs first
async function run() {
  const { createUser } = await import('./lib/repos/users');
  try {
    const user = await createUser({
      name: "Test User",
      email: "test_dynamic@example.com",
      passwordHash: "12345"
    });
    console.log("Success:", user);
  } catch (err: any) {
    console.error("Notion API Error Status:", err.status);
    console.error("Notion API Error Code:", err.code);
    console.error("Notion API Error Message:", err.message);
    console.error("Full Body:", err.body);
  }
}
run();
