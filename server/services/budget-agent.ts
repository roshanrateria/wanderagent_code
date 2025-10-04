import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  location?: string;
  currency?: string;
}

export interface BudgetAnalysis {
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  categoryBreakdown: Record<string, number>;
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
  insights: string[];
  warnings: string[];
}

export interface BudgetRecommendation {
  tips: string[];
  savingOpportunities: string[];
  categoryAdvice: Record<string, string>;
  estimatedSavings: number;
}

export class BudgetTrackingAgent {
  private groqClient: OpenAI;
  private readonly model = 'llama-3.3-70b-versatile';

  constructor() {
    this.groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || "",
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  /**
   * Analyze spending patterns and provide insights
   */
  async analyzeSpending(
    expenses: Expense[],
    totalBudget: number
  ): Promise<BudgetAnalysis> {
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = totalBudget - totalSpent;
    const percentageUsed = (totalSpent / totalBudget) * 100;

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach((exp) => {
      categoryBreakdown[exp.category] =
        (categoryBreakdown[exp.category] || 0) + exp.amount;
    });

    // Top categories
    const topCategories = Object.entries(categoryBreakdown)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalSpent) * 100,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Generate AI insights
    const insights = await this.generateInsights(
      expenses,
      totalBudget,
      totalSpent,
      categoryBreakdown
    );

    // Generate warnings
    const warnings: string[] = [];
    if (percentageUsed > 90) {
      warnings.push("⚠️ You've used over 90% of your budget!");
    } else if (percentageUsed > 75) {
      warnings.push("⚠️ You've used over 75% of your budget.");
    }

    if (remaining < 0) {
      warnings.push(`⚠️ You're over budget by $${Math.abs(remaining).toFixed(2)}!`);
    }

    // Check for unusual spending patterns
    const avgExpense = totalSpent / expenses.length;
    const highExpenses = expenses.filter((exp) => exp.amount > avgExpense * 2);
    if (highExpenses.length > 0) {
      warnings.push(
        `⚠️ ${highExpenses.length} unusually high expense(s) detected.`
      );
    }

    return {
      totalSpent,
      remaining,
      percentageUsed,
      categoryBreakdown,
      topCategories,
      insights,
      warnings,
    };
  }

