const path = require("path");

const envFile = process.env.EDUCATION_ENV_FILE
  ? path.resolve(process.env.EDUCATION_ENV_FILE)
  : path.resolve(
      __dirname,
      process.env.NODE_ENV === "development" ? "../.env.development" : "../.env"
    );

require("dotenv").config({ path: envFile });

function databaseName() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "");
}

function assertEducationDatabase() {
  const name = databaseName();
  const isNonProduction = /(test|staging|development|dev)$/i.test(name);
  const isDryRun = process.argv.includes("--dry-run");
  if (
    !isNonProduction &&
    !isDryRun &&
    process.env.CONFIRM_EDUCATION_DATABASE !== name
  ) {
    throw new Error(
      `Refusing to modify database "${name}". Set CONFIRM_EDUCATION_DATABASE=${name} to continue.`
    );
  }
  return name;
}

module.exports = { assertEducationDatabase, databaseName };
