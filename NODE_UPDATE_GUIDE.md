# 📦 Node.js Update Required

## Current Status
- **Current Version:** v20.18.1
- **Required:** v20.19+ or v22.12+
- **Issue:** Vite compatibility warning

## Update Options

### Option 1: Using Snap (Recommended)
```bash
sudo snap install node --classic
```

### Option 2: Using NodeSource Repository
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Option 3: Using NVM (Manual)
```bash
# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Install latest LTS
nvm install --lts
nvm use --lts
nvm alias default node
```

## After Update
```bash
node --version  # Should show v22.x.x
npm run build   # Should work without warnings
```

## Current Workaround
The application builds successfully despite the warning. The Node.js version warning doesn't prevent deployment or functionality.

**Status:** Optional update - application works with current version.