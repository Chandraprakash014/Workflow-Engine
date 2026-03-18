/**
 * Rule Engine for evaluating dynamic workflow conditions
 */

/**
 * Evaluates a rule condition against workflow data.
 *
 * Supported:
 * - Operators: ==, !=, <, >, <=, >=
 * - Logical: &&, ||
 * - Functions: contains(), startsWith(), endsWith()
 *
 * @param {string} condition
 * @param {Object} data
 * @returns {boolean}
 */
function evaluateCondition(condition, data) {
    if (!condition || condition.trim() === "DEFAULT") {
        return false;
    }

    try {

        // Helper functions
        const contains = (field, value) => {
            const f = String(field || "");
            return f.includes(String(value));
        };

        const startsWith = (field, prefix) => {
            const f = String(field || "");
            return f.startsWith(String(prefix));
        };

        const endsWith = (field, suffix) => {
            const f = String(field || "");
            return f.endsWith(String(suffix));
        };

        /**
         * NOTE:
         * Using the Function constructor for dynamic rule evaluation.
         * In production environments, a safer parser like Jexl or ExprEval
         * should be used to avoid code injection.
         */

        const evaluator = new Function(
            "data",
            "contains",
            "startsWith",
            "endsWith",
            `
            with(data){
                return !!(${condition});
            }
        `
        );

        return evaluator(data, contains, startsWith, endsWith);

    } catch (error) {
        console.error("[RuleEngine] Error evaluating rule:", condition);
        console.error(error.message);
        return false;
    }
}

/**
 * Determines the next step in the workflow
 *
 * @param {Array} rules
 * @param {Object} data
 * @returns {Object} { nextStepId: string|null, evaluatedRules: Array }
 */
function determineNextStep(rules, data) {

    const evaluatedRules = [];

    if (!rules || rules.length === 0) {
        console.log("[RuleEngine] No rules found");
        return { nextStepId: null, evaluatedRules };
    }

    // sort rules by priority
    const sortedRules = [...rules].sort((a, b) => (a.priority || 0) - (b.priority || 0));

    let defaultRule = null;

    for (const rule of sortedRules) {

        // store DEFAULT rule but evaluate later
        if (!rule.condition || rule.condition.trim() === "DEFAULT") {
            defaultRule = rule;
            continue;
        }

        console.log(`[RuleEngine] Evaluating rule ${rule._id}`);

        const result = evaluateCondition(rule.condition, data);
        
        evaluatedRules.push({
            rule: rule.condition,
            result: result
        });

        if (result) {
            console.log(`[RuleEngine] Rule matched → Next Step: ${rule.next_step_id}`);
            return { nextStepId: rule.next_step_id, evaluatedRules };
        }
    }

    // fallback DEFAULT rule
    if (defaultRule) {
        console.log("[RuleEngine] No rule matched, using DEFAULT rule");
        return { nextStepId: defaultRule.next_step_id, evaluatedRules };
    }

    console.log("[RuleEngine] No rule matched and no DEFAULT rule defined");
    return { nextStepId: null, evaluatedRules };
}

module.exports = {
    evaluateCondition,
    determineNextStep
};