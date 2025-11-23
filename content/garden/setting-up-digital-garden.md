---
title: My journey of the digital garden
---
I had been using Obsidian on and off for a couple of years, and I stumbled upon [the blue book](https://lyz-code.github.io/blue-book/). The idea of digital garden seemed like something that I could use to help with my perfectionism. I searched for different platforms for setting up digital garden (mkdocs, Obsidian Publish, Quartz, etc.) I wasn't sure (still am not) if I will be able to do this for long, so I chose the free and easy to setup solutions. Quartz seemed to fit my criteria (at least to start playing around)
[Official quartz documentation](https://quartz.jzhao.xyz/) and [this guide](https://notes.nicolevanderhoeven.com/How+to+publish+Obsidian+notes+with+Quartz+on+GitHub+Pages) are good sources to get the digital garden up and running.
I didn't want the old history of Quartz. So I removed the .git folder, and reinitialized the git repo and added remote for my own GitHub repo.
I had 2 obsidian vaults that were both using flat structure, no folders (except for media). 1 for tech notes, other for general notes. I will merge both of these vaults.
I chose to go ahead with tech vault, and make it public to start with.
The official Quartz guide says to open the git cloned directory as Obsidian vault. The problem with doing this is I will have all of these other files used by Quartz in my Obsidian vault. I wanted to keep the notes & Obsidian clean. 
I could create a link to point the `content/` directory to point to my existing vault. However, there are 2 issues with this approach.
1. Since `content/` is a symlink now, the actual notes don't get synced to github. There is no backup if you mess up or lose your local notes.
2. Since the notes are not actually present in GitHub, these probably won't get published (Although I have not tested it).
The other option is to migrate the location of the current vault to `content/` directory in the cloned project.

Now, since the vault is inside the `content/` directory, any obsidian specific settings don't need to be pushed to git. Add the following to `.gitignore`: `content/.obsidian`
