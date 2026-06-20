const TOKEN = process.env.GITHUB_TOKEN;
const url = "https://api.github.com/repos/chenricky/taiwan-maps/contents/data/user_data.json";

const res = await fetch(url, {
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  },
});

if (res.status === 404) {
  console.log("data/user_data.json: NOT FOUND in repo");
  console.log("The app will create it on first save (github-storage.ts handles 404 gracefully).");
} else if (res.ok) {
  const d = await res.json();
  const content = Buffer.from(d.content, "base64").toString("utf-8");
  console.log("data/user_data.json EXISTS:");
  console.log(content.slice(0, 400));
} else {
  const t = await res.text();
  console.log(`Error ${res.status}:`, t.slice(0, 200));
}
