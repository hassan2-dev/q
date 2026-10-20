const fs = require("fs");
const home = process.env.USERPROFILE;
const state = JSON.parse(fs.readFileSync(`${home}/.expo/state.json`, "utf8"));
const session = state.auth.sessionSecret;

async function gq(query) {
  const r = await fetch("https://api.expo.dev/graphql", {
    method: "POST",
    headers: { "expo-session": session, "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return r.json();
}

(async () => {
  const t = await gq(
    `{ __type(name: "GoogleServiceAccountKey") { fields { name } } }`
  );
  console.log("fields", JSON.stringify(t, null, 2));

  // Look for any android credentials across apps that might have play submit keys
  const keys = await gq(`{
    me {
      accounts {
        name
        googleServiceAccountKeys {
          id
          projectIdentifier
          clientEmail
        }
      }
    }
  }`);
  console.log(JSON.stringify(keys, null, 2));
})();
