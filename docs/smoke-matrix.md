# Smoke Matrix

Use this local matrix after runtime/editor refactors:

```bash
.venv/bin/invoke smoke-code-questions
```

The default matrix covers:

- Java CodeMirror through TeaVM (`JavaSmoke`)
- Java Blockly through TeaVM (`JavaBlocklySmoke`)
- Java assignment multi-file projects
- Java content-block multi-file projects
- SQL autocomplete
- SQL database-source loading

Python browser regression is broader and can be included explicitly:

```bash
.venv/bin/invoke smoke-code-questions --include-python
```

The task assumes the local H5P host is running at `http://localhost:8080`.
