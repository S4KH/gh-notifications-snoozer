'use strict'

const Config = require('../config.json')
const Fetcher = require('./Fetcher')
const GitHubAuth = require('./GitHubAuth')

const repoUrlPrefix = 'https://api.github.com/repos/'

function getTask(data) {
  const repoUrl = data.repository_url
  const repository = repoUrl.slice(repoUrlPrefix.length)
  const repositoryOwner = repository.split('/')[0]
  const type = typeof data.pull_request === 'object' ? 'pull' : 'issue'
  return {
    storageKey: `${type}-${data.id}`,
    id: data.id,
    type,
    title: data.title,
    body: data.body,
    state: data.state,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    closedAt: data.closed_at,
    isPullRequest: !!data.pull_request,
    repositoryApiUrl: repoUrl,
    url: data.html_url,
    apiUrl: data.url,
    number: data.number,
    repository,
    repositoryOwner,
    repositoryOwnerUrl: `https://github.com/${repositoryOwner}`,
    repositoryOwnerAvatar: `https://github.com/${repositoryOwner}.png?size=30`,
    user: data.user.login,
    userUrl: data.user.html_url,
    userAvatar: `https://github.com/${data.user.login}.png?size=16`,
    userType: data.user.type,
  }
}

class GitHub extends Fetcher {
  constructor(token) {
    super()
    this.token = token
  }

  // https://developer.github.com/v3/activity/notifications/#list-your-notifications
  getNotifications() {
    return this.get('notifications')
  }

  // https://developer.github.com/v3/search/#search-issues
  getTasks(query = Config.searchQuery) {
    const urlPath = `search/issues?q=${encodeURIComponent(query)}`
    return this.get(urlPath).then(({ items }) => items.map(d => getTask(d)))
  }

  // https://developer.github.com/v3/users/#get-the-authenticated-user
  getCurrentUser() {
    return this.get('user')
  }

  get(relativeUrl) {
    const url = `${Config.githubApiUrl}/${relativeUrl}`
    const options = {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${this.token || GitHubAuth.getToken()}`,
      },
    }
    return super.get(url, options)

  // Sample input:
  // Link: <https://api.github.com/search/code?q=addClass+user%3Amozilla&page=15>; rel="next",
  // <https://api.github.com/search/code?q=addClass+user%3Amozilla&page=34>; rel="last",
  // <https://api.github.com/search/code?q=addClass+user%3Amozilla&page=1>; rel="first",
  // <https://api.github.com/search/code?q=addClass+user%3Amozilla&page=13>; rel="prev"
  //
  // Sample output:
  // https://api.github.com/search/code?q=addClass+user%3Amozilla&page=15
  getNextUrl(link) {
    const urlsAndRels = link.split(',')
    let nextUrl
    urlsAndRels.forEach(str => {
      const urlAndRel = str.trim().split('; ')
      if (urlAndRel[1] === 'rel="next"') {
        const urlInBrackets = urlAndRel[0]
        nextUrl = urlInBrackets.slice(1, urlInBrackets.length - 1)
        return
      }
    })
    return nextUrl
  }
}

module.exports = GitHub
