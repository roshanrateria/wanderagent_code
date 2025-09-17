#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building WanderAgent Mobile App...\n');

// Step 1: Install Capacitor dependencies if not present
console.log('📦 Checking Capacitor dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    '@capacitor/core',
    '@capacitor/cli',
    '@capacitor/android',
    '@capacitor/geolocation',
    '@capacitor/storage',
    '@capacitor/network',
    '@capacitor/device'
  ];

  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
  );

  if (missingDeps.length > 0) {
    console.log('Installing missing Capacitor dependencies:', missingDeps.join(', '));
    execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
  }
} catch (error) {
  console.error('Error checking dependencies:', error.message);
  process.exit(1);
}

// Step 2: Build React app
console.log('\n🔨 Building React application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ React build completed successfully');
} catch (error) {
  console.error('❌ React build failed:', error.message);
  process.exit(1);
}

// Step 3: Initialize Capacitor if not already done
console.log('\n⚡ Initializing Capacitor...');
try {
  if (!fs.existsSync('capacitor.config.ts') && !fs.existsSync('capacitor.config.js')) {
    console.log('Capacitor not initialized. Running cap init...');
    execSync('npx cap init WanderAgent com.wanderagent.app --web-dir=build', { stdio: 'inherit' });
  } else {
    console.log('✅ Capacitor already initialized');
  }
} catch (error) {
  console.log('⚠️  Capacitor init warning (may be already initialized):', error.message);
}

// Step 4: Add Android platform if not present
console.log('\n📱 Setting up Android platform...');
try {
  if (!fs.existsSync('android')) {
    console.log('Adding Android platform...');
    execSync('npx cap add android', { stdio: 'inherit' });
    console.log('✅ Android platform added');
  } else {
    console.log('✅ Android platform already exists');
  }
} catch (error) {
  console.error('❌ Failed to add Android platform:', error.message);
  process.exit(1);
}

// Step 5: Copy web assets to native project
console.log('\n📋 Syncing web assets to native project...');
try {
  execSync('npx cap copy android', { stdio: 'inherit' });
  execSync('npx cap sync android', { stdio: 'inherit' });
  console.log('✅ Assets synced successfully');
} catch (error) {
  console.error('❌ Failed to sync assets:', error.message);
  process.exit(1);
}

// Step 6: Create build scripts in package.json
console.log('\n📝 Updating package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  // Add mobile-specific scripts
  packageJson.scripts['build:mobile'] = 'npm run build && npx cap sync android';
  packageJson.scripts['open:android'] = 'npx cap open android';
  packageJson.scripts['run:android'] = 'npx cap run android';
  packageJson.scripts['mobile:dev'] = 'npm run build && npx cap sync android && npx cap open android';

  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ Package.json updated with mobile scripts');
} catch (error) {
  console.error('❌ Failed to update package.json:', error.message);
}

// Step 7: Verify Android requirements
console.log('\n🔍 Checking Android development requirements...');
try {
  // Check if Android Studio is in PATH
  try {
    execSync('which android-studio 2>/dev/null || which studio 2>/dev/null', { stdio: 'pipe' });
    console.log('✅ Android Studio found in PATH');
  } catch {
    console.log('⚠️  Android Studio not found in PATH');
  }

  // Check for Java
  try {
    const javaVersion = execSync('java -version 2>&1', { encoding: 'utf8' });
    console.log('✅ Java installed:', javaVersion.split('\n')[0]);
  } catch {
    console.log('⚠️  Java not found - required for Android development');
  }

  // Check for ANDROID_HOME
  if (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT) {
    console.log('✅ Android SDK path configured');
  } else {
    console.log('⚠️  ANDROID_HOME or ANDROID_SDK_ROOT not set');
  }

} catch (error) {
  console.log('⚠️  Could not verify all Android requirements');
}

// Final instructions
console.log('\n🎉 Mobile build setup completed!\n');
console.log('📋 Next steps:');
console.log('1. Ensure Android Studio is installed');
console.log('2. Set up Android SDK and emulator');
console.log('3. Run: npm run open:android');
console.log('4. In Android Studio: Build > Generate Signed Bundle/APK\n');

console.log('📱 Available mobile commands:');
console.log('• npm run build:mobile  - Build and sync to Android');
console.log('• npm run open:android  - Open project in Android Studio');
console.log('• npm run run:android   - Build and run on connected device');
console.log('• npm run mobile:dev    - Full mobile development workflow\n');

console.log('🌐 Web development (unchanged):');
console.log('• npm run start         - Start development server (port 5000)');
console.log('• npm run build         - Build for web production\n');

console.log('✨ Your app is now ready for both web and mobile deployment!');
