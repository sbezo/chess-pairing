# 1. Modify something in dev branch.  
> Never do directly in main branch.  

```
git checkout dev
git pull origin dev    # make sure dev is up to date
```

Now you can code something interesting. 

Commit + sync in VSCode. 
Github actions deploy dev changes to subpage, there you can test it [here](https://chess-pairing.online/dev-auto-folder) 

## After testing you can Merge dev to main from VSCode:
```
git checkout main
git pull origin main
git merge dev
git push origin main
git checkout dev
```

# 2. Modify something in feature branch ###
> Again - Never do directly in main branch.   
```
git checkout dev
git pull origin dev
git checkout -b new-feature
```

Now you can code some nice new feature

Commit and test locally on your localhost.. 

# Now Merge to dev:
```
git checkout dev
git pull origin dev
git merge new-feature
git push origin dev
```

Test it [here](https://chess-pairing.online/dev-auto-folder) 

# And finally Merge dev to main
```
git checkout main
git pull origin main
git merge dev
git push origin main
git checkout dev
```