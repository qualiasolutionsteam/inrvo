// Test script for voice cloning functionality
// This script helps verify that voice cloning works correctly

const testScenarios = [
  {
    name: "Auto-generated unique names",
    description: "Test that auto-generated names are unique",
    test: () => {
      // Generate 5 names quickly
      const names = [];
      for (let i = 0; i < 5; i++) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        const dateStr = now.toLocaleDateString();
        const ms = now.getMilliseconds().toString().padStart(3, '0');
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const name = `My Voice ${dateStr} ${timeStr}.${ms}.${randomSuffix}`;
        names.push(name);

        // Small delay to get different timestamps
        now.setMilliseconds(now.getMilliseconds() + 1);
      }

      // Check all names are unique
      const uniqueNames = new Set(names);
      return uniqueNames.size === names.length;
    }
  },
  {
    name: "Duplicate name resolution",
    description: "Test that duplicate names are handled correctly",
    test: () => {
      const baseName = "Test Voice";
      const existingNames = ["test voice", "test voice (copy)"];

      // Simulate the resolution logic
      let finalName = baseName;
      let counter = 1;

      while (existingNames.includes(finalName.toLowerCase())) {
        if (counter === 1) {
          finalName = `${baseName} (copy)`;
        } else if (counter === 2) {
          const uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
          finalName = `${baseName}-${uuid}`;
        } else {
          finalName = `${baseName} (${counter})`;
        }
        counter++;

        if (counter > 100) {
          const uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
          finalName = `${baseName}-${uuid}`;
          break;
        }
      }

      console.log(`Final resolved name: ${finalName}`);
      return finalName !== baseName && !existingNames.includes(finalName.toLowerCase());
    }
  }
];

console.log("🧪 Testing Voice Cloning Name Generation\n");

testScenarios.forEach((scenario, index) => {
  console.log(`Test ${index + 1}: ${scenario.name}`);
  console.log(`Description: ${scenario.description}`);

  try {
    const result = scenario.test();
    console.log(`✅ Result: ${result ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log("---");
});

console.log("\n📋 Test Instructions:");
console.log("1. Open http://localhost:3000/");
console.log("2. Sign in to your account");
console.log("3. Click the waveform (voice) button");
console.log("4. Try these test scenarios:");
console.log("   a) Save with empty name (auto-generation)");
console.log("   b) Save multiple clones quickly");
console.log("   c) Try to save with duplicate names");
console.log("   d) Test with custom names");
console.log("5. Verify no duplicate key errors occur");

console.log("\n🔍 Expected Behaviors:");
console.log("- Auto-generated names should be unique");
console.log("- Duplicate names should get suffixes or UUIDs");
console.log("- Save button should be disabled during processing");
console.log("- No 'duplicate key value violates unique constraint' errors");
console.log("- Voice should appear in the voice selector after saving");