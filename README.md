# onekeyhq/action-auto-tag

auto increment tag for github action workflow.

### usage

```yml
- name: Create Pre-Release Tag
  uses: onekeyhq/action-auto-tag@master
  env:
    GITHUB_TOKEN: ${{ github.token }}
  with:
    # tag prefix, will create pre-release-1 / pre-release-2 auto increament
    prefix: pre-release
    # export git diff between previous tag and current tag
    export_diff: true
    # show request / response log info
    debug: false
```

`onekeyhq/action-auto-tag` action will create `PREV_TAG`, `CURR_TAG` and `DIFF_CHANGE_LOG` environment variable after job succeed.
