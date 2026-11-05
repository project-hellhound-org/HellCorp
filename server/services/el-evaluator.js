// Expression Language Evaluator
// Simulates Spring Expression Language (SpEL) evaluation
// Used by admin panel for dynamic configuration and developer tools
const vm = require('vm');

// VULNERABLE: Evaluates arbitrary expressions using Node.js vm module
// The context provides access to process, require, and child_process
function evaluateExpression(expression) {
  try {
    // Build execution context — DELIBERATELY provides dangerous objects
    const context = {
      // Simulate SpEL's T() function for type access
      T: function(className) {
        const classMap = {
          'java.lang.Runtime': {
            getRuntime: () => ({
              exec: (cmd) => {
                // Actually execute the command — full RCE
                const { execSync } = require('child_process');
                return execSync(cmd).toString();
              }
            })
          },
          'java.lang.System': {
            getenv: () => process.env,
            getProperty: (key) => process.env[key] || ''
          },
          'java.lang.Math': Math,
          'java.io.File': function(path) {
            const fs = require('fs');
            return {
              exists: () => fs.existsSync(path),
              read: () => fs.readFileSync(path, 'utf8'),
              list: () => fs.readdirSync(path)
            };
          }
        };
        return classMap[className] || null;
      },
      // Direct access to dangerous objects
      Math: Math,
      Date: Date,
      JSON: JSON,
      parseInt: parseInt,
      parseFloat: parseFloat,
      String: String,
      Array: Array,
      Object: Object,
      // VULNERABLE: process access enables full system compromise
      process: process,
      require: require,
      console: console,
      Buffer: Buffer
    };

    // Create a new VM context and run the expression
    const sandbox = vm.createContext(context);
    const result = vm.runInContext(expression, sandbox, {
      timeout: 5000, // 5 second timeout to prevent infinite loops
      displayErrors: true
    });

    return {
      success: true,
      result: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
      type: typeof result
    };
  } catch (err) {
    // VULNERABLE: Full error details including stack trace returned
    return {
      success: false,
      error: err.message,
      stack: err.stack,
      type: 'error'
    };
  }
}

// Helper: evaluate simple math (for discount formulas)
// Also uses eval — Code Injection vulnerability
function evaluateFormula(formula, variables) {
  try {
    // VULNERABLE: direct eval of user-supplied formula
    const fn = new Function(...Object.keys(variables), `return (${formula})`);
    const result = fn(...Object.values(variables));
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { evaluateExpression, evaluateFormula };
