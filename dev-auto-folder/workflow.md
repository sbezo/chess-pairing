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
git merge dev -m "merge message"
git push origin main
git checkout dev
```
