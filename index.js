const github = require('@actions/github')
const core = require('@actions/core')

const octokit = new github.getOctokit(process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN);
const { owner, repo } = github.context.repo;

async function main() {
  const prefix = core.getInput('prefix') || 'test';
  const debug = core.getInput('debug') || false;

  function log(message) {
    if (!debug) return;
    console.log(`==== auto-tag action ====: ${message} \n`);
  }

  const { status, data: previousTags } = await octokit.rest.git.listMatchingRefs({
    owner,
    repo,
    ref: `tags/${prefix}`,
  });

  log(`request to listMatchingRefs, tags/${prefix}`);

  if (status !== 200) throw new Error('get previous tags failed, please retry!');

  log(`get previous tags ${JSON.stringify(data)}`);

  const formattedTags = previousTags
    .map((payload) => ({tag: +payload.ref.replace(`refs/tags/${prefix}-`, ''), hash: payload.object.sha}))
    .filter(({tag}) => !Number.isNaN(tag))
    .sort((a, b) => a.tag - b.tag);

  log(`get formatted tags ${JSON.stringify(formattedTags)}`);

  const latestTag = formattedTags.length ? formattedTags[formattedTags.length - 1] : null;
  const latestVersion = latestTag ? latestTag.tag : 0;
  const currentTagVersion = latestVersion + 1;

  const currentTag = `${prefix}-${currentTagVersion}`;

  const createRefStatus = await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/tags/${currentTag}`,
    sha: github.context.sha,
  });

  log(`createRefStatus ${createRefStatus.status} - ${JSON.stringify(createRefStatus.data)}`);

  if (latestVersion) {
    const { status: changelogStatus, data: changelog } = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base: `refs/tags/${latestVersion}`,
      head: `refs/tags/${currentTagVersion}`
    });

    if (changelogStatus !== 200) {
      return core.warn(`fetch commits between refs/tags/${latestVersion} - refs/tags/${currentTagVersion} failed!`);
    };

    log(`get changelog, ${JSON.stringify(changelog.commits)}`);
    const changelogContent = changelog.commits
      .map(
        (commit, i) => {
          return `${i === 0 ? '\n' : ''}${i + 1}) ${commit.commit.message}${
            commit.hasOwnProperty('author')
              ? commit.author.hasOwnProperty('login')
                ? ' (' + commit.author.login + ')'
                : ''
              : ''
          }\n(SHA: ${commit.sha})\n`;
        }
      )
      .join('\n');
      core.exportVariable('DIFF_CHANGE_LOG', changelogContent);
      log(`DIFF_CHANGE_LOG: ${changelogContent}`);
  }

  core.exportVariable('PREV_TAG', latestVersion);
  core.exportVariable('CURR_TAG', currentTagVersion);

  log(`PREV_TAG: ${latestVersion}`);
  log(`CURR_TAG: ${currentTagVersion}`);
}

main();