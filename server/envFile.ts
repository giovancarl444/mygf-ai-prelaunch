import { readFileSync } from "node:fs";

/**
 * Reads the environment file the way the things that already read it do.
 *
 * The running service gets `/srv/mygf/.env` twice over — once through systemd's
 * `EnvironmentFile=` and once through dotenv — and neither expands anything.
 * The deploy's migration step used to load the same file with
 * `set -a && . /srv/mygf/.env`, which hands it to bash.
 *
 * That difference is invisible until a rotated password happens to contain a
 * `$` or a backtick. Then bash rewrites the credential on its way past, the
 * migration is refused, the server keeps working, and the resulting
 * "access denied" names neither the character responsible nor the shell that
 * ate it. Parsing the file here takes the shell out of the path, so every
 * reader of it agrees by construction rather than by luck.
 *
 * Quote handling follows systemd and dotenv: a matched pair around the whole
 * value is a container and is removed, and nothing else is interpreted.
 */

const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

export function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const raw of contents.split("\n")) {
    const line = raw.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;

    const assignment = ASSIGNMENT.exec(line);
    if (!assignment) continue;

    const [, key, value] = assignment;
    const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
    values[key] = quoted ? quoted[2] : value;
  }

  return values;
}

/**
 * Fills in anything the file defines that the environment does not already.
 *
 * Existing values win, so a variable passed in for one run still overrides the
 * file, and returns the names — never the values — of what it set, which is the
 * most that can safely be logged about a file whose entire purpose is secrets.
 */
export function applyEnvFile(path: string): string[] {
  let contents: string;
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    return [];
  }

  const applied: string[] = [];
  for (const [key, value] of Object.entries(parseEnvFile(contents))) {
    if (process.env[key] !== undefined) continue;
    process.env[key] = value;
    applied.push(key);
  }

  return applied;
}
