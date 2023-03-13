<h1 align="center">markdoc-ls</h1>
<p align="center">
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/mohitsinghs/markdoc-ls/ci.yml?style=flat-square&logo=github">
  <a href="https://www.npmjs.com/package/markdoc-ls"><img src="https://img.shields.io/npm/v/markdoc-ls.svg?style=flat-square&logo=npm" alt="npm version"></a>
  <img alt="node-current" src="https://img.shields.io/node/v/markdoc-ls?style=flat-square&logo=nodedotjs">
  <img alt="GitHub" src="https://img.shields.io/github/license/mohitsinghs/markdoc-ls?style=flat-square">
</p>
<p align="center">
  <b>An experimental language server for markdoc</b><br/>
</p>

<br />

## Using with Neovim

This requires that you've already enabled markdoc language support with [tree-sitter-markdoc](https://github.com/markdoc-extra/tree-sitter-markdoc).

1. Define new config for markdoc lanaguage server.

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

2. Setup language server after defining `on_attach` and `capablities`.

```lua
local lspconfig = require("lspconfig")
lspconfig.markdoc_ls.setup({
  on_attach = on_attach,
  capabilities = capabilities,
})
```
