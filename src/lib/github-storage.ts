import { AppData } from "@/types";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO_OWNER = process.env.REPO_OWNER || "";
const REPO_NAME = process.env.REPO_NAME || "";
const FILE_PATH = "data/taiwan-maps-data.json";
const BRANCH = "main";

const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

let cachedData: AppData | null = null;
let cachedSha: string | null = null;

export function getDefaultAppData(): AppData {
  return {
    bookmarks: [],
    stickyNotes: [],
    todos: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchAppData(): Promise<AppData> {
  if (cachedData) return cachedData;

  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    console.warn("GitHub credentials not configured, using in-memory data");
    cachedData = getDefaultAppData();
    return cachedData;
  }

  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
    });

    if (res.status === 404) {
      cachedData = getDefaultAppData();
      return cachedData;
    }

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`);
    }

    const data = await res.json();
    cachedSha = data.sha;
    const content = Buffer.from(data.content, "base64").toString("utf-8");
    cachedData = JSON.parse(content) as AppData;
    return cachedData;
  } catch (error) {
    console.error("Failed to fetch app data:", error);
    cachedData = getDefaultAppData();
    return cachedData;
  }
}

export async function saveAppData(data: AppData): Promise<boolean> {
  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    console.warn("GitHub credentials not configured, using in-memory data only");
    cachedData = data;
    return true;
  }

  data.updatedAt = new Date().toISOString();
  cachedData = data;

  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

  try {
    // First, get current sha if not cached
    if (!cachedSha) {
      const res = await fetch(GITHUB_API, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
        cache: "no-store",
      });
      if (res.ok) {
        const fileData = await res.json();
        cachedSha = fileData.sha;
      }
    }

    const body: Record<string, unknown> = {
      message: "Update taiwan-maps data",
      content,
      branch: BRANCH,
    };

    if (cachedSha) {
      body.sha = cachedSha;
    }

    const res = await fetch(GITHUB_API, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`GitHub API save error: ${res.status} - ${errBody}`);
    }

    const result = await res.json();
    cachedSha = result.content.sha;
    return true;
  } catch (error) {
    console.error("Failed to save app data:", error);
    return false;
  }
}

export function clearCache() {
  cachedData = null;
  cachedSha = null;
}