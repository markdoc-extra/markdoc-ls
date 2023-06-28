<h1 align="center">markdoc-ls</h1>
<p align="center">
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/mohitsinghs/markdoc-ls/ci.yml?style=flat-square&logo=github">
  <a href="https://www.npmjs.com/package/markdoc-ls"><img src="https://img.shields.io/npm/v/markdoc-ls.svg?style=flat-square&logo=npm" alt="npm version"></a>
  <img alt="node-current" src="https://img.shields.io/node/v/markdoc-ls?style=flat-square&logo=nodedotjs">
  <img alt="GitHub" src="https://img.shields.io/github/license/mohitsinghs/markdoc-ls?style=flat-square">
</p>
<p align="center">
  <b>An language server for markdoc</b><br/>
</p>

<br />

## Features

- Config Parsing
- Formatting
- Completion
- Diagnostics

## Using with VSCode

There is [an extension](https://marketplace.visualstudio.com/items?itemName=mohitsingh.markdoc) in VSCode Marketplace and the source code for extension is at [vscode-markdoc](https://github.com/markdoc-extra/vscode-markdoc) repo.

## Using with Neovim

1. Enable syntax highlighting with [tree-sitter-markdoc](https://github.com/markdoc-extra/tree-sitter-markdoc)

2. Define new config for markdoc lanaguage server.

```lua
local configs = require("lspconfig.configs")
if not configs.markdoc_ls then
    configs.markdoc_ls = {
      default_config = {
        cmd = { "markdoc-ls", "--stdio" },
        filetypes = { "markdoc" },
        root_dir = function(fname)
          return lspconfig.util.find_package_json_ancestor(fname)
        end,
        settings = {},
      },
    }
  end
```

3. Setup language server after defining `on_attach` and `capablities`.

```lua
local lspconfig = require("lspconfig")
lspconfig.markdoc_ls.setup({
  on_attach = on_attach,
  capabilities = capabilities,
})
```
