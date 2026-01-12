---
title: How this digital garden came to be
publish: "true"
status: half-baked
---
> [!note] Disclaimer
>This is not another setup guide. These are my experiences and some customizations that I did. Putting it out there so that someone might find useful.

I had been using Obsidian on and off for a couple of years, and I stumbled upon [the blue book](https://lyz-code.github.io/blue-book/) (while searching for the [blue book of Kubernetes](https://github.com/rohitg00/DevOps_Books/blob/main/The%20Kubernetes%20Book%20(Nigel%20Poulton)%20(z-lib.org).pdf)). The idea of digital garden seemed like something that I could use to help with my perfectionism. I searched for different platforms for setting up digital garden (mkdocs, Obsidian Publish, Quartz, etc.). I wasn't sure (still am not) if I will be able to do this for long, so I chose the free and easy to setup solutions. Quartz seemed to fit my criteria (at least to start playing around).
# Setup
[Official quartz documentation](https://quartz.jzhao.xyz/) and [this guide](https://notes.nicolevanderhoeven.com/How+to+publish+Obsidian+notes+with+Quartz+on+GitHub+Pages) are good sources to get the digital garden up and running. Here are the configuration changes I made that might be useful to others.
# Remove quartz git history
I didn't want the old history of Quartz to bulk up my git repo. So I removed the .git folder, reinitialized the git and added remote for my own GitHub repo.
# Adding Obsidian vault to Quartz
The official Quartz guide says to open the git cloned directory as Obsidian vault. The problem with doing this is I will have all of these other files used by Quartz in my Obsidian vault. I wanted to keep the notes & Obsidian clean. 
I could create a link to point the `content/` directory to point to my existing vault. However, there are 2 issues with this approach.
1. Since `content/` is a symlink now, the actual notes don't get synced to github. There is no backup if you mess up or lose your local notes.
2. Since the notes are not actually present in GitHub, these probably won't get published (Although I have not tested it).
The other option is to migrate the location of the current vault to `content/` directory in the cloned project. I did the same, and don't worry about the `.obsidian` directory being forwarded to Git, it is already there in the `.gitignore` file.
# Broken Line Breaks
By default, quartz does not single newline as line break. I had to put 2 newlines, and that separated content into different paragraphs. This can be fixed in quartz 4 by adding `Plugin.HardLineBreaks(),` in the `quartz.config.ts` under `plugins.transformers` section.
```ts
plugins: {
  transformers: [
    Plugin.FrontMatter(),
    Plugin.CreatedModifiedDate({
      priority: ["frontmatter", "git", "filesystem"],
    }),
    Plugin.SyntaxHighlighting({
      theme: {
        light: "github-light",
        dark: "github-dark",
      },
      keepBackground: false,
    }),
    Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
    Plugin.GitHubFlavoredMarkdown(),

    // 🔻 Add the following: Treat Single Newline as <br>
    Plugin.HardLineBreaks(),

    Plugin.TableOfContents(),
    Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
    Plugin.Description(),
    Plugin.Latex({ renderEngine: "katex" }),
  ],
  filters: [Plugin.ExplicitPublish()],
  emitters: [
    Plugin.AliasRedirects(),
    Plugin.ComponentResources(),
    Plugin.ContentPage(),
    Plugin.FolderPage(),
    Plugin.TagPage(),
    Plugin.ContentIndex({
      enableSiteMap: true,
      enableRSS: true,
    }),
    Plugin.Assets(),
    Plugin.Static(),
    Plugin.Favicon(),
    Plugin.NotFoundPage(),
    // Comment out CustomOgImages to speed up build time
    Plugin.CustomOgImages(),
  ],
}
```
