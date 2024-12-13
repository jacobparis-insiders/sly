import { invariant } from "@epic-web/invariant"
import { createCookieSessionStorage } from "@vercel/remix"
import { GitHubProfile, GitHubStrategy } from "remix-auth-github"
import { Authenticator } from "remix-auth"
import { useNavigate } from "@remix-run/react"

invariant(process.env.GITHUB_CLIENT_ID, "GITHUB_CLIENT_ID is not set")
invariant(process.env.GITHUB_CLIENT_SECRET, "GITHUB_CLIENT_SECRET is not set")
invariant(process.env.GITHUB_REDIRECT_URI, "GITHUB_REDIRECT_URI is not set")
invariant(process.env.SESSION_SECRET, "SESSION_SECRET is not set")

//   {
//     "provider": "github",
//     "displayName": "jacobparis",
//     "id": "5633704",
//     "name": {
//         "familyName": "Jacob Paris",
//         "givenName": "Jacob Paris",
//         "middleName": "Jacob Paris"
//     },
//     "emails": [
//         {
//             "value": "jacob@jacobparis.com",
//             "type": "primary"
//         },
//         {
//             "value": "jacob@jacobpariseau.com",
//             "type": "secondary"
//         }
//     ],
//     "photos": [
//         {
//             "value": "https://avatars.githubusercontent.com/u/5633704?v=4"
//         }
//     ],
//     "_json": {
//         "login": "jacobparis",
//         "id": 5633704,
//         "node_id": "MDQ6VXNlcjU2MzM3MDQ=",
//         "avatar_url": "https://avatars.githubusercontent.com/u/5633704?v=4",
//         "gravatar_id": "",
//         "url": "https://api.github.com/users/jacobparis",
//         "html_url": "https://github.com/jacobparis",
//         "followers_url": "https://api.github.com/users/jacobparis/followers",
//         "following_url": "https://api.github.com/users/jacobparis/following{/other_user}",
//         "gists_url": "https://api.github.com/users/jacobparis/gists{/gist_id}",
//         "starred_url": "https://api.github.com/users/jacobparis/starred{/owner}{/repo}",
//         "subscriptions_url": "https://api.github.com/users/jacobparis/subscriptions",
//         "organizations_url": "https://api.github.com/users/jacobparis/orgs",
//         "repos_url": "https://api.github.com/users/jacobparis/repos",
//         "events_url": "https://api.github.com/users/jacobparis/events{/privacy}",
//         "received_events_url": "https://api.github.com/users/jacobparis/received_events",
//         "type": "User",
//         "user_view_type": "public",
//         "site_admin": false,
//         "name": "Jacob Paris",
//         "company": "Fintech",
//         "blog": "https://www.jacobparis.com/",
//         "location": "Toronto",
//         "email": "jacob@jacobparis.com",
//         "hireable": null,
//         "bio": null,
//         "twitter_username": "jacobmparis",
//         "notification_email": "jacob@jacobparis.com",
//         "public_repos": 150,
//         "public_gists": 37,
//         "followers": 225,
//         "following": 18,
//         "created_at": "2013-10-08T00:37:45Z",
//         "updated_at": "2024-11-02T04:18:45Z"
//     }
// }

type UserSession = {
  profile: Omit<GitHubProfile, "_json">
  tokens: {
    access_token: string | number | null
    scope?: string
  }
}
export const authSessionStorage = createCookieSessionStorage<UserSession>({
  cookie: {
    name: "session",
    // TODO: set this in env
    secrets: [process.env.SESSION_SECRET],
  },
})

export let authenticator = new Authenticator<UserSession>(authSessionStorage)

let gitHubStrategy = new GitHubStrategy(
  {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectURI: process.env.GITHUB_REDIRECT_URI,
    scopes: ["gist"],
  },
  async ({ profile, tokens }) => {
    const { _json, ...profileWithoutJson } = profile
    console.log(profile, tokens)
    return {
      profile: profileWithoutJson,
      tokens: {
        access_token: tokens.access_token,
        scope: tokens.scope,
      },
    }
  },
)

authenticator.use(gitHubStrategy)

export function getUser(request: Request) {
  return authenticator.isAuthenticated(request)
}

export function requireUser(request: Request) {
  const user = authenticator.isAuthenticated(request)
  const navigate = useNavigate()
  if (!user) {
    navigate("/login")
  }
}
