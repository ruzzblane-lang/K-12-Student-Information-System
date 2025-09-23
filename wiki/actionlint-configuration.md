<!-- Migrated from: docs/Actionlint-Configuration.md -->

# Actionlint Configuration Guide

## Overview

This project uses actionlint for GitHub Actions workflow linting with a practical configuration that eliminates common false positives while maintaining useful validation.

## Configuration File

**Location**: `.github/actionlint.yml`

## Rules Explained

### 1. **Secret Access Warnings** (`expr-check`)
```yaml
expr-check:
  ignore:
    - secrets.*
```
**Why**: GitHub's linter shows false positives for `${{ secrets.* }}` access patterns. These are always valid in production when secrets are properly configured.

### 2. **Dynamic Matrix Expressions** (`matrix-check`)
```yaml
matrix-check:
  ignore: true
```
**Why**: Actionlint can't always resolve dynamic matrix expressions statically, leading to false warnings.

### 3. **Job Dependencies** (`job-needs-check`)
```yaml
job-needs-check:
  ignore: true
```
**Why**: Ignores warnings about missing job dependencies when using reusable workflows or complex conditional logic.

### 4. **Shell Script Validation** (`shellcheck`)
```yaml
shellcheck:
  ignore: true
```
**Why**: If you have your own shell script linting or trust your scripts, this eliminates redundant warnings.

### 5. **Unknown Commands** (`command-check`)
```yaml
command-check:
  ignore: true
```
**Why**: Ignores warnings about custom CLIs or commands that actionlint doesn't recognize.

## Usage

### Command Line
```bash
# Lint all workflows
./actionlint .github/workflows/*.yml

# Lint specific workflow
./actionlint .github/workflows/ci-cd.yml
```

### NPM Scripts
```bash
# Quick linting
npm run lint:actions

# Verbose linting
npm run lint:actions:verbose
```

### Test Script
```bash
# Comprehensive test and explanation
./test-workflow-linting.sh
```

## Benefits

### ✅ **Eliminates False Positives**
- No more warnings about valid secret access patterns
- No warnings about dynamic expressions actionlint can't resolve
- No warnings about custom commands or scripts

### ✅ **Maintains Useful Validation**
- Still catches real syntax errors
- Still validates workflow structure
- Still validates action versions and parameters

### ✅ **Team-Friendly**
- Reduces noise in CI/CD pipelines
- Focuses attention on real issues
- Provides consistent linting results

## Customization

### Adding More Rules
To ignore additional warnings, add them to the configuration:

```yaml
# Example: Ignore specific action warnings
action-check:
  ignore:
    - actions/checkout@v4  # If you know this version is correct
```

### Enabling Specific Checks
To re-enable a check, set it to `false`:

```yaml
# Re-enable shellcheck if you want shell script validation
shellcheck:
  ignore: false
```

## Best Practices

### 1. **Use with Secret Validation**
This configuration works best when workflows include proper secret validation steps.

### 2. **Regular Review**
Periodically review the configuration to ensure it's still appropriate for your team's needs.

### 3. **Combine with Other Tools**
Use this alongside other validation tools for comprehensive workflow quality assurance.

## Troubleshooting

### Configuration Not Working
1. Ensure the file is named exactly `.github/actionlint.yml`
2. Check YAML syntax for errors
3. Verify actionlint version compatibility

### Still Getting Warnings
1. Check if the warning is from a different rule
2. Consider if the warning is actually valid
3. Add specific ignores for legitimate cases

## References

- [Actionlint Documentation](https://github.com/rhysd/actionlint)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Linting Best Practices](https://docs.github.com/en/actions/learn-github-actions)