  /**
   * Generate AI-powered insights about spending
   */
  private async generateInsights(
    expenses: Expense[],
    totalBudget: number,
    totalSpent: number,
    categoryBreakdown: Record<string, number>
  ): Promise<string[]> {
    try {
      const prompt = `Analyze the following travel spending data and provide 3-4 concise, actionable insights:

Total Budget: $${totalBudget}
Total Spent: $${totalSpent}
Remaining: $${(totalBudget - totalSpent).toFixed(2)}

Category Breakdown:
${Object.entries(categoryBreakdown)
  .map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`)
  .join("\n")}

Recent Expenses (last 5):
${expenses
  .slice(-5)
  .map((exp) => `- ${exp.category}: $${exp.amount} - ${exp.description}`)
  .join("\n")}

Provide insights as a bulleted list (3-4 points). Focus on:
1. Spending patterns
2. Budget health
3. Areas of concern or opportunities
4. Practical recommendations

Keep each insight to one sentence.`;

      const response = await this.groqClient.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || "";
      const insights = content
        .split("\n")
        .filter((line) => line.trim().startsWith("-") || line.trim().startsWith("•"))
        .map((line) => line.replace(/^[-•]\s*/, "").trim())
        .filter((line) => line.length > 0)
        .slice(0, 4);

      return insights.length > 0
        ? insights
        : [
            "Track your expenses regularly to stay on budget",
            "Consider setting category-specific limits",
            "Look for free activities to save money",
          ];
    } catch (error) {
      console.error("Error generating insights:", error);
      return [
        "Track your expenses to identify spending patterns",
        "Set daily spending limits to avoid overspending",
        "Look for budget-friendly alternatives",
      ];
    }
  }

  /**
   * Get AI-powered recommendations for saving money
   */
  async getRecommendations(
    expenses: Expense[],
    totalBudget: number,
    userPreferences?: {
      interests?: string[];
      location?: string;
      remainingDays?: number;
    }
  ): Promise<BudgetRecommendation> {
    try {
      const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const remaining = totalBudget - totalSpent;

      const categoryBreakdown: Record<string, number> = {};
      expenses.forEach((exp) => {
        categoryBreakdown[exp.category] =
          (categoryBreakdown[exp.category] || 0) + exp.amount;
      });

      const prompt = `As a travel budget advisor, provide money-saving recommendations based on this data:

Total Budget: $${totalBudget}
Total Spent: $${totalSpent}
Remaining: $${remaining.toFixed(2)}
${userPreferences?.remainingDays ? `Remaining Days: ${userPreferences.remainingDays}` : ""}
${userPreferences?.location ? `Location: ${userPreferences.location}` : ""}
${userPreferences?.interests ? `Interests: ${userPreferences.interests.join(", ")}` : ""}

Spending by Category:
${Object.entries(categoryBreakdown)
  .map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`)
  .join("\n")}

Provide:
1. 5 practical money-saving tips (start each with "TIP:")
2. 3 specific saving opportunities based on spending patterns (start each with "SAVE:")
3. Advice for top 3 spending categories (start each with "CATEGORY: CategoryName -")
4. Estimated potential savings if tips are followed (start with "SAVINGS:")

Be specific and actionable.`;

      const response = await this.groqClient.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content || "";

      // Parse the response
      const tips = content
        .split("\n")
        .filter((line) => line.toUpperCase().includes("TIP:"))
        .map((line) => line.replace(/TIP:\s*/i, "").trim())
        .filter((line) => line.length > 0)
        .slice(0, 5);

      const savingOpportunities = content
        .split("\n")
        .filter((line) => line.toUpperCase().includes("SAVE:"))
        .map((line) => line.replace(/SAVE:\s*/i, "").trim())
        .filter((line) => line.length > 0)
        .slice(0, 3);

      const categoryAdvice: Record<string, string> = {};
      content
        .split("\n")
        .filter((line) => line.toUpperCase().includes("CATEGORY:"))
        .forEach((line) => {
          const match = line.match(/CATEGORY:\s*([^-]+)\s*-\s*(.+)/i);
          if (match) {
            const category = match[1].trim();
            const advice = match[2].trim();
            categoryAdvice[category] = advice;
          }
        });

      const savingsMatch = content.match(/SAVINGS:\s*\$?(\d+)/i);
      const estimatedSavings = savingsMatch ? parseInt(savingsMatch[1]) : 0;

      return {
        tips: tips.length > 0
          ? tips
          : [
              "Use public transportation instead of taxis",
              "Eat at local restaurants instead of tourist spots",
              "Look for free attractions and activities",
              "Buy groceries for some meals instead of eating out",
              "Book activities in advance for better prices",
            ],
        savingOpportunities: savingOpportunities.length > 0
          ? savingOpportunities
          : [
              "Reduce dining out frequency",
              "Use budget transportation options",
              "Look for free entertainment",
            ],
        categoryAdvice,
        estimatedSavings,
      };
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return {
        tips: [
          "Use public transportation to save on transport costs",
          "Cook some meals instead of eating out every time",
          "Look for free walking tours and attractions",
          "Stay hydrated with tap water instead of buying bottled water",
          "Visit markets for affordable snacks and souvenirs",
        ],
        savingOpportunities: [
          "Reduce restaurant spending by 20-30%",
          "Use budget-friendly transportation",
          "Take advantage of free activities",
        ],
        categoryAdvice: {},
        estimatedSavings: 0,
      };
    }
  }

  /**
   * Predict if user will exceed budget based on current spending patterns
   */
  async predictBudgetHealth(
    expenses: Expense[],
    totalBudget: number,
    remainingDays: number
  ): Promise<{
    willExceedBudget: boolean;
    projectedTotal: number;
    projectedOverage: number;
    confidence: number;
    recommendation: string;
  }> {
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate daily average
    const uniqueDays = new Set(expenses.map((exp) => exp.date.split("T")[0])).size;
    const dailyAverage = uniqueDays > 0 ? totalSpent / uniqueDays : totalSpent;

    // Project future spending
    const projectedTotal = totalSpent + dailyAverage * remainingDays;
    const projectedOverage = Math.max(0, projectedTotal - totalBudget);
    const willExceedBudget = projectedTotal > totalBudget;

    // Calculate confidence based on spending consistency
    const dailySpending: Record<string, number> = {};
    expenses.forEach((exp) => {
      const day = exp.date.split("T")[0];
      dailySpending[day] = (dailySpending[day] || 0) + exp.amount;
    });

    const spendingValues = Object.values(dailySpending);
    const avgDaily =
      spendingValues.reduce((sum, val) => sum + val, 0) / spendingValues.length;
    const variance =
      spendingValues.reduce((sum, val) => sum + Math.pow(val - avgDaily, 2), 0) /
      spendingValues.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(100, 100 - (stdDev / avgDaily) * 100));

    // Generate recommendation
    let recommendation: string;
    if (willExceedBudget) {
      const dailyReduction = projectedOverage / remainingDays;
      recommendation = `⚠️ At current spending pace, you may exceed your budget by $${projectedOverage.toFixed(
        2
      )}. Consider reducing daily spending by $${dailyReduction.toFixed(2)}.`;
    } else {
      const surplus = totalBudget - projectedTotal;
      recommendation = `✅ You're on track! Projected surplus: $${surplus.toFixed(
        2
      )}. You can spend up to $${(dailyAverage + surplus / remainingDays).toFixed(
        2
      )} per day.`;
    }

    return {
      willExceedBudget,
      projectedTotal,
      projectedOverage,
      confidence: Math.round(confidence),
      recommendation,
    };
  }

  /**
   * Categorize an expense automatically using AI
   */
  async categorizeExpense(
    description: string,
    amount: number
  ): Promise<string> {
    try {
      const prompt = `Categorize this travel expense into ONE of these categories: Food, Transport, Accommodation, Activities, Shopping, Other.

Expense: ${description} - $${amount}

Response format: Just the category name, nothing else.`;

      const response = await this.groqClient.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 10,
      });

      const category = response.choices[0]?.message?.content?.trim() || "Other";
      const validCategories = [
        "Food",
        "Transport",
        "Accommodation",
        "Activities",
        "Shopping",
        "Other",
      ];

      return validCategories.includes(category) ? category : "Other";
    } catch (error) {
      console.error("Error categorizing expense:", error);
      return "Other";
    }
  }
}

export const budgetAgent = new BudgetTrackingAgent();
