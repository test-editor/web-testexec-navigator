#!/bin/bash
tag_author="srvte tagging"
last_author=`git show --format="%aN" HEAD | head -n 1`
echo "Last author was: $last_author"
if [ "$last_author" == "$tag_author" ]; then
  echo "Author of last commit seems to be the one that is reserved for pushing tags."
  echo "No new version is tagged!"
else
  package_name=`cat package.json | grep name | awk '{ print $2 }' | sed -e 's/"\(.*\)",/\1/g'`
  if [[ $package_name = \@testeditor/* ]]; then
    echo "package name used = $package_name"
    echo "tag with new patch level version, since publishing is wanted"
    old_version=`npm view $package_name version`
    echo "old version (before tagging) was v$old_version"
    if [ "$GH_EMAIL" == "" -o "$GH_TOKEN" == "" ]; then
      echo "tagging is not done since email and token for push into github is missing!"
    else
      # configure for git push to work automatically
      github_project=`git config --get remote.origin.url | sed 's|.*\(/[^/]*/[^/]*\)$|\1|g'`
      git config user.name "$tag_author"
      git config user.email "$GH_EMAIL"
      git remote remove origin || true
      git remote add origin https://$GH_TOKEN@github.com$github_project
      git remote -v # show the now configured remotes
      git checkout - # if detached, try to return to a regular branch
      git fetch # necessary to make origin/master known
      git branch --set-upstream-to=origin/master
      git remote -v # show the now configured remotes
      git status # show some info
      git tag # show tag info
      npm version patch # create git commit and tag automatically!
      # postversion action in package.json will execute git push && git push --tags
      new_version=`npm view @testeditor/testexec-details version`
      echo "tagged now with v$new_version"
    fi
  else
    echo "package name '$package_name' does not start with @testeditor/ which seems to be wrong!"
  fi
fi
