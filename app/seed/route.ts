import bcrypt from "bcrypt";
import postgres from "postgres";
import { invoices, customers, revenue, users } from "../lib/placeholder-data";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

export async function GET() {
  try {
    await sql.begin(async (sql) => {
      console.log("Seeding database...");

      // Create the extension if it doesn't exist
      await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

      // Create tables if they don't exist
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          image_url VARCHAR(255) NOT NULL
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          customer_id UUID NOT NULL,
          amount INT NOT NULL,
          status VARCHAR(255) NOT NULL,
          date DATE NOT NULL
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS revenue (
          month VARCHAR(4) NOT NULL UNIQUE,
          revenue INT NOT NULL
        );
      `;

      console.log("Tables created.");

      // Insert users
      console.log("Seeding users...");
      const insertedUsers = await Promise.all(
        users.map(async (user) => ({
          ...user,
          password: await bcrypt.hash(user.password, 10),
        }))
      );
      await sql`
        INSERT INTO users ${sql(
          insertedUsers,
          "id",
          "name",
          "email",
          "password"
        )}
        ON CONFLICT (id) DO NOTHING;
      `;

      // Insert customers
      console.log("Seeding customers...");
      await sql`
        INSERT INTO customers ${sql(
          customers,
          "id",
          "name",
          "email",
          "image_url"
        )}
        ON CONFLICT (id) DO NOTHING;
      `;

      // Insert invoices
      console.log("Seeding invoices...");
      await sql`
        INSERT INTO invoices ${sql(
          invoices,
          "customer_id",
          "amount",
          "status",
          "date"
        )}
        ON CONFLICT (id) DO NOTHING;
      `;

      // Insert revenue
      console.log("Seeding revenue...");
      await sql`
        INSERT INTO revenue ${sql(revenue, "month", "revenue")}
        ON CONFLICT (month) DO NOTHING;
      `;

      console.log("Finished seeding data.");
    });

    return Response.json({ message: "Database seeded successfully" });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
